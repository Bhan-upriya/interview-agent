import { NextResponse } from "next/server";
import type { Domain, ChatRequestBody, ChatResponseBody, EvaluationResult } from "@/types/interview";

const QUESTION_BANKS: Record<Domain, string[]> = {
  "Frontend Development": [
    "What happens in the browser between typing a URL and seeing the page render?",
    "How does React's reconciliation algorithm (Fiber) work under the hood?",
    "Can you explain how you would optimize a web application suffering from layout thrashing and slow Core Web Vitals?",
    "What are the trade-offs between Server-Side Rendering (SSR), Client-Side Rendering (CSR), and Incremental Static Regeneration (ISR)?",
    "How do you manage complex global state in a large-scale frontend application without running into performance bottlenecks?"
  ],
  "Backend Development": [
    "How would you design a scalable REST API for a high-traffic to-do list application?",
    "Can you explain how database indexing works (e.g., B-Trees) and when you should avoid adding an index?",
    "How do you handle database migrations safely in a zero-downtime production environment?",
    "What is the difference between optimistic and pessimistic locking, and when would you use each?",
    "How do you handle performance bottlenecks or debugging in high-load microservices architectures?"
  ],
  "Data Structures & Algorithms": [
    "What is the difference between a stack and a queue, and what are their underlying memory implications?",
    "How would you find the shortest path in a weighted graph with non-negative edge weights? Explain the time complexity.",
    "Can you explain how hash maps handle collisions internally (e.g., chaining vs open addressing) and how worst-case time complexity is managed?",
    "What is dynamic programming, and how do you decide whether to use a top-down memoization or bottom-up tabulation approach?",
    "How would you detect a cycle in a directed graph efficiently using DFS or Kahn's algorithm?"
  ],
  "System Design": [
    "How would you approach designing a global, scalable real-time notification system?",
    "What strategies would you use to handle a sudden 100x surge in traffic for an e-commerce checkout service?",
    "Explain how consistent hashing works and why it is crucial for distributed caching systems like Redis or Memcached.",
    "What are the trade-offs between SQL (relational) and NoSQL databases when designing a system with massive write throughput?",
    "How do you implement rate limiting in a distributed API gateway?"
  ],
  "DevOps & Cloud": [
    "What is the fundamental architectural difference between a Linux container and a traditional virtual machine?",
    "How do you design a secure, zero-downtime CI/CD pipeline using GitHub Actions or Kubernetes?",
    "Can you explain how infrastructure as code (IaC) tools like Terraform manage state files and handle race conditions in team environments?",
    "How do you troubleshoot a cascading failure in a cloud-native microservices environment?",
    "What strategies do you use for secure secret management across ephemeral cloud environments?"
  ],
  "Machine Learning": [
    "What is the core difference between supervised, unsupervised, and reinforcement learning paradigms?",
    "How do you diagnose and mitigate overfitting in a deep neural network?",
    "Explain the vanishing gradient problem and how architectures like ResNets or activation functions like ReLU resolve it.",
    "What evaluation metrics would you choose for an imbalanced classification dataset (e.g., fraud detection), and why?",
    "How do you handle missing or noisy data during the preprocessing pipeline before training a model?"
  ]
};

export async function POST(req: Request) {
  let domainParam: Domain = "Backend Development";
  let previousQuestions: string[] = [];
  let candidateAnswer = "";

  try {
    const body = (await req.json()) as ChatRequestBody;
    const { domain, question, answer, history } = body;
    
    if (domain) domainParam = domain;
    if (answer) candidateAnswer = answer;

    if (!domain || !question || !answer) {
      return NextResponse.json(
        { error: "Missing required fields: domain, question, or answer." },
        { status: 400 }
      );
    }

    previousQuestions = history
      ?.filter((m) => m.role === "interviewer")
      .map((m) => m.content) || [];

    const apiKey = process.env.AGENTROUTER_API_KEY || process.env.GEMINI_API_KEY;
    const baseUrl = process.env.AGENTROUTER_BASE_URL || "https://generativelanguage.googleapis.com/v1beta";

    if (!apiKey) {
      throw new Error("API key environment variable is missing.");
    }

    const domainBank = QUESTION_BANKS[domain] || QUESTION_BANKS["Backend Development"];

    const prompt = `
You are an expert technical interviewer conducting a strict and professional interview for the domain: "${domain}".

MASTER QUESTION POOL FOR THIS DOMAIN:
${JSON.stringify(domainBank, null, 2)}

PREVIOUSLY ASKED QUESTIONS (DO NOT repeat any of these):
${JSON.stringify(previousQuestions, null, 2)}

The candidate was just asked:
"${question}"

The candidate responded with:
"${answer}"

Instructions:
1. Deeply analyze the candidate's exact response text for technical accuracy, depth, clarity, and communication.
   - If the answer is incorrect, negative (e.g., "no", "I don't know"), irrelevant, or extremely brief, award very low scores (0 to 20).
   - If the answer is partially correct, award moderate scores (40 to 60).
   - If the answer is comprehensive, technically accurate, and well-reasoned, award high scores (75 to 100).
2. Extract tailored, specific **strengths** and **improvements** based explicitly on what the candidate wrote in their answer. Avoid generic filler text.
3. Select the next unasked question from the MASTER QUESTION POOL above. If all have been exhausted, invent a relevant follow-up question within "${domain}".

Return your response strictly as a valid JSON object matching this exact structure without any markdown backticks or extra text:
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
      ? `${baseUrl}/models/gemini-1.5-flash:generateContent`
      : `${baseUrl}/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

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
          temperature: 0.2,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      throw new Error(`API error (${geminiRes.status}): ${errText}`);
    }

    const data = await geminiRes.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawText) {
      throw new Error("No text returned from model.");
    }

    const evaluation = JSON.parse(rawText) as EvaluationResult;
    return NextResponse.json({ evaluation } satisfies ChatResponseBody);
  } catch (error) {
    console.error("API Route Error Details:", error);

    const domainBank = QUESTION_BANKS[domainParam] || QUESTION_BANKS["Backend Development"];
    const unaskedQuestions = domainBank.filter((q) => !previousQuestions.includes(q));
    const nextFallbackQuestion = unaskedQuestions.length > 0 
      ? unaskedQuestions[0] 
      : `Can you discuss another concept in ${domainParam}?`;

    const isNegativeOrShort = 
      candidateAnswer.trim().toLowerCase() === "no" || 
      candidateAnswer.trim().toLowerCase() === "i don't know" || 
      candidateAnswer.trim().length < 8;

    const scoreValue = isNegativeOrShort ? 10 : 75;

    const emergencyEvaluation: EvaluationResult = {
      categoryScores: { 
        correctness: scoreValue, 
        clarity: scoreValue, 
        depth: scoreValue, 
        communication: scoreValue 
      },
      strengths: isNegativeOrShort ? [] : [`Addressed the prompt regarding ${domainParam} with valid points.`],
      improvements: isNegativeOrShort 
        ? ["Avoid answering with single-word refusals; provide full technical details."] 
        : ["Elaborate further on architectural trade-offs."],
      feedback: isNegativeOrShort 
        ? "That response was insufficient. Please explain your reasoning thoroughly." 
        : "Response noted. Let's proceed to the next question.",
      nextQuestion: nextFallbackQuestion,
      isFallback: true,
    };

    return NextResponse.json({ evaluation: emergencyEvaluation } satisfies ChatResponseBody);
  }
}