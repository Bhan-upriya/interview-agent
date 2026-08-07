'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, User, Send, CheckCircle2, RefreshCw, FileText,
  ArrowRight, BarChart3, MessageSquare
} from 'lucide-react';
import { Message, TurnEvaluation, AssessmentDomain } from '@/types/interview';
import { Header } from '@/components/Header';
import { EvaluationModal } from '@/components/EvaluationModal';

// --- Domain Configurations ---
const DOMAINS: { id: AssessmentDomain; title: string; desc: string; icon: string; difficulty: string }[] = [
  { id: 'Enterprise RAG', title: 'Enterprise RAG', desc: 'Chunking, hybrid search, reranking & context windows', icon: '⚡', difficulty: 'Intermediate' },
  { id: 'Vector Search', title: 'Vector Search', desc: 'Embeddings, HNSW, quantization & distance metrics', icon: '🔍', difficulty: 'Advanced' },
  { id: 'Agent Orchestration', title: 'Agent Orchestration', desc: 'Tool calling, multi-agent flows & memory recovery', icon: '🤖', difficulty: 'Advanced' },
  { id: 'System Design', title: 'System Design', desc: 'Rate limiting, caching, latency & LLM resiliency', icon: '⚙️', difficulty: 'Expert' },
  { id: 'Fine-Tuning & LLMOps', title: 'Fine-Tuning & LLMOps', desc: 'LoRA, evaluation metrics, guardrails & tracking', icon: '🎯', difficulty: 'Advanced' },
];

export default function InterviewPage() {
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

  const [showModal, setShowModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // LocalStorage Persistence
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
      localStorage.setItem(
        'interview_session_v2',
        JSON.stringify({
          isStarted,
          selectedDomains,
          messages,
          evaluations,
          totalScore,
          lastAccuracy,
          recentFeedback,
          evaluatedBadges,
        })
      );
    }
  }, [isStarted, selectedDomains, messages, evaluations, totalScore, lastAccuracy, recentFeedback, evaluatedBadges]);

  const toggleDomain = (domainId: AssessmentDomain) => {
    setSelectedDomains((prev) =>
      prev.includes(domainId) ? prev.filter((d) => d !== domainId) : [...prev, domainId]
    );
  };

  const handleStart = () => {
    if (selectedDomains.length === 0) return;
    setIsStarted(true);

    setTotalScore(0);
    setLastAccuracy(0);
    setRecentFeedback('Assessment initiated. Awaiting candidate answer.');
    setEvaluatedBadges([]);

    const initialMsg: Message = {
      id: '1',
      role: 'assistant',
      content: `Welcome to your AI Technical Assessment! We will focus on: ${selectedDomains.join(', ')}. Let's start with Retrieval-Augmented Generation: How do you choose the right chunking strategy and embedding model for structured technical documents?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      turnNumber: 1,
    };
    setMessages([initialMsg]);
  };

  const handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    setIsStarted(false);
    setSelectedDomains([]);
    setMessages([]);
    setEvaluations([]);
    setTotalScore(0);
    setLastAccuracy(0);
    setRecentFeedback('Assessment initiated. Awaiting candidate answer.');
    setEvaluatedBadges([]);
    setShowModal(false);
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const currentTurn = messages.filter((m) => m.role === 'user').length + 1;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      turnNumber: currentTurn,
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
        turnNumber: currentTurn,
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
          gaps: ev.accuracyScore < 70 ? ['Missing operational detail', 'Skipped failure modes'] : [],
        };
        setEvaluations((prev) => [...prev, newEval]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Header with trigger for finish evaluation */}
      <Header onFinishInterview={() => setShowModal(true)} />

      {!isStarted ? (
        /* --- Domain Selector View --- */
        <div className="flex-1 overflow-y-auto p-6 md:p-12 max-w-5xl mx-auto w-full flex flex-col justify-center">
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Technical Assessment Setup
            </h1>
            <p className="text-slate-400 mt-2 text-sm">Select target domain topics to generate tailored interview questions.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {DOMAINS.map((domain) => {
              const isSelected = selectedDomains.includes(domain.id);
              return (
                <div
                  key={domain.id}
                  onClick={() => toggleDomain(domain.id)}
                  className={`p-5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/40 shadow-lg shadow-blue-500/10'
                      : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-2xl">{domain.icon}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                        {domain.difficulty}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-sm mb-1">{domain.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{domain.desc}</p>
                  </div>
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium">
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-blue-400 bg-blue-500' : 'border-slate-600'}`}>
                      {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                    </div>
                    <span className={isSelected ? 'text-blue-400' : 'text-slate-500'}>
                      {isSelected ? 'Selected' : 'Select domain'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleStart}
              disabled={selectedDomains.length === 0}
              className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 text-sm"
            >
              Start Technical Assessment <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* --- Active Interview Workspace --- */
        <div className="flex-1 flex overflow-hidden">
          {/* Main Chat / Workspace Panel */}
          <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-slate-800">
            {/* View Switcher Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('interview')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                    activeTab === 'interview' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Live Assessment
                </button>
                <button
                  onClick={() => setActiveTab('transcript')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all ${
                    activeTab === 'transcript' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" /> Evaluations ({evaluations.length})
                </button>
              </div>

              <button
                onClick={handleReset}
                className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reset Session
              </button>
            </div>

            {/* Live Chat Tab */}
            {activeTab === 'interview' ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex gap-4 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/40 flex items-center justify-center shrink-0">
                          <Bot className="w-4 h-4 text-blue-400" />
                        </div>
                      )}

                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-blue-600 text-white rounded-tr-none'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>
                        <span className="text-[10px] opacity-60 mt-2 block text-right">{m.timestamp}</span>
                      </div>

                      {m.role === 'user' && (
                        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          <User className="w-4 h-4 text-slate-300" />
                        </div>
                      )}
                    </div>
                  ))}

                  {loading && (
                    <div className="flex items-center gap-3 text-slate-400 text-xs py-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" /> Analyzing answer & updating metrics...
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/40 flex gap-3">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type your response..."
                    disabled={loading}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={loading || !input.trim()}
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-medium rounded-xl text-white transition-all flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            ) : (
              /* Evaluations Tab */
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {evaluations.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-12">No turn evaluations available yet.</p>
                ) : (
                  evaluations.map((ev, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-400">
                        <span className="font-semibold text-blue-400">Turn #{ev.turnNumber}</span>
                        <span>Accuracy Score: {ev.accuracyScore}%</span>
                      </div>
                      <div className="text-xs text-slate-300">
                        <strong>Q:</strong> {ev.question}
                      </div>
                      <div className="text-xs text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <strong>A:</strong> {ev.answer}
                      </div>
                      <p className="text-xs text-slate-300 font-medium">{ev.feedback}</p>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Right Metrics Scorecard */}
          <div className="w-80 bg-slate-900/30 p-6 hidden lg:flex flex-col gap-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">Realtime Metrics</h3>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-3">
                <span className="text-xs text-slate-400">Total Score</span>
                <div className="text-3xl font-bold text-blue-400 mt-1">{totalScore}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className="text-xs text-slate-400">Last Response Accuracy</span>
                <div className="text-2xl font-bold text-slate-200 mt-1">{lastAccuracy}%</div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Evaluated Concepts</h3>
              <div className="flex flex-wrap gap-1.5">
                {evaluatedBadges.length === 0 ? (
                  <span className="text-xs text-slate-500">No badges earned yet</span>
                ) : (
                  evaluatedBadges.map((badge, i) => (
                    <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-blue-950 text-blue-300 border border-blue-800/50">
                      {badge}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="mt-auto">
              <button
                onClick={() => setShowModal(true)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-2"
              >
                <BarChart3 className="w-4 h-4" /> Generate Final Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pop-up Modal when interview finishes or report button is clicked */}
      {showModal && (
        <EvaluationModal onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}