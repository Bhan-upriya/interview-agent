"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  User,
  Send,
  Loader2,
  FileText,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  ClipboardList,
  Code2,
  Server,
  Binary,
  Layers,
  CloudCog,
  Cpu,
} from "lucide-react";

import {
  DOMAINS,
  type Domain,
  type ChatMessage,
  type Scorecard,
  type ScoreCategory,
  type EvaluationResult,
  type HiringReport,
  type Recommendation,
  type ChatResponseBody,
  type ChatErrorBody,
} from "@/types/interview";

// ---------------------------------------------------------------------------
// Static config & Domain Icons/Descriptions
// ---------------------------------------------------------------------------

const DOMAIN_DETAILS: Record<Domain, { icon: React.ReactNode; desc: string; badge: string }> = {
  "Frontend Development": {
    icon: <Code2 className="h-6 w-6 text-amber-600" />,
    desc: "UI components, state management, rendering lifecycle, and web performance.",
    badge: "Interactive & UI",
  },
  "Backend Development": {
    icon: <Server className="h-6 w-6 text-emerald-600" />,
    desc: "API design, database schemas, microservices architecture, and security.",
    badge: "Architecture & Data",
  },
  "Data Structures & Algorithms": {
    icon: <Binary className="h-6 w-6 text-indigo-600" />,
    desc: "Time/space complexity, trees, graphs, dynamic programming, and optimization.",
    badge: "Logic & Analysis",
  },
  "System Design": {
    icon: <Layers className="h-6 w-6 text-teal-600" />,
    desc: "Scalability, load balancing, caching strategies, and fault tolerance.",
    badge: "High-Scale Systems",
  },
  "DevOps & Cloud": {
    icon: <CloudCog className="h-6 w-6 text-sky-600" />,
    desc: "CI/CD pipelines, containerization, orchestration, and cloud infrastructure.",
    badge: "Operations & Reliability",
  },
  "Machine Learning": {
    icon: <Cpu className="h-6 w-6 text-purple-600" />,
    desc: "Model training, neural networks, data preprocessing, and evaluation metrics.",
    badge: "AI & Data Science",
  },
};

const CATEGORY_LABELS: Record<ScoreCategory["id"], string> = {
  correctness: "Correctness",
  clarity: "Clarity",
  depth: "Depth",
  communication: "Communication",
};

const CATEGORY_ORDER: ScoreCategory["id"][] = [
  "correctness",
  "clarity",
  "depth",
  "communication",
];

const STARTER_QUESTIONS: Record<Domain, string> = {
  "Frontend Development":
    "What happens in the browser between typing a URL and seeing the page render?",
  "Backend Development":
    "How would you design a scalable REST API for a high-traffic to-do list application?",
  "Data Structures & Algorithms":
    "What is the difference between a stack and a queue, and what are their underlying memory implications?",
  "System Design":
    "How would you approach designing a global, scalable real-time notification system?",
  "DevOps & Cloud":
    "What is the fundamental architectural difference between a Linux container and a traditional virtual machine?",
  "Machine Learning":
    "What is the core difference between supervised, unsupervised, and reinforcement learning paradigms?",
};

function generateId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function emptyScorecard(): Scorecard {
  return {
    overall: 0,
    categories: CATEGORY_ORDER.map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
      score: 0,
      delta: 0,
    })),
    questionsAsked: 0,
    history: [],
  };
}

// Fixed update logic: weights fresh incoming scores dynamically so every turn changes the total score accurately
function updateScorecard(prev: Scorecard, evaluation: EvaluationResult): Scorecard {
  const categories: ScoreCategory[] = CATEGORY_ORDER.map((id) => {
    const prevCategory = prev.categories.find((c) => c.id === id);
    const prevScore = prevCategory?.score ?? 0;
    const incoming = clamp(evaluation.categoryScores[id]);
    
    // Use progressive averaging so later answers accurately adjust the current total score up or down
    const newScore = prev.questionsAsked === 0 
      ? incoming 
      : clamp(Math.round((prevScore * prev.questionsAsked + incoming) / (prev.questionsAsked + 1)));

    return {
      id,
      label: CATEGORY_LABELS[id],
      score: newScore,
      delta: newScore - prevScore,
    };
  });

  const overall = clamp(
    Math.round(categories.reduce((sum, c) => sum + c.score, 0) / categories.length)
  );

  return {
    overall,
    categories,
    questionsAsked: prev.questionsAsked + 1,
    history: [...prev.history, overall],
  };
}

function recommendationFor(overall: number): Recommendation {
  if (overall >= 80) return "Strong Hire";
  if (overall >= 60) return "Hire";
  if (overall >= 40) return "Lean Hire";
  return "No Hire";
}

function buildHiringReport(
  domain: Domain,
  scorecard: Scorecard,
  messages: ChatMessage[],
  aggregatedStrengths: string[],
  aggregatedImprovements: string[]
): HiringReport {
  const uniqueStrengths = Array.from(new Set(aggregatedStrengths)).slice(0, 5);
  const uniqueImprovements = Array.from(new Set(aggregatedImprovements)).slice(0, 5);
  const recommendation = recommendationFor(scorecard.overall);

  const summary =
    scorecard.questionsAsked === 0
      ? "No questions were answered during this session, so no meaningful assessment could be generated."
      : `Across ${scorecard.questionsAsked} question${
          scorecard.questionsAsked === 1 ? "" : "s"
        } in ${domain}, the candidate achieved an overall score of ${scorecard.overall}/100. ` +
        `This places them in the "${recommendation}" range based on this interview alone.`;

  return {
    domain,
    overallScore: scorecard.overall,
    recommendation,
    summary,
    strengths: uniqueStrengths.length > 0 ? uniqueStrengths : ["No standout strengths recorded."],
    weaknesses: uniqueImprovements.length > 0 ? uniqueImprovements : ["No specific weaknesses recorded."],
    categoryBreakdown: scorecard.categories,
    transcriptLength: messages.length,
    questionsAsked: scorecard.questionsAsked,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Presentational Components
// ---------------------------------------------------------------------------

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-stone-400">
        <Minus className="h-3 w-3" />
        0
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-semibold ${
        positive ? "text-emerald-700" : "text-rose-700"
      }`}
    >
      {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {positive ? "+" : ""}
      {Math.round(delta)}
    </span>
  );
}

function ScoreBar({ category }: { category: ScoreCategory }) {
  return (
    <div className="mb-3.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-stone-700">{category.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-stone-900">{category.score}</span>
          <DeltaBadge delta={category.delta} />
        </div>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200">
        <motion.div
          className="h-full rounded-full bg-amber-600"
          initial={{ width: 0 }}
          animate={{ width: `${category.score}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function DomainSelector({ onSelect }: { onSelect: (domain: Domain) => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] px-4 py-12 text-stone-900">
      <div className="w-full max-w-4xl text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-1.5 text-xs font-semibold text-amber-800 shadow-xs">
          <Sparkles className="h-4 w-4 text-amber-600" />
          Adaptive AI Technical Assessment Platform
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl">
          Choose Your Evaluation Domain
        </h1>
        <p className="mt-2 mb-10 text-sm text-stone-600 sm:text-base">
          Select a technical field to start a live interactive interview with real-time feedback and scoring.
        </p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DOMAINS.map((domain) => {
            const details = DOMAIN_DETAILS[domain];
            return (
              <button
                key={domain}
                onClick={() => onSelect(domain)}
                className="group relative flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-6 text-left shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-amber-400 hover:shadow-lg"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="rounded-xl border border-stone-100 bg-stone-50 p-3 shadow-inner transition-colors group-hover:bg-amber-50">
                      {details.icon}
                    </div>
                    <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600">
                      {details.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-stone-900 group-hover:text-amber-800">
                    {domain}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-stone-500">
                    {details.desc}
                  </p>
                </div>
                <div className="mt-6 flex items-center text-xs font-semibold text-amber-700 opacity-0 transition-opacity group-hover:opacity-100">
                  Start interview session →
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function HiringReportModal({
  report,
  onClose,
  onRestart,
}: {
  report: HiringReport;
  onClose: () => void;
  onRestart: () => void;
}) {
  const recommendationColor: Record<Recommendation, string> = {
    "Strong Hire": "text-emerald-800 border-emerald-300 bg-emerald-50",
    Hire: "text-teal-800 border-teal-300 bg-teal-50",
    "Lean Hire": "text-amber-800 border-amber-300 bg-amber-50",
    "No Hire": "text-rose-800 border-rose-300 bg-rose-50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-stone-200 bg-white p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between border-b border-stone-100 pb-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-700" />
              <h2 className="text-lg font-bold text-stone-900">Final Hiring Report</h2>
            </div>
            <p className="text-xs text-stone-500">Domain: {report.domain}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full bg-stone-100 p-1.5 text-stone-500 transition hover:bg-stone-200 hover:text-stone-800"
            aria-label="Close report"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div
          className={`mb-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold shadow-xs ${recommendationColor[report.recommendation]}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {report.recommendation} · Overall Score: {report.overallScore}/100
        </div>

        <p className="mb-6 text-sm leading-relaxed text-stone-700">{report.summary}</p>

        <div className="mb-6 rounded-2xl border border-stone-100 bg-stone-50 p-4">
          <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-stone-500">
            Competency Breakdown
          </h3>
          {report.categoryBreakdown.map((cat) => (
            <ScoreBar key={cat.id} category={cat} />
          ))}
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-800">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Key Strengths
            </h3>
            <ul className="space-y-1.5 text-xs text-stone-700">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-600 font-bold">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" /> Growth Areas
            </h3>
            <ul className="space-y-1.5 text-xs text-stone-700">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-600 font-bold">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex justify-between border-t border-stone-100 pt-4 text-xs text-stone-400">
          <span>{report.questionsAsked} questions completed</span>
          <span>{report.transcriptLength} total exchanges</span>
        </div>

        <button
          onClick={onRestart}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-600 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700"
        >
          <RotateCcw className="h-4 w-4" />
          Start New Assessment
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Dashboard Page
// ---------------------------------------------------------------------------

export default function InterviewDashboard() {
  const [domain, setDomain] = useState<Domain | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [inputValue, setInputValue] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [scorecard, setScorecard] = useState<Scorecard>(emptyScorecard());
  const [showTranscript, setShowTranscript] = useState<boolean>(false);
  const [showReport, setShowReport] = useState<boolean>(false);
  const [report, setReport] = useState<HiringReport | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [lastFallback, setLastFallback] = useState<boolean>(false);

  const strengthsRef = useRef<string[]>([]);
  const improvementsRef = useRef<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSelectDomain(selected: Domain) {
    const starter = STARTER_QUESTIONS[selected];
    setDomain(selected);
    setScorecard(emptyScorecard());
    strengthsRef.current = [];
    improvementsRef.current = [];
    setCurrentQuestion(starter);
    setMessages([
      {
        id: generateId(),
        role: "interviewer",
        content: starter,
        timestamp: Date.now(),
      },
    ]);
  }

  function handleRestart() {
    setDomain(null);
    setMessages([]);
    setCurrentQuestion("");
    setInputValue("");
    setScorecard(emptyScorecard());
    setShowReport(false);
    setReport(null);
    setErrorBanner(null);
    strengthsRef.current = [];
    improvementsRef.current = [];
  }

  async function handleSend() {
    const trimmed = inputValue.trim();
    if (!trimmed || !domain || isLoading) return;

    const candidateMessage: ChatMessage = {
      id: generateId(),
      role: "candidate",
      content: trimmed,
      timestamp: Date.now(),
    };

    const updatedMessages = [...messages, candidateMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setIsLoading(true);
    setErrorBanner(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          question: currentQuestion,
          answer: trimmed,
          history: updatedMessages,
          currentOverallScore: scorecard.overall,
        }),
      });

      if (!res.ok) {
        const errBody = (await res.json().catch(() => null)) as ChatErrorBody | null;
        throw new Error(errBody?.error ?? `Request failed with status ${res.status}`);
      }

      const data = (await res.json()) as ChatResponseBody;
      const { evaluation } = data;

      setLastFallback(evaluation.isFallback);
      setScorecard((prev) => updateScorecard(prev, evaluation));
      strengthsRef.current.push(...evaluation.strengths);
      improvementsRef.current.push(...evaluation.improvements);

      const feedbackMessage: ChatMessage = {
        id: generateId(),
        role: "system",
        content: evaluation.feedback,
        timestamp: Date.now(),
      };

      const nextQuestionMessage: ChatMessage = {
        id: generateId(),
        role: "interviewer",
        content: evaluation.nextQuestion,
        timestamp: Date.now() + 1,
      };

      setCurrentQuestion(evaluation.nextQuestion);
      setMessages((prev) => [...prev, feedbackMessage, nextQuestionMessage]);
    } catch (err) {
      console.error(err);
      setErrorBanner(
        err instanceof Error
          ? err.message
          : "Something went wrong while evaluating your answer. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleEndInterview() {
    if (!domain) return;
    const finalReport = buildHiringReport(
      domain,
      scorecard,
      messages,
      strengthsRef.current,
      improvementsRef.current
    );
    setReport(finalReport);
    setShowReport(true);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  }

  if (!domain) {
    return <DomainSelector onSelect={handleSelectDomain} />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#FDFBF7] text-stone-900">
      <header className="flex items-center justify-between border-b border-stone-200 bg-white/80 px-6 py-4 backdrop-blur-md sticky top-0 z-20 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 shadow-xs">
            {DOMAIN_DETAILS[domain]?.icon || <Bot className="h-5 w-5" />}
          </div>
          <div>
            <h1 className="text-sm font-bold text-stone-900">AI Technical Interviewer</h1>
            <p className="text-xs text-amber-800 font-medium">{domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-semibold text-stone-700 shadow-xs transition hover:bg-stone-50 hover:border-stone-300"
          >
            <ClipboardList className="h-4 w-4 text-stone-500" />
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </button>
          <button
            onClick={handleEndInterview}
            disabled={scorecard.questionsAsked === 0}
            className="flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText className="h-4 w-4" />
            End Interview
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {(showTranscript ? messages : messages.filter((m) => m.role !== "system")).map(
                (message) => (
                  <MessageBubble key={message.id} message={message} />
                )
              )}
              {isLoading && (
                <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white p-4 text-xs font-medium text-stone-500 shadow-xs w-fit">
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                  Evaluating candidate response & synthesizing follow-up...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {errorBanner && (
            <div className="mx-6 mb-2 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800 shadow-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
              {errorBanner}
            </div>
          )}

          {lastFallback && !errorBanner && (
            <div className="mx-6 mb-2 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 shadow-xs">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              Notice: The response was processed using backup verification rules (brief answer or transient service lag).
            </div>
          )}

          <div className="border-t border-stone-200 bg-white px-4 py-4 sm:px-6 shadow-sm">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your technical answer here..."
                rows={2}
                disabled={isLoading}
                className="flex-1 resize-none rounded-2xl border border-stone-200 bg-[#FDFBF7] px-4 py-3 text-sm text-stone-900 placeholder-stone-400 outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50 transition-all shadow-inner"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isLoading || !inputValue.trim()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-600 text-white shadow-sm transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send answer"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 overflow-y-auto border-l border-stone-200 bg-white px-6 py-6 lg:block shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Live Scorecard
            </h2>
            <Sparkles className="h-4 w-4 text-amber-600" />
          </div>

          <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
            <span className="text-xs font-semibold text-stone-500">Overall Technical Mastery</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-stone-900">{scorecard.overall}</span>
              <span className="text-sm font-medium text-stone-400">/ 100</span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-stone-200">
              <div
                className="h-full rounded-full bg-amber-600 transition-all duration-500"
                style={{ width: `${scorecard.overall}%` }}
              />
            </div>
          </div>

          <div className="space-y-2">
            {scorecard.categories.map((cat) => (
              <ScoreBar key={cat.id} category={cat} />
            ))}
          </div>

          <div className="mt-8 rounded-2xl border border-stone-100 bg-stone-50 p-4 text-center">
            <span className="text-xs font-medium text-stone-500">
              {scorecard.questionsAsked} question{scorecard.questionsAsked === 1 ? "" : "s"} evaluated
            </span>
          </div>
        </aside>
      </div>

      <AnimatePresence>
        {showReport && report && (
          <HiringReportModal
            report={report}
            onClose={() => setShowReport(false)}
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  if (message.role === "system") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto flex max-w-lg items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/60 px-4 py-3 text-xs text-amber-900 shadow-xs"
      >
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
        <div className="leading-relaxed font-medium">{message.content}</div>
      </motion.div>
    );
  }

  const isInterviewer = message.role === "interviewer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-start gap-3 ${isInterviewer ? "" : "flex-row-reverse"}`}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl shadow-xs ${
          isInterviewer ? "bg-amber-600 text-white" : "bg-stone-200 text-stone-700"
        }`}
      >
        {isInterviewer ? (
          <Bot className="h-5 w-5" />
        ) : (
          <User className="h-5 w-5" />
        )}
      </div>
      <div
        className={`max-w-[80%] rounded-3xl px-5 py-3.5 text-sm leading-relaxed shadow-xs ${
          isInterviewer
            ? "rounded-tl-sm border border-stone-200 bg-white text-stone-800"
            : "rounded-tr-sm bg-stone-900 text-white"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}