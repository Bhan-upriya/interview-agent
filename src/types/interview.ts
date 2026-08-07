export type AssessmentDomain = 
  | 'Enterprise RAG' 
  | 'Vector Search' 
  | 'Agent Orchestration' 
  | 'System Design' 
  | 'Fine-Tuning & LLMOps';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  turnNumber: number;
}

export interface TurnEvaluation {
  turnNumber: number;
  question: string;
  answer: string;
  scoreDelta: number;
  accuracyScore: number;
  conceptCovered: string;
  feedback: string;
  strengths: string[];
  gaps: string[];
}

export interface AssessmentReport {
  overallScore: number;
  recommendation: 'Strong Hire' | 'Follow-up Needed' | 'Needs Growth';
  domainScores: { domain: string; score: number }[];
  strengths: string[];
  improvements: string[];
}