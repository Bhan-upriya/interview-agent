'use client';

import Link from 'next/link';
import { ArrowRight, Bot, Sparkles, ShieldCheck, Cpu } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Hero Badge */}
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-950/60 border border-blue-800/50 text-blue-400 text-xs font-medium mb-6 backdrop-blur-sm">
        <Sparkles className="w-3.5 h-3.5" />
        <span>Next-Gen Technical Evaluation</span>
      </div>

      {/* Main Title */}
      <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-400 via-indigo-200 to-indigo-400 bg-clip-text text-transparent max-w-2xl leading-tight">
        AI Technical Interview Platform
      </h1>

      <p className="text-slate-400 mt-4 max-w-lg text-sm md:text-base leading-relaxed">
        Simulate real-world technical assessments across Enterprise RAG, Vector Search, System Design, and LLMOps with adaptive scoring and automated feedback.
      </p>

      {/* Feature Pills */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-8 text-xs text-slate-400">
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Cpu className="w-4 h-4 text-blue-400" /> Real-time System Scoring
        </div>
        <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg">
          <ShieldCheck className="w-4 h-4 text-emerald-400" /> Instant Transcript Analysis
        </div>
      </div>

      {/* CTA Button */}
      <Link
        href="/interview"
        className="mt-10 px-8 py-4 bg-blue-600 hover:bg-blue-500 font-semibold rounded-xl flex items-center gap-2.5 transition-all shadow-lg shadow-blue-600/25 text-sm md:text-base hover:scale-[1.02] active:scale-[0.98]"
      >
        Launch Assessment Workspace <ArrowRight className="w-4 h-4" />
      </Link>
    </main>
  );
}