import { NextResponse } from "next/server";
import type { ChatRequestBody, ChatResponseBody, EvaluationResult } from "@/types/interview";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { domain, question, answer, history } = body;

    if (!domain || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields: domain, question, or answer." },
        { status: 400 }
      );
    }

    // Support both AgentRouter and native Gemini keys
    const apiKey = process.env.AGENTROUTER_API_KEY || process.env.GEMINI_API_KEY;
    const baseUrl = process.env.AGENTROUTER_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

    if (!apiKey) {
      throw new Error("API key environment variable is missing.");
    }

    // Extract previous questions from history to prevent repetition
    const previousQuestions = history
      ?.filter((m) => m.role === "interviewer")
      .map((m) => m.content)
      .join("\n- ") || "";

    const prompt = `
You are an expert technical interviewer conducting a professional interview for the domain: "${domain}".

PREVIOUSLY ASKED QUESTIONS (DO NOT repeat these or ask similar ones):
- ${previousQuestions}

The candidate was just asked this question:
"${question}"

The candidate responded with:
"${answer}"

Evaluate this answer objectively. If the answer is incorrect, vague, says "I don't know", skips the question, or is nonsense, give very low scores (between 0 and 25) for correctness, clarity, depth, and communication. Accuracy should only increase for genuinely correct, detailed answers and must decrease for wrong or skipped answers.

Provide scores from 0 to 100 for four criteria:
1. correctness (technical accuracy)
2. clarity (how well structured and understandable the explanation is)
3. depth (understanding of underlying mechanics or edge cases)
4. communication (professional articulation)

Also provide:
- A short list of strengths shown in the answer (empty array [] if the answer was wrong or skipped).
- A short list of areas for improvement (1 to 2 items explaining what was missing or incorrect).
- Constructive feedback on the candidate's answer.
- A completely NEW and DIFFERENT technical interview question to ask next within ${domain}, ensuring it is NOT in the list of previously asked questions.

You MUST return your response strictly as a JSON object matching this exact structure without any markdown backticks or extra text:
{
  "categoryScores": {
    "correctness": number,
    "clarity": number,
    "depth": number,
    "communication": number
  },
  "strengths": string[],
  "improvements": string[],
  "feedback": string,
  "nextQuestion": string,
  "isFallback": false
}
`;

    const isAgentRouter = baseUrl.includes("agentrouter.org");
    const endpoint = isAgentRouter
      ? `${baseUrl}/models/gemini-2.5-flash:generateContent`
      : `${baseUrl}/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (isAgentRouter) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const geminiRes = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7, // Slightly higher temperature to encourage diverse new questions
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`API error: ${errText}`);
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("No text returned from model.");
    }

    const evaluation = JSON.parse(rawText) as EvaluationResult;
    return NextResponse.json({ evaluation } satisfies ChatResponseBody);
  } catch (error) {
    console.error("API Route Error:", error);

    const emergencyEvaluation: EvaluationResult = {
      categoryScores: { correctness: 20, clarity: 20, depth: 20, communication: 20 },
      strengths: [],
      improvements: ["Could not fully analyze due to network or service lag."],
      feedback: "We recorded your response, but experienced a brief evaluation glitch.",
      nextQuestion: `Let's try a different concept in ${domain}. Can you explain how you handle state management and data flow?`,
      isFallback: true,
    };

    return NextResponse.json({ evaluation: emergencyEvaluation } satisfies ChatResponseBody);
  }
}