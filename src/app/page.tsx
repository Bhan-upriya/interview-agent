'use client';

import React, { useState } from 'react';
import { Sparkles, ArrowLeft, Send, RotateCcw, BarChart3, Zap, Search, Bot, Settings, Target } from 'lucide-react';
export default function Home() {
  const [isStarted, setIsStarted] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [totalScore, setTotalScore] = useState(15);
  const [lastAccuracy, setLastAccuracy] = useState(88);

  // Available domains list matching your clean UI style


  // Inside your component:
  const domains = [
    { id: 'enterprise-rag', title: 'Enterprise RAG', subtitle: 'Chunking, hybrid search, reasoning & context windows', level: 'Intermediate', icon: <Zap className="w-5 h-5 text-amber-500" /> },
    { id: 'vector-search', title: 'Vector Search', subtitle: 'Embeddings, HNSW, quantization & distance metrics', level: 'Advanced', icon: <Search className="w-5 h-5 text-blue-500" /> },
    { id: 'agent-orchestration', title: 'Agent Orchestration', subtitle: 'Tool calling, multi-agent flows & memory recovery', level: 'Advanced', icon: <Bot className="w-5 h-5 text-purple-500" /> },
    { id: 'system-design', title: 'System Design', subtitle: 'Rate limiting, caching, latency & LLM resiliency', level: 'Expert', icon: <Settings className="w-5 h-5 text-emerald-500" /> },
    { id: 'fine-tuning', title: 'Fine-Tuning & LLMOps', subtitle: 'LoRA, evaluation metrics, guardrails & tracking', level: 'Advanced', icon: <Target className="w-5 h-5 text-rose-500" /> },
  ];

  // Start Interview & Fetch Dynamic First Question based on selected domain
  const handleStartDomain = async (domainTitle: string) => {
    setSelectedDomain(domainTitle);
    setIsStarted(true);
    setLoading(true);
    localStorage.clear();
    sessionStorage.clear();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: domainTitle, action: 'start' }),
      });
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.question || `Welcome to your AI Technical Assessment on ${domainTitle}! Let's begin.` }]);
    } catch {
      setMessages([{ role: 'assistant', content: `Welcome to your AI Technical Assessment on ${domainTitle}! Let's begin.` }]);
    } finally {
      setLoading(false);
    }
  };

  // Reset Session & Return to Domain Selector
  const handleReset = () => {
    localStorage.clear();
    sessionStorage.clear();
    setIsStarted(false);
    setSelectedDomain('');
    setMessages([]);
    setShowModal(false);
  };

  // Send candidate answer and get next domain-specific question
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMsg = inputMessage;
    setInputMessage('');
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domain: selectedDomain, messages: newMessages }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.reply }]);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: "Error communicating with interviewer API." }]);
    } finally {
      setLoading(false);
    }
  };

  // --- 1. DOMAIN SELECTION SCREEN ---
  if (!isStarted) {
    return (
      <div className="min-h-screen bg-[#FAFAF8] text-stone-800 flex flex-col items-center justify-center p-6">
        <div className="max-w-3xl w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" /> AI Candidate Evaluation Platform
            </div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Welcome! Let&apos;s find the right challenge for you.
            </h1>
            <p className="text-stone-500 text-sm md:text-base max-w-xl mx-auto">
              Select one or more domain focus areas below to tailor your interactive technical assessment.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {domains.map((d) => (
              <div
                key={d.id}
                onClick={() => handleStartDomain(d.title)}
                className="group relative bg-white border border-stone-200 p-6 rounded-xl hover:border-stone-400 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-stone-50 rounded-lg border border-stone-100">{d.icon}</div>
                      <h3 className="font-semibold text-lg text-stone-900 group-hover:text-teal-700 transition-colors">{d.title}</h3>
                    </div>
                    <span className="text-[10px] uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium">{d.level}</span>
                  </div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-lg text-stone-900 group-hover:text-teal-700 transition-colors">{d.title}</h3>
                    <span className="text-[10px] uppercase tracking-wider bg-stone-100 text-stone-600 px-2 py-0.5 rounded font-medium">{d.level}</span>
                  </div>
                  <p className="text-xs text-stone-500">{d.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- 2. INTERVIEW WORKSPACE SCREEN ---
  return (
    <div className="flex flex-col h-screen bg-[#FAFAF8] text-stone-800">

      {/* Top Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-white">
        <button
          onClick={handleReset}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 transition-colors font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Domains
        </button>

        <div className="text-center">
          <h1 className="font-semibold text-base text-stone-900">ABTalks Technical Interview</h1>
          <p className="text-xs text-stone-500">Active Domain: <span className="font-medium text-teal-700">{selectedDomain}</span></p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="bg-amber-600 hover:bg-amber-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          End Assessment
        </button>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6">

        {/* Chat / Conversation Area */}
        <div className="flex-1 bg-white border border-stone-200 rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, idx) => (
              <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-xl text-sm ${m.role === 'user' ? 'bg-stone-900 text-white' : 'bg-stone-100 text-stone-800'}`}>
                  {m.content}
                </div>
              </div>
            ))}
            {loading && <div className="text-xs text-stone-400 italic">Interviewer is evaluating...</div>}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-200 flex gap-2 bg-white">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder={`Type your technical response regarding ${selectedDomain}...`}
              className="flex-1 border border-stone-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-stone-400"
            />
            <button type="submit" className="bg-teal-700 hover:bg-teal-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Metric Panel */}
        <div className="w-80 hidden lg:flex flex-col gap-4">
          <div className="bg-white border border-stone-200 p-5 rounded-xl shadow-sm space-y-4">
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase">Overall Technical Mastery</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-bold">{totalScore}</span>
                <span className="text-xs text-stone-400">/ 100</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full mt-2 overflow-hidden">
                <div className="bg-teal-600 h-full rounded-full" style={{ width: `${totalScore}%` }} />
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-stone-500 uppercase">Last Turn Accuracy</p>
              <p className="text-xl font-semibold mt-1">{lastAccuracy}%</p>
            </div>

            <button
              onClick={handleReset}
              className="w-full text-stone-500 hover:text-stone-800 text-xs flex items-center justify-center gap-1.5 pt-2 border-t border-stone-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Restart Session & Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* Evaluation Summary Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-xl max-w-md w-full space-y-4 shadow-xl">
            <h2 className="text-lg font-bold">Candidate Evaluation Summary</h2>
            <p className="text-sm text-stone-600">You have completed the assessment for <strong>{selectedDomain}</strong>.</p>
            <div className="p-4 bg-stone-50 rounded-lg">
              <p className="text-sm font-semibold">Final Mastery Score: {totalScore} / 100</p>
            </div>
            <button
              onClick={handleReset}
              className="w-full bg-stone-900 hover:bg-stone-800 text-white py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Close Report & Choose New Domain
            </button>
          </div>
        </div>
      )}
    </div>
  );
}