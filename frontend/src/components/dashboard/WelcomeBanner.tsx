import React from 'react';
import { Rocket, Sparkles } from 'lucide-react';

export const WelcomeBanner: React.FC = () => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#171D38] via-[#151E30] to-[#121B2F] border border-slate-700/60 p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
      {/* Background soft glow accents */}
      <div className="absolute -left-10 -top-10 w-44 h-44 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -right-10 -bottom-10 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Left Title & Subtitle */}
      <div className="flex items-center gap-4 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500/25 to-pink-500/20 border border-purple-400/40 flex items-center justify-center text-purple-400 shadow-[0_0_20px_-3px_rgba(168,85,247,0.4)] shrink-0">
          <Rocket className="w-6 h-6 text-purple-300" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Welcome to <span className="bg-gradient-to-r from-purple-400 to-sky-400 bg-clip-text text-transparent">TribalSQL</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 font-normal">
            Ask, Query, Learn, and Build Institutional Database Knowledge with AI.
          </p>
        </div>
      </div>

      {/* Right Tagline Card */}
      <div className="relative z-10 px-4 py-2.5 rounded-xl bg-[#0F172A]/80 border border-sky-500/30 backdrop-blur-sm flex items-center gap-2.5 shadow-[0_0_15px_-4px_rgba(56,189,248,0.2)]">
        <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
        <div className="text-right sm:text-left">
          <p className="text-xs font-semibold text-slate-200">
            Every correction becomes knowledge.
          </p>
          <p className="text-[11px] text-sky-300/90 font-medium">
            Every query becomes smarter.
          </p>
        </div>
        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
      </div>
    </div>
  );
};

