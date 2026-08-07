'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, User, Send, CheckCircle2, AlertCircle, RefreshCw,
  FileText, ArrowRight, ArrowLeft, Award, BarChart3, ChevronDown, ChevronUp,
  Download, Sparkles, SlidersHorizontal, LayoutDashboard, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Message, TurnEvaluation, AssessmentDomain } from '@/types/interview';

// --- Domain Configurations ---
const DOMAINS: { id: AssessmentDomain; title: string; desc: string; icon: string; difficulty: string }[] = [
  { id: 'Enterprise RAG', title: 'Enterprise RAG', desc: 'Chunking, hybrid search, reranking & context windows', icon: '⚡', difficulty: 'Intermediate' },
  { id: 'Vector Search', title: 'Vector Search', desc: 'Embeddings, HNSW, quantization & distance metrics', icon: '🔍', difficulty: 'Advanced' },
  { id: 'Agent Orchestration', title: 'Agent Orchestration', desc: 'Tool calling, multi-agent flows & memory recovery', icon: '🤖', difficulty: 'Advanced' },
  { id: 'System Design', title: 'System Design', desc: 'Rate limiting, caching, latency & LLM resiliency', icon: '⚙️', difficulty: 'Expert' },
  { id: 'Fine-Tuning & LLMOps', title: 'Fine-Tuning & LLMOps', desc: 'LoRA, evaluation metrics, guardrails & tracking', icon: '🎯', difficulty: 'Advanced' },
];

export default function InterviewerDashboard() {
  // --- States ---
  const [selectedDomains, setSelectedDomains] = useState<AssessmentDomain[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const [activeTab, setActiveTab] = useState<'interview' | 'transcript'>('interview');

  const [messages, setMessages] = useState<Message[]>([]);
  const [evaluations, setEvaluations] = useState<TurnEvaluation[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const [totalScore, setTotalScore] = useState(0);
  const [lastAccuracy, setLastAccuracy] = useState(0);
  const [recentFeedback, setRecentFeedback] = useState('Assessment initiated. Awaiting first candidate answer.');
  const [evaluatedBadges, setEvaluatedBadges] = useState<string[]>([]);

  const [showReportModal, setShowReportModal] = useState(false);
  const [showMobileScorecard, setShowMobileScorecard] = useState(false);


  // --- LocalStorage Persistence ---
  useEffect(() => {
    const saved = localStorage.getItem('interview_session_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.isStarted) {
          setIsStarted(parsed.isStarted);
          setSelectedDomains(parsed.selectedDomains || []);
          setMessages(parsed.messages || []);
          setEvaluations(parsed.evaluations || []);
          // Use ?? instead of || so 0 is recognized as a valid score
          setTotalScore(parsed.totalScore ?? 0);
          setLastAccuracy(parsed.lastAccuracy ?? 0);
          setRecentFeedback(parsed.recentFeedback || 'Assessment initiated.');
          setEvaluatedBadges(parsed.evaluatedBadges || []);
        }
      } catch (e) {
        console.error('Failed to load session:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isStarted) {
      localStorage.setItem('interview_session_v2', JSON.stringify({
        isStarted, selectedDomains, messages, evaluations, totalScore, lastAccuracy, recentFeedback, evaluatedBadges
      }));
    }
  }, [isStarted, selectedDomains, messages, evaluations, totalScore, lastAccuracy, recentFeedback, evaluatedBadges]);

  const handleStart = () => {
    if (selectedDomains.length === 0) return;
    setIsStarted(true);

    // Reset initial metrics to zero
    setTotalScore(0);
    setLastAccuracy(0);
    setRecentFeedback('Assessment initiated. Awaiting first candidate answer.');
    setEvaluatedBadges([]);

    const initialMsg: Message = {
      id: '1',
      role: 'assistant',
      content: `Welcome to your AI Technical Assessment! We will focus on: ${selectedDomains.join(', ')}. Let's start with Retrieval-Augmented Generation: How do you choose the right chunking strategy and embedding model for structured technical documents?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      turnNumber: 1
    };
    setMessages([initialMsg]);
  };

  // --- Fully resets session state and returns user to the Domain Selector ---
  const handleReset = () => {
    // Clear all storage so old states don't reload on refresh
    localStorage.clear();
    sessionStorage.clear();

    // Reset UI state to show Domain Selector
    setIsStarted(false);
    setSelectedDomains([]);
    setMessages([]);
    setEvaluations([]);
    setTotalScore(0);
    setLastAccuracy(0);
    setRecentFeedback('Assessment initiated. Awaiting first candidate answer.');
    setEvaluatedBadges([]);
    setShowReportModal(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const currentTurn = messages.filter(m => m.role === 'user').length + 1;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      turnNumber: currentTurn
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          topic: selectedDomains.join(', '),
        }),
      });

      const data = await res.json();

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || "Let's explore fallback mechanics when primary LLM endpoints fail.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        turnNumber: currentTurn
      };
      setMessages([...updatedMessages, assistantMsg]);

      if (data.evaluation) {
        const ev = data.evaluation;
        setTotalScore((prev) => Math.max(0, Math.min(100, prev + (ev.scoreDelta ?? 0))));
        setLastAccuracy(ev.accuracyScore ?? 50);
        setRecentFeedback(ev.feedback || 'Response analyzed.');

        if (ev.conceptCovered && !evaluatedBadges.includes(ev.conceptCovered)) {
          setEvaluatedBadges((prev) => [...prev, ev.conceptCovered]);
        }

        const newEval: TurnEvaluation = {
          turnNumber: currentTurn,
          question: updatedMessages[updatedMessages.length - 2]?.content || '',
          answer: userMsg.content,
          scoreDelta: ev.scoreDelta ?? 0,
          accuracyScore: ev.accuracyScore ?? 50,
          conceptCovered: ev.conceptCovered || 'Technical Logic',
          feedback: ev.feedback || 'Evaluated turn.',
          strengths: ev.accuracyScore >= 70 ? ['Clear explanation', 'Valid architecture trade-offs'] : ['Attempted response'],
          gaps: ev.accuracyScore < 70 ? ['Missing operational detail', 'Skipped failure modes'] : []
        };
        setEvaluations(prev => [...prev, newEval]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- Domain Selector Screen ---
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-stone-800 flex flex-col justify-center items-center p-6">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" /> AI Candidate Evaluation Platform
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-stone-900">
              Welcome! Let&apos;s find the right challenge for you.
            </h1>
            <p className="text-stone-500 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
              Select one or more domain focus areas below to tailor your interactive technical assessment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOMAINS.map((d) => {
              const isSelected = selectedDomains.includes(d.id);
              return (
                <div
                  key={d.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDomains(selectedDomains.filter(id => id !== d.id));
                    } else {
                      setSelectedDomains([...selectedDomains, d.id]);
                    }
                  }}
                  className={`cursor-pointer p-5 rounded-2xl border transition-all duration-200 bg-white shadow-sm hover:shadow-md ${isSelected
                    ? 'border-amber-400 bg-amber-50/30 ring-2 ring-amber-400/20'
                    : 'border-stone-200 hover:border-stone-300'
                    }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl p-2 rounded-xl bg-stone-100">{d.icon}</span>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-600">
                      {d.difficulty}
                    </span>
                  </div>
                  <h3 className="font-semibold text-stone-900 text-base mb-1">{d.title}</h3>
                  <p className="text-stone-500 text-xs leading-relaxed">{d.desc}</p>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col items-center gap-3 pt-4">
            <button
              onClick={handleStart}
              disabled={selectedDomains.length === 0}
              className="w-full md:w-auto px-8 py-3.5 rounded-xl font-medium text-sm text-white bg-amber-500 hover:bg-amber-600 disabled:opacity-40 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2"
            >
              Start Assessment <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs text-stone-400">
              {selectedDomains.length > 0 ? `${selectedDomains.length} domain(s) selected` : 'Select at least one domain to begin'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // --- Main Dashboard Screen ---
  return (
    <div className="min-h-screen bg-[#FAFAF8] text-stone-800 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-30 px-4 md:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          {/* Exit hatch: returns to Domain Selector at any point */}
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs font-medium text-stone-500 hover:text-stone-800 transition-colors mr-1 pr-3 border-r border-stone-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Domains
          </button>

          <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-600 font-bold text-lg">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-stone-900 leading-none">ABTalks Technical Interviewer</h1>
            <p className="text-[11px] text-stone-400 mt-1">Active Domains: {selectedDomains.join(', ')}</p>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('interview')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'interview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              <MessageSquare className="w-3.5 h-3.5" /> Interview
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'transcript' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500 hover:text-stone-800'
                }`}
            >
              <FileText className="w-3.5 h-3.5" /> Transcript ({evaluations.length})
            </button>
          </div>

          <button
            onClick={() => setShowMobileScorecard(!showMobileScorecard)}
            className="lg:hidden p-2 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-50"
          >
            <BarChart3 className="w-4 h-4" />
          </button>

          <button
            onClick={handleReset}
            className="border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 px-3.5 py-1.5 rounded-xl text-xs font-medium transition-colors"
          >
            End Assessment
          </button>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Panel: Chat or Transcript View */}
        <div className="lg:col-span-2 flex flex-col space-y-4">

          {/* Mobile Tab Switcher */}
          <div className="sm:hidden flex bg-stone-100 p-1 rounded-xl border border-stone-200 text-xs font-medium">
            <button
              onClick={() => setActiveTab('interview')}
              className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'interview' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'}`}
            >
              Interview
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`flex-1 py-1.5 text-center rounded-lg ${activeTab === 'transcript' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-500'}`}
            >
              Transcript ({evaluations.length})
            </button>
          </div>

          {activeTab === 'interview' ? (
            <InterviewChat
              messages={messages}
              input={input}
              setInput={setInput}
              handleSend={handleSend}
              loading={loading}
            />
          ) : (
            <TranscriptView evaluations={evaluations} />
          )}
        </div>

        {/* Right Sticky Sidebar Scorecard */}
        <div className={`space-y-4 lg:block ${showMobileScorecard ? 'block' : 'hidden'}`}>
          <ScorecardPanel
            totalScore={totalScore}
            lastAccuracy={lastAccuracy}
            recentFeedback={recentFeedback}
            evaluatedBadges={evaluatedBadges}
            handleReset={handleReset}
          />
        </div>
      </main>

      {/* Assessment Final Modal */}
      {showReportModal && (
        <AssessmentReportModal
          totalScore={totalScore}
          evaluations={evaluations}
          domains={selectedDomains}
          onClose={handleReset}
        />
      )}
    </div>
  );
}

// ==========================================
// Sub-Component 1: Interview Chat Interface
// ==========================================
function InterviewChat({
  messages,
  input,
  setInput,
  handleSend,
  loading
}: {
  messages: Message[];
  input: string;
  setInput: (v: string) => void;
  handleSend: (e?: React.FormEvent) => void;
  loading: boolean;
}) {
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl shadow-sm flex flex-col h-[650px] overflow-hidden">
      {/* Scrollable Message List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {messages.map((m) => {
          const isUser = m.role === 'user';
          return (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs shrink-0 ${isUser ? 'bg-violet-100 text-violet-700' : 'bg-teal-100 text-teal-700'
                }`}>
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div className={`max-w-[82%] space-y-1 ${isUser ? 'items-end' : 'items-start'}`}>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${isUser
                  ? 'bg-violet-50/80 border border-violet-100 text-stone-800 rounded-tr-none'
                  : 'bg-stone-50 border border-stone-200/80 text-stone-800 rounded-tl-none'
                  }`}>
                  {m.content}
                </div>
                <div className={`text-[10px] text-stone-400 px-1 ${isUser ? 'text-right' : 'text-left'}`}>
                  Turn {m.turnNumber} • {m.timestamp}
                </div>
              </div>
            </motion.div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 rounded-tl-none flex items-center gap-1.5">
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce"></span>
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.2s]"></span>
              <span className="w-2 h-2 bg-teal-500 rounded-full animate-bounce [animation-delay:0.4s]"></span>
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Auto-expanding Input Box */}
      <form onSubmit={handleSend} className="p-4 border-t border-stone-200 bg-stone-50/50 flex flex-col gap-2">
        <div className="relative flex items-center">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your technical response here..."
            rows={2}
            className="w-full bg-white border border-stone-200 rounded-xl px-4 py-3 text-sm text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 resize-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-3 bottom-3 p-2.5 rounded-lg bg-teal-500 hover:bg-teal-600 disabled:opacity-40 text-white transition-all shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between text-[11px] text-stone-400 px-1">
          <span>Press <kbd className="px-1.5 py-0.5 bg-stone-200 rounded text-[10px] text-stone-600 font-mono">⌘ + Enter</kbd> to submit</span>
          <span>{input.length} characters</span>
        </div>
      </form>
    </div>
  );
}

// ==========================================
// Sub-Component 2: Live Scorecard Panel
// ==========================================
function ScorecardPanel({
  totalScore,
  lastAccuracy,
  recentFeedback,
  evaluatedBadges,
  handleReset
}: {
  totalScore: number;
  lastAccuracy: number;
  recentFeedback: string;
  evaluatedBadges: string[];
  handleReset: () => void;
}) {
  return (
    <div className="sticky top-20 space-y-4">
      {/* Card 1: Overall Score */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
        <div className="flex items-center justify-between text-xs font-semibold text-stone-500 uppercase tracking-wider">
          <span>Overall Technical Mastery</span>
          <Award className="w-4 h-4 text-amber-500" />
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-3xl font-bold font-mono text-stone-900">{totalScore}<span className="text-stone-400 text-lg font-normal">/100</span></span>
          <span className="text-xs text-stone-500">Target Pass: 75</span>
        </div>
        <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-teal-500 transition-all duration-500 rounded-full"
            style={{ width: `${totalScore}%` }}
          />
        </div>
      </div>

      {/* Card 2: Radial Accuracy Gauge */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs flex items-center justify-between">
        <div className="space-y-1 max-w-[60%]">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Last Turn Accuracy</h3>
          <p className="text-xs text-stone-500 leading-snug">Evaluated for architectural correctness & trade-off depth.</p>
        </div>
        <div className="relative w-16 h-16 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-stone-100"
              strokeWidth="3.5"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className={lastAccuracy >= 75 ? 'text-teal-500' : lastAccuracy >= 50 ? 'text-amber-500' : 'text-rose-400'}
              strokeDasharray={`${lastAccuracy}, 100`}
              strokeWidth="3.5"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <span className="absolute font-mono font-bold text-xs text-stone-800">{lastAccuracy}%</span>
        </div>
      </div>

      {/* Card 3: Real-Time Critique */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-2 border-l-4 border-l-amber-400">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Interviewer Critique</h3>
        <p className="text-xs text-stone-700 italic leading-relaxed">&ldquo;{recentFeedback}&rdquo;</p>
      </div>

      {/* Card 4: Evaluated Badges */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
        <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Evaluated Competencies</h3>
        <div className="flex flex-wrap gap-2">
          {evaluatedBadges.map((b, i) => (
            <span
              key={i}
              className="px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 border border-teal-200 text-teal-700 flex items-center gap-1"
            >
              <CheckCircle2 className="w-3 h-3 text-teal-500" /> {b}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={handleReset}
        className="w-full text-xs text-stone-400 hover:text-stone-600 flex items-center justify-center gap-1.5 py-2 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" /> Restart Session & Clear Data
      </button>
    </div>
  );
}

// ==========================================
// Sub-Component 3: Transcript View
// ==========================================
function TranscriptView({ evaluations }: { evaluations: TurnEvaluation[] }) {
  const [expandedTurn, setExpandedTurn] = useState<number | null>(null);

  if (evaluations.length === 0) {
    return (
      <div className="bg-white border border-stone-200 rounded-2xl p-12 text-center text-stone-400 space-y-2">
        <FileText className="w-8 h-8 mx-auto text-stone-300" />
        <p className="text-sm">No turn evaluations recorded yet. Complete an answer turn in the interview to view transcripts.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((ev) => {
        const isExpanded = expandedTurn === ev.turnNumber;
        return (
          <div key={ev.turnNumber} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2.5 py-1 bg-stone-100 rounded-md text-stone-600">
                  Turn {ev.turnNumber}
                </span>
                <span className="text-xs text-teal-700 font-medium bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                  {ev.conceptCovered}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-stone-800">Accuracy: {ev.accuracyScore}%</span>
                <button
                  onClick={() => setExpandedTurn(isExpanded ? null : ev.turnNumber)}
                  className="p-1 rounded-md text-stone-400 hover:text-stone-600"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="text-xs space-y-1">
              <p className="font-medium text-stone-800">Q: {ev.question}</p>
              <p className="text-stone-600 line-clamp-2">A: {ev.answer}</p>
            </div>

            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="pt-3 border-t border-stone-100 space-y-3 text-xs"
              >
                <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-700 italic">
                  &ldquo;{ev.feedback}&rdquo;
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <span className="font-semibold text-teal-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Strengths
                    </span>
                    {ev.strengths.map((s, i) => (
                      <div key={i} className="p-1.5 bg-teal-50/50 border border-teal-100 text-teal-800 rounded-lg text-[11px]">
                        {s}
                      </div>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <span className="font-semibold text-amber-700 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Areas to Expand
                    </span>
                    {ev.gaps.length > 0 ? (
                      ev.gaps.map((g, i) => (
                        <div key={i} className="p-1.5 bg-amber-50/50 border border-amber-100 text-amber-800 rounded-lg text-[11px]">
                          {g}
                        </div>
                      ))
                    ) : (
                      <div className="p-1.5 bg-stone-50 text-stone-400 rounded-lg text-[11px]">None identified</div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ==========================================
// Sub-Component 4: Hiring Report Modal
// ==========================================
function AssessmentReportModal({
  totalScore,
  evaluations,
  domains,
  onClose
}: {
  totalScore: number;
  evaluations: TurnEvaluation[];
  domains: AssessmentDomain[];
  onClose: () => void;
}) {
  const recommendation = totalScore >= 75 ? 'Strong Hire' : totalScore >= 55 ? 'Follow-up Needed' : 'Needs Growth';
  const badgeColor = totalScore >= 75
    ? 'bg-teal-50 border-teal-200 text-teal-800'
    : totalScore >= 55
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-rose-50 border-rose-200 text-rose-800';

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white border border-stone-200 rounded-2xl max-w-xl w-full p-6 shadow-xl space-y-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Candidate Evaluation Summary</h2>
            <p className="text-xs text-stone-400">Target Role: Senior Enterprise AI Engineer</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badgeColor}`}>
            {recommendation}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <span className="text-xs text-stone-500 block">Overall Mastery</span>
            <span className="text-2xl font-mono font-bold text-teal-600">{totalScore} / 100</span>
          </div>
          <div className="p-4 bg-stone-50 border border-stone-200 rounded-xl">
            <span className="text-xs text-stone-500 block">Evaluated Turns</span>
            <span className="text-2xl font-mono font-bold text-stone-800">{evaluations.length} Turns</span>
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">Assessed Domains</h3>
          <div className="flex flex-wrap gap-2">
            {domains.map((d, i) => (
              <span key={i} className="px-3 py-1 bg-stone-100 text-stone-700 text-xs rounded-lg border border-stone-200">
                {d}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-2">
            <h4 className="font-semibold text-teal-700 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Key Strengths
            </h4>
            <ul className="space-y-1 text-stone-600 list-disc list-inside">
              <li>Solid grasp of chunking boundaries</li>
              <li>Good system resiliency considerations</li>
              <li>Understands vector distance metrics</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h4 className="font-semibold text-amber-700 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" /> Areas for Growth
            </h4>
            <ul className="space-y-1 text-stone-600 list-disc list-inside">
              <li>Needs deeper latency profiling metrics</li>
              <li>Expand on quantization (PQ vs HNSW)</li>
            </ul>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl border border-stone-200 text-stone-600 text-xs font-medium hover:bg-stone-50 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 text-white text-xs font-medium hover:bg-stone-900"
          >
            Close Report
          </button>
        </div>
      </motion.div>
    </div>
  );
}
