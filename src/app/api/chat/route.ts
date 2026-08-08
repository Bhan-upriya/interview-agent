import { NextResponse } from "next/server";
import type { ChatRequestBody, ChatResponseBody, EvaluationResult } from "@/types/interview";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatRequestBody;
    const { domain, question, answer } = body;

    if (!domain || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields: domain, question, or answer." },
        { status: 400 }
      );
    }

    // Handle short answers / skips
    const isShortOrIdk = answer.trim().length < 5 || /i don't know|idk|pass|skip|no idea/i.test(answer);

    if (isShortOrIdk) {
      const fallbackEvaluation: EvaluationResult = {
        categoryScores: { correctness: 10, clarity: 20, depth: 10, communication: 20 },
        strengths: [],
        improvements: ["Candidate elected to skip or lacked familiarity with the topic."],
        feedback: "Skipping questions or providing very brief answers makes it difficult to assess competence.",
        nextQuestion: `Let's pivot slightly within ${domain}. Can you describe a technical challenge you recently faced and how you solved it?`,
        isFallback: true,
      };
      return NextResponse.json({ evaluation: fallbackEvaluation } satisfies ChatResponseBody);
    }

    // Support both AgentRouter and native Gemini keys
    const apiKey = process.env.AGENTROUTER_API_KEY || process.env.GEMINI_API_KEY;
    const baseUrl = process.env.AGENTROUTER_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

    if (!apiKey) {
      throw new Error("API key environment variable is missing.");
    }

    const prompt = `
You are an expert technical interviewer conducting a professional interview for the domain: "${domain}".
The candidate was just asked this question:
"${question}"

The candidate responded with:
"${answer}"

Evaluate this answer objectively. Provide scores from 0 to 100 for four criteria:
1. correctness (technical accuracy)
2. clarity (how well structured and understandable the explanation is)
3. depth (understanding of underlying mechanics or edge cases)
4. communication (professional articulation)

Also provide:
- A short list of strengths shown in the answer (0 to 2 items).
- A short list of areas for improvement (0 to 2 items).
- Constructive feedback on the candidate's answer.
- The next logical technical interview question to ask, following up on their response or moving to the next core concept in ${domain}.

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

    // Dynamically route between AgentRouter and standard Gemini endpoint based on baseUrl config
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
          temperature: 0.3,
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
      categoryScores: { correctness: 50, clarity: 50, depth: 50, communication: 50 },
      strengths: ["Completed response cycle."],
      improvements: ["Could not fully analyze due to transient system load."],
      feedback: "We recorded your response successfully.",
      nextQuestion: "Let's proceed: Can you explain how you handle performance bottlenecks or debugging in production systems?",
      isFallback: true,
    };

    return NextResponse.json({ evaluation: emergencyEvaluation } satisfies ChatResponseBody);
  }
}