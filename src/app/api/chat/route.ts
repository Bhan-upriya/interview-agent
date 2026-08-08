import { NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import type {
  ChatRequestBody,
  ChatResponseBody,
  ChatErrorBody,
  EvaluationResult,
  CategoryScores,
} from "@/types/interview";

// This route calls an external API and must not be statically analyzed/cached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_NAME = "gemini-2.0-flash";

const MIN_MEANINGFUL_ANSWER_LENGTH = 12;

const LOW_EFFORT_PATTERNS = [
  /^i\s*don'?t\s*know$/i,
  /^idk$/i,
  /^no\s*idea$/i,
  /^not\s*sure$/i,
  /^skip$/i,
  /^pass$/i,
  /^n\/?a$/i,
  /^\.+$/,
  /^\?+$/,
];

/**
 * Clamp a number into the 0-100 range and round it to the nearest integer.
 */
function clampScore(value: number): number {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/**
 * Detects low-effort / empty / "I don't know" style answers so we never
 * waste an API call (or block the UI) on something we can score locally.
 */
function isLowEffortAnswer(answer: string): boolean {
  const trimmed = answer.trim();
  if (trimmed.length < MIN_MEANINGFUL_ANSWER_LENGTH) return true;
  return LOW_EFFORT_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Deterministic, dependency-free fallback evaluator. Used when:
 *   1. The candidate's answer is too short / low-effort to bother the model with, OR
 *   2. The Gemini API call fails, times out, or returns malformed JSON.
 * This guarantees the route ALWAYS returns a valid, well-shaped EvaluationResult.
 */
function buildFallbackEvaluation(
  domain: string,
  question: string,
  answer: string,
  currentOverallScore: number
): EvaluationResult {
  const trimmed = answer.trim();
  const lowEffort = isLowEffortAnswer(trimmed);

  // Very rough heuristic so the fallback isn't a flat number every time:
  // longer, more substantive answers score somewhat higher.
  const lengthScore = Math.min(55, Math.floor(trimmed.length / 4));
  const baseAccuracy = lowEffort ? 8 : clampScore(20 + lengthScore);

  const categoryScores: CategoryScores = {
    correctness: lowEffort ? 5 : clampScore(baseAccuracy - 5),
    clarity: lowEffort ? 10 : clampScore(baseAccuracy + 5),
    depth: lowEffort ? 5 : clampScore(baseAccuracy - 10),
    communication: lowEffort ? 15 : clampScore(baseAccuracy),
  };

  const accuracy = clampScore(baseAccuracy);
  const delta = accuracy - currentOverallScore;

  const feedback = lowEffort
    ? "That answer didn't give me enough to evaluate. Try to explain your reasoning, even a partial attempt, rather than skipping the question."
    : "I've recorded a provisional evaluation for this answer based on length and structure alone (the AI evaluator was unavailable), so treat this score as approximate.";

  const fallbackQuestions: Record<string, string> = {
    "Frontend Development":
      "Can you explain the difference between controlled and uncontrolled components in React?",
    "Backend Development":
      "How would you design a rate limiter for a public REST API?",
    "Data Structures & Algorithms":
      "Can you explain the time complexity trade-offs between an array and a linked list?",
    "System Design":
      "How would you design a URL shortening service like bit.ly?",
    "DevOps & Cloud":
      "Walk me through how you'd set up a CI/CD pipeline for a containerized app.",
    "Machine Learning":
      "Can you explain the bias-variance trade-off in your own words?",
  };

  const nextQuestion =
    fallbackQuestions[domain] ??
    "Let's move on: can you walk me through your general approach to solving a problem like this?";

  return {
    accuracy,
    delta,
    feedback,
    strengths: lowEffort ? [] : ["Attempted a response to: \"" + question.slice(0, 60) + "\""],
    improvements: lowEffort
      ? ["Provide a substantive, specific answer instead of skipping the question."]
      : ["Add more technical detail and concrete examples to strengthen this answer."],
    nextQuestion,
    isFallback: true,
    categoryScores,
  };
}

/**
 * Attempts to pull a JSON object out of raw model text, tolerating
 * markdown code fences or stray leading/trailing text.
 */
function extractJson(rawText: string): unknown {
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1] : rawText;

  try {
    return JSON.parse(candidate.trim());
  } catch {
    // Last resort: grab the first { ... } block.
    const braceMatch = candidate.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      return JSON.parse(braceMatch[0]);
    }
    throw new Error("Unable to locate valid JSON in model response.");
  }
}

/**
 * Validates and coerces an unknown parsed object into a well-shaped
 * EvaluationResult, throwing if required fields are missing/invalid so
 * the caller can fall back to the deterministic evaluator.
 */
function coerceEvaluation(
  raw: unknown,
  currentOverallScore: number
): EvaluationResult {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Model response was not a JSON object.");
  }

  const obj = raw as Record<string, unknown>;
  const catRaw = (obj.categoryScores ?? {}) as Record<string, unknown>;

  const categoryScores: CategoryScores = {
    correctness: clampScore(Number(catRaw.correctness ?? 0)),
    clarity: clampScore(Number(catRaw.clarity ?? 0)),
    depth: clampScore(Number(catRaw.depth ?? 0)),
    communication: clampScore(Number(catRaw.communication ?? 0)),
  };

  const accuracy = clampScore(Number(obj.accuracy ?? 0));

  const strengths = Array.isArray(obj.strengths)
    ? obj.strengths.filter((s): s is string => typeof s === "string")
    : [];
  const improvements = Array.isArray(obj.improvements)
    ? obj.improvements.filter((s): s is string => typeof s === "string")
    : [];

  const feedback =
    typeof obj.feedback === "string" && obj.feedback.trim().length > 0
      ? obj.feedback
      : "No detailed feedback was returned for this answer.";

  const nextQuestion =
    typeof obj.nextQuestion === "string" && obj.nextQuestion.trim().length > 0
      ? obj.nextQuestion
      : "Can you elaborate further on your previous answer?";

  return {
    accuracy,
    delta: accuracy - currentOverallScore,
    feedback,
    strengths,
    improvements,
    nextQuestion,
    isFallback: false,
    categoryScores,
  };
}

function buildPrompt(
  domain: string,
  question: string,
  answer: string,
  historySummary: string
): string {
  return `You are a strict but fair senior technical interviewer conducting a live interview in the domain of "${domain}".

Conversation so far (most recent last):
${historySummary || "(this is the first question)"}

The question you just asked the candidate:
"${question}"

The candidate's answer:
"${answer}"

Evaluate the candidate's answer and respond with ONLY a single JSON object (no markdown, no commentary) matching this exact shape:
{
  "accuracy": <integer 0-100, how technically correct and complete the answer is>,
  "feedback": "<1-3 sentence direct feedback on this specific answer>",
  "strengths": ["<short strength phrase>", ...up to 3],
  "improvements": ["<short improvement phrase>", ...up to 3],
  "nextQuestion": "<the next interview question for the ${domain} domain, appropriately harder or easier based on performance so far>",
  "categoryScores": {
    "correctness": <integer 0-100>,
    "clarity": <integer 0-100>,
    "depth": <integer 0-100>,
    "communication": <integer 0-100>
  }
}

If the candidate's answer is empty, nonsensical, or says something like "I don't know", score accuracy and all categoryScores low (0-15) but still return a valid nextQuestion so the interview can continue.`;
}

async function callGemini(
  apiKey: string,
  domain: string,
  question: string,
  answer: string,
  historySummary: string
): Promise<unknown> {
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: buildPrompt(domain, question, answer, historySummary),
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          accuracy: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
          improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
          nextQuestion: { type: Type.STRING },
          categoryScores: {
            type: Type.OBJECT,
            properties: {
              correctness: { type: Type.NUMBER },
              clarity: { type: Type.NUMBER },
              depth: { type: Type.NUMBER },
              communication: { type: Type.NUMBER },
            },
            required: ["correctness", "clarity", "depth", "communication"],
          },
        },
        required: ["accuracy", "feedback", "nextQuestion", "categoryScores"],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error("Empty response text from Gemini.");
  }

  return extractJson(text);
}

function summarizeHistory(history: ChatRequestBody["history"]): string {
  if (!Array.isArray(history) || history.length === 0) return "";
  // Keep the prompt small: only include the last few turns.
  const recent = history.slice(-6);
  return recent
    .map((m) => `${m.role === "interviewer" ? "Interviewer" : "Candidate"}: ${m.content}`)
    .join("\n");
}

export async function POST(req: Request): Promise<NextResponse<ChatResponseBody | ChatErrorBody>> {
  let body: Partial<ChatRequestBody>;

  try {
    body = (await req.json()) as Partial<ChatRequestBody>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const domain = typeof body.domain === "string" ? body.domain : "";
  const question = typeof body.question === "string" ? body.question : "";
  const answer = typeof body.answer === "string" ? body.answer : "";
  const currentOverallScore =
    typeof body.currentOverallScore === "number" ? body.currentOverallScore : 0;
  const history = Array.isArray(body.history) ? body.history : [];

  if (!domain || !question) {
    return NextResponse.json(
      { error: "Missing required fields: 'domain' and 'question' are required." },
      { status: 400 }
    );
  }

  // Fast path: don't waste an API call on empty / low-effort answers.
  if (isLowEffortAnswer(answer)) {
    const evaluation = buildFallbackEvaluation(domain, question, answer, currentOverallScore);
    return NextResponse.json({ evaluation }, { status: 200 });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    // No key configured (e.g. preview deploy without env vars set) — degrade
    // gracefully instead of throwing a 500 that breaks the whole build/runtime.
    const evaluation = buildFallbackEvaluation(domain, question, answer, currentOverallScore);
    return NextResponse.json({ evaluation }, { status: 200 });
  }

  try {
    const historySummary = summarizeHistory(history);
    const raw = await callGemini(apiKey, domain, question, answer, historySummary);
    const evaluation = coerceEvaluation(raw, currentOverallScore);
    return NextResponse.json({ evaluation }, { status: 200 });
  } catch (err) {
    console.error("Gemini evaluation failed, using fallback evaluator:", err);
    const evaluation = buildFallbackEvaluation(domain, question, answer, currentOverallScore);
    return NextResponse.json({ evaluation }, { status: 200 });
  }
}
