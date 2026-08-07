'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface EvaluationData {
  scoreDelta: number;
  conceptCovered: string;
  feedback: string;
  accuracyScore: number;
}

export default function InterviewerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the ABTalks AI Assessment. I am your technical interviewer. Let us start with Retrieval-Augmented Generation (RAG). Can you explain how chunking strategy and embedding model selection impact retrieval recall in enterprise RAG systems?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalScore, setTotalScore] = useState(35);
  const [lastAccuracy, setLastAccuracy] = useState(80);
  const [concepts, setConcepts] = useState<string[]>(['RAG Fundamentals']);
  const [recentFeedback, setRecentFeedback] = useState<string>('Assessment initiated. Awaiting response.');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages,
          topic: 'Enterprise AI Engineering',
        }),
      });

      const data = await res.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);

      if (data.evaluation) {
        const evalData: EvaluationData = data.evaluation;
        setTotalScore((prev) => Math.max(0, Math.min(100, prev + evalData.scoreDelta)));
        setLastAccuracy(evalData.accuracyScore);
        setRecentFeedback(evalData.feedback);
        if (evalData.conceptCovered && !concepts.includes(evalData.conceptCovered)) {
          setConcepts((prev) => [...prev, evalData.conceptCovered]);
        }
      }
    } catch (err) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Connection issue. Please retry.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6">
      {/* Top Header */}
      <header className="max-w-7xl w-full mx-auto flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">ABTalks AI Interview Agent</h1>
          <p className="text-xs text-slate-400">Problem Statement 2: Interactive AI Assessment Agent</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">Candidate Evaluation:</span>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-3 py-1 rounded-full text-xs font-semibold">
            Status: Active
          </span>
        </div>
      </header>

      {/* Main Grid: Chat Left + Dashboard Right */}
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        {/* Chat Area (2 Columns) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl flex flex-col h-[680px] shadow-2xl overflow-hidden">
          {/* Scrollable Chat */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-br-none'
                      : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                  }`}
                >
                  <div className="text-[10px] font-semibold mb-1 opacity-70 uppercase tracking-wider">
                    {msg.role === 'user' ? 'Candidate' : 'AI Interviewer'}
                  </div>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-xs text-slate-400 animate-pulse">
                  Evaluating depth & generating dynamic follow-up...
                </div>
              </div>
            )}
          </div>

          {/* Form Input */}
          <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/60 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your technical answer..."
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-6 py-3 rounded-lg text-sm transition-colors"
            >
              Submit
            </button>
          </form>
        </div>

        {/* Live Metrics Sidebar (1 Column) */}
        <div className="space-y-4">
          {/* Score Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">
              Overall Technical Mastery
            </h2>
            <div className="flex items-baseline justify-between mb-2">
              <span className="text-3xl font-extrabold text-indigo-400">{totalScore} / 100</span>
              <span className="text-xs text-slate-400">Target Pass: 75</span>
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-500"
                style={{ width: `${totalScore}%` }}
              ></div>
            </div>
          </div>

          {/* Technical Accuracy Gauge */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
              Last Response Accuracy
            </h2>
            <div className="text-2xl font-bold text-emerald-400 mb-1">{lastAccuracy}%</div>
            <p className="text-xs text-slate-400">
              Evaluated based on technical correctness and architectural depth.
            </p>
          </div>

          {/* Real-time Feedback */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
              Interviewer Critique
            </h2>
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-300 leading-relaxed italic">
              "{recentFeedback}"
            </div>
          </div>

          {/* Covered Concepts */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
            <h2 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-3">
              Evaluated Domains
            </h2>
            <div className="flex flex-wrap gap-2">
              {concepts.map((c, idx) => (
                <span
                  key={idx}
                  className="bg-indigo-950/80 border border-indigo-700/50 text-indigo-300 text-xs px-2.5 py-1 rounded-md"
                >
                  ✓ {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}