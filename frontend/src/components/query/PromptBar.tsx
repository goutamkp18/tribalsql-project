import React from 'react';
import { Search, Sparkles, Send, ArrowRight, BrainCircuit, ShieldAlert, Check } from 'lucide-react';
import { Button } from '../common/Button';

interface PromptBarProps {
  query: string;
  onChange: (value: string) => void;
  onSubmit: (query: string) => void;
  isLoading: boolean;
  onSelectSuggestion: (suggestion: string) => void;
  useMemory: boolean;
  onToggleMemory: (val: boolean) => void;
}

export const PromptBar: React.FC<PromptBarProps> = ({
  query,
  onChange,
  onSubmit,
  isLoading,
  onSelectSuggestion,
  useMemory,
  onToggleMemory,
}) => {
  const suggestedQueries = [
    { text: 'Calculate net revenue from premium customers.', isBenchmark: true },
    { text: 'Which five products generated the highest revenue?', isBenchmark: false },
    { text: 'Show monthly sales for the previous quarter.', isBenchmark: false },
    { text: 'Which products have the highest refund rate?', isBenchmark: false },
    { text: 'Compare revenue across customer segments.', isBenchmark: false },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmit(query.trim());
    }
  };

  return (
    <div className="space-y-3">
      {/* Memory Mode Switcher Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleMemory(!useMemory)}
            disabled={isLoading}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer border shadow-2xs ${
              useMemory 
                ? 'bg-[#EAF3F3] text-[#1E5755] border-[#A8C9C8] hover:bg-[#d5e6e6]' 
                : 'bg-[#FEF2F2] text-[#E5484D] border-[#FECDD3] hover:bg-[#FEE2E2]'
            }`}
          >
            <BrainCircuit className={`w-3.5 h-3.5 ${useMemory ? 'text-[#F45B0B]' : 'text-[#E5484D]'}`} />
            <span>Hindsight Memory: <strong>{useMemory ? 'ON (Learned Playbook)' : 'OFF (Cold Start)'}</strong></span>
            <span className={`w-2 h-2 rounded-full ${useMemory ? 'bg-[#16A36A] animate-pulse' : 'bg-[#E5484D]'}`} />
          </button>

          <span className="text-[11px] text-[#64748B] hidden sm:inline">
            {useMemory 
              ? 'Applies company tribal knowledge, QA exclusions, and refund rules ($5,650)' 
              : 'Baseline raw schema query without memory (Schema traps active: $78,150)'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
          <span className="font-semibold text-[#142337]">Engine:</span>
          <span className="font-mono bg-white px-2 py-0.5 rounded border border-[#E4EAEA]">Groq + PostgreSQL</span>
        </div>
      </div>

      {/* Search Input Box */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-center bg-white border-2 border-[#E4EAEA] focus-within:border-[#F45B0B] rounded-2xl shadow-xs overflow-hidden transition-all duration-200">
          <div className="pl-5 pr-2 text-[#64748B]">
            <Search className="w-5 h-5 text-[#F45B0B]" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Ask anything about NovaMart's database in plain English..."
            disabled={isLoading}
            className="w-full py-4 px-2 bg-transparent text-[#142337] placeholder-[#94A3B8] text-sm sm:text-base focus:outline-none font-medium"
          />
          <div className="pr-3 pl-2 flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
              disabled={!query.trim()}
              rightIcon={<Send className="w-4 h-4 ml-1" />}
            >
              <span className="hidden sm:inline">
                {useMemory ? 'Ask TribalSQL (Learned)' : 'Ask (Cold Start)'}
              </span>
            </Button>
          </div>
        </div>
      </form>

      {/* Suggested Questions */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        <span className="text-xs text-[#64748B] flex items-center gap-1 shrink-0 font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-[#F45B0B]" />
          <span>Suggested:</span>
        </span>
        {suggestedQueries.map((item) => (
          <button
            key={item.text}
            type="button"
            onClick={() => onSelectSuggestion(item.text)}
            className={`text-xs px-3.5 py-1.5 rounded-full whitespace-nowrap transition-all cursor-pointer shrink-0 flex items-center gap-1.5 font-medium shadow-2xs border ${
              item.isBenchmark
                ? 'bg-[#FEECE3] hover:bg-[#fcdccf] text-[#F45B0B] border-[#FCD2C0] font-bold ring-1 ring-[#F45B0B]/20'
                : 'bg-white hover:bg-[#EAF3F3] text-[#142337] hover:text-[#1E5755] border-[#E4EAEA] hover:border-[#A8C9C8]'
            }`}
          >
            {item.isBenchmark && <span className="text-[10px] bg-[#F45B0B] text-white px-1.5 py-0.2 rounded font-bold">TRAP BENCHMARK</span>}
            <span>{item.text}</span>
            <ArrowRight className="w-3 h-3 text-[#94A3B8] group-hover:text-[#F45B0B]" />
          </button>
        ))}
      </div>
    </div>
  );
};
