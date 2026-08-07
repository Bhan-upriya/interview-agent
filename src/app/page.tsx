'use client';

import { useState } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function InterviewerPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the ABTalks AI Technical Assessment. I am your interviewer today. Let us start with Retrieval-Augmented Generation (RAG). Can you explain how chunking strategy and embedding model selection impact retrievability in enterprise RAG systems?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTopic, setCurrentTopic] = useState('RAG Architecture');

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
          topic: currentTopic,
        }),
      });

      const data = await res.json();
      setMessages([...updatedMessages, { role: 'assistant', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages([
        ...updatedMessages,
        { role: 'assistant', content: 'Connection issue. Please re-enter your response.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <header className="w-full max-w-4xl flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-indigo-400">ABTalks AI Interviewer</h1>
          <p className="text-xs text-slate-400">Target Domain: Enterprise AI Engineering</p>
        </div>
        <div className="bg-indigo-950/80 border border-indigo-700/50 px-3 py-1 rounded-full text-xs text-indigo-300">
          Active Topic: {currentTopic}
        </div>
      </header>

      {/* Chat Container */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl flex-1 flex flex-col overflow-hidden h-[650px] shadow-2xl">
        {/* Messages Scroll View */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
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
                Evaluating answer & formulating follow-up question...
              </div>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-950/50 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your technical answer here..."
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
    </main>
  );
}