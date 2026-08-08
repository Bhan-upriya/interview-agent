export const DOMAINS = [
  "Frontend Development",
  "Backend Development",
  "Data Structures & Algorithms",
  "System Design",
  "DevOps & Cloud",
  "Machine Learning",
] as const;

export type Domain = (typeof DOMAINS)[number];

export type MessageRole = "interviewer" | "candidate" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export type ScoreCategoryId = "correctness" | "clarity" | "depth" | "communication";

export interface ScoreCategory {
  id: ScoreCategoryId;
  label: string;
  score: number;
  delta: number;
}

export interface Scorecard {
  overall: number;
  categories: ScoreCategory[];
  questionsAsked: number;
  history: number[];
}

export interface EvaluationResult {
  categoryScores: Record<ScoreCategoryId, number>;
  strengths: string[];
  improvements: string[];
  feedback: string;
  nextQuestion: string;
  isFallback: boolean;
}

export type Recommendation = "Strong Hire" | "Hire" | "Lean Hire" | "No Hire";

export interface HiringReport {
  domain: Domain;
  overallScore: number;
  recommendation: Recommendation;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  categoryBreakdown: ScoreCategory[];
  transcriptLength: number;
  questionsAsked: number;
  generatedAt: string;
}

export interface ChatRequestBody {
  domain: Domain;
  question: string;
  answer: string;
  history: ChatMessage[];
  currentOverallScore: number;
}

export interface ChatResponseBody {
  evaluation: EvaluationResult;
}

export interface ChatErrorBody {
  error: string;
}