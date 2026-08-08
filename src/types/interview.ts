export type Domain =
  | "Frontend Development"
  | "Backend Development"
  | "Data Structures & Algorithms"
  | "System Design"
  | "DevOps & Cloud"
  | "Machine Learning";

export const DOMAINS: Domain[] = [
  "Frontend Development",
  "Backend Development",
  "Data Structures & Algorithms",
  "System Design",
  "DevOps & Cloud",
  "Machine Learning",
];

export type MessageRole = "interviewer" | "candidate" | "system";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
}

export type CategoryId = "correctness" | "clarity" | "depth" | "communication";

export interface CategoryScores {
  correctness: number;
  clarity: number;
  depth: number;
  communication: number;
}

export interface ScoreCategory {
  id: CategoryId;
  label: string;
  score: number; // 0-100, running score
  delta: number; // change from previous evaluation
}

export interface EvaluationResult {
  accuracy: number; // 0-100, accuracy for this specific answer
  delta: number; // change vs previous overall score
  feedback: string;
  strengths: string[];
  improvements: string[];
  nextQuestion: string;
  isFallback: boolean;
  categoryScores: CategoryScores;
}

export interface Scorecard {
  overall: number;
  categories: ScoreCategory[];
  questionsAsked: number;
  history: number[]; // overall score trend, one entry per turn
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
