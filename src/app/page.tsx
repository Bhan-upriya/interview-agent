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
// Static config
// ---------------------------------------------------------------------------

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
    "Let's start simple: what happens in the browser between typing a URL and seeing the page render?",
  "Backend Development":
    "To start, how would you design a simple REST API for a to-do list application?",
  "Data Structures & Algorithms":
    "Let's begin: can you explain the difference between a stack and a queue, and give a real use case for each?",
  "System Design":
    "For our first question: how would you approach designing a scalable notification system?",
  "DevOps & Cloud":
    "To start: what is the difference between a container and a virtual machine?",
  "Machine Learning":
    "Let's start with the basics: what's the difference between supervised and unsupervised learning?",
};

const EMA_WEIGHT = 0.4; // weight given to the newest evaluation when blending scores

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

/**
 * Blends the new evaluation into the running scorecard using an
 * exponential moving average, so a single weak/strong answer doesn't
 * swing the overall score too drastically.
 */
function updateScorecard(prev: Scorecard, evaluation: EvaluationResult): Scorecard {
  const isFirst = prev.questionsAsked === 0;

  const categories: ScoreCategory[] = CATEGORY_ORDER.map((id) => {
    const prevCategory = prev.categories.find((c) => c.id === id);
    const prevScore = prevCategory?.score ?? 0;
    const incoming = clamp(evaluation.categoryScores[id]);
    const newScore = isFirst ? incoming : clamp(prevScore * (1 - EMA_WEIGHT) + incoming * EMA_WEIGHT);
    return {
      id,
      label: CATEGORY_LABELS[id],
      score: newScore,
      delta: newScore - prevScore,
    };
  });

  const overall = clamp(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length
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
    weaknesses:
      uniqueImprovements.length > 0 ? uniqueImprovements : ["No specific weaknesses recorded."],
    categoryBreakdown: scorecard.categories,
    transcriptLength: messages.length,
    questionsAsked: scorecard.questionsAsked,
    generatedAt: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Small presentational components
// ---------------------------------------------------------------------------

function DeltaBadge({ delta }: { delta: number }) {
  if (Math.abs(delta) < 1) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Minus className="h-3 w-3" />
        0
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        positive ? "text-emerald-400" : "text-rose-400"
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
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-medium text-slate-300">{category.label}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">{category.score}</span>
          <DeltaBadge delta={category.delta} />
        </div>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-2xl text-center">
        <div className="mb-3 flex items-center justify-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-400" />
          <h1 className="text-2xl font-semibold text-white">AI Technical Interviewer</h1>
        </div>
        <p className="mb-8 text-sm text-slate-400">
          Pick a domain to begin a live, adaptive technical interview with real-time scoring.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DOMAINS.map((domain) => (
            <button
              key={domain}
              onClick={() => onSelect(domain)}
              className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-left transition hover:border-indigo-500 hover:bg-slate-800"
            >
              <span className="text-sm font-medium text-white">{domain}</span>
            </button>
          ))}
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
    "Strong Hire": "text-emerald-400 border-emerald-500/40 bg-emerald-500/10",
    Hire: "text-teal-400 border-teal-500/40 bg-teal-500/10",
    "Lean Hire": "text-amber-400 border-amber-500/40 bg-amber-500/10",
    "No Hire": "text-rose-400 border-rose-500/40 bg-rose-500/10",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <FileText className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-semibold text-white">Hiring Report</h2>
            </div>
            <p className="text-xs text-slate-400">{report.domain}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Close report"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div
          className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-medium ${recommendationColor[report.recommendation]}`}
        >
          <CheckCircle2 className="h-4 w-4" />
          {report.recommendation} · {report.overallScore}/100
        </div>

        <p className="mb-5 text-sm leading-relaxed text-slate-300">{report.summary}</p>

        <div className="mb-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Category Breakdown
          </h3>
          {report.categoryBreakdown.map((cat) => (
            <ScoreBar key={cat.id} category={cat} />
          ))}
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Strengths
            </h3>
            <ul className="space-y-1 text-sm text-slate-300">
              {report.strengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-emerald-500">•</span> {s}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5" /> Areas to Improve
            </h3>
            <ul className="space-y-1 text-sm text-slate-300">
              {report.weaknesses.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-amber-500">•</span> {w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <span>{report.questionsAsked} questions asked</span>
          <span>·</span>
          <span>{report.transcriptLength} messages</span>
        </div>

        <button
          onClick={onRestart}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-sm font-medium text-white transition hover:bg-indigo-500"
        >
          <RotateCcw className="h-4 w-4" />
          Start a New Interview
        </button>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
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
    <div className="flex min-h-screen flex-col bg-slate-950">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-indigo-400" />
          <div>
            <h1 className="text-sm font-semibold text-white">AI Technical Interviewer</h1>
            <p className="text-xs text-slate-500">{domain}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTranscript((v) => !v)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800"
          >
            <ClipboardList className="h-3.5 w-3.5" />
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </button>
          <button
            onClick={handleEndInterview}
            disabled={scorecard.questionsAsked === 0}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <FileText className="h-3.5 w-3.5" />
            End Interview
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Chat / Transcript column */}
        <main className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="mx-auto flex max-w-2xl flex-col gap-4">
              {(showTranscript ? messages : messages.filter((m) => m.role !== "system")).map(
                (message) => (
                  <MessageBubble key={message.id} message={message} />
                )
              )}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Evaluating your answer...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {errorBanner && (
            <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {errorBanner}
            </div>
          )}

          {lastFallback && !errorBanner && (
            <div className="mx-6 mb-2 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              The last evaluation used a fallback scorer (AI evaluator unavailable or answer too
              short).
            </div>
          )}

          <div className="border-t border-slate-800 px-6 py-4">
            <div className="mx-auto flex max-w-2xl items-end gap-2">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your answer..."
                rows={2}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 disabled:opacity-50"
              />
              <button
                onClick={() => void handleSend()}
                disabled={isLoading || !inputValue.trim()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
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

        {/* Live scorecard panel */}
        <aside className="hidden w-72 shrink-0 overflow-y-auto border-l border-slate-800 px-5 py-6 md:block">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Live Scorecard
          </h2>
          <div className="mb-6 mt-3 flex items-end gap-2">
            <span className="text-4xl font-bold text-white">{scorecard.overall}</span>
            <span className="mb-1 text-sm text-slate-500">/ 100</span>
          </div>
          {scorecard.categories.map((cat) => (
            <ScoreBar key={cat.id} category={cat} />
          ))}
          <div className="mt-6 border-t border-slate-800 pt-4 text-xs text-slate-500">
            {scorecard.questionsAsked} question{scorecard.questionsAsked === 1 ? "" : "s"}{" "}
            answered
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
        className="mx-auto flex max-w-md items-start gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs text-slate-400"
      >
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-indigo-400" />
        {message.content}
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
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isInterviewer ? "bg-indigo-600" : "bg-slate-700"
        }`}
      >
        {isInterviewer ? (
          <Bot className="h-4 w-4 text-white" />
        ) : (
          <User className="h-4 w-4 text-white" />
        )}
      </div>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isInterviewer
            ? "bg-slate-900 text-slate-200"
            : "bg-indigo-600 text-white"
        }`}
      >
        {message.content}
      </div>
    </motion.div>
  );
}
