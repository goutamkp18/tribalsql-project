import React from 'react';
import { Layers, FileText, Code2, Globe2, Network, ArrowRight } from 'lucide-react';

interface MemoryInsightsCardProps {
  counts: {
    businessRules: number;
    sqlFixes: number;
    worldFacts: number;
    mentalModels: number;
  };
  onOpenMemoryInspector: () => void;
  status?: string;
}

export const MemoryInsightsCard: React.FC<MemoryInsightsCardProps> = ({
  counts,
  onOpenMemoryInspector,
  status = 'connected',
}) => {
  const isOffline = status === 'unavailable' || status === 'error';

  const items = [
    { label: 'Business Rules', count: counts.businessRules, icon: <FileText className="w-4 h-4 text-[#F45B0B]" /> },
    { label: 'SQL Fixes', count: counts.sqlFixes, icon: <Code2 className="w-4 h-4 text-[#F45B0B]" /> },
    { label: 'World Facts', count: counts.worldFacts, icon: <Globe2 className="w-4 h-4 text-[#F45B0B]" /> },
    { label: 'Mental Models', count: counts.mentalModels, icon: <Network className="w-4 h-4 text-[#F45B0B]" /> },
  ];

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
            <Layers className="w-4 h-4 text-[#F45B0B]" />
            <span>Memory Insights</span>
          </div>
          {isOffline && (
            <span className="text-[10px] font-semibold text-[#E5484D] bg-[#FEF2F2] border border-[#FECDD3] px-2 py-0.5 rounded-full">
              Offline
            </span>
          )}
        </div>

        {isOffline ? (
          <div className="py-6 text-center text-xs text-[#64748B]">
            Hindsight Cloud memory is currently offline. Connect API key to inspect live bank rules.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => (
              <div key={it.label} className="flex items-center justify-between text-xs py-1 border-b border-[#E4EAEA]/70 last:border-none">
                <div className="flex items-center gap-2.5">
                  {it.icon}
                  <span className="text-[#142337] font-medium">{it.label}</span>
                </div>
                <span className="font-bold text-[#142337] font-mono">
                  {it.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onOpenMemoryInspector}
        className="mt-5 w-full py-2.5 px-4 rounded-xl bg-[#F45B0B] hover:bg-[#DE4E04] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer active:scale-[0.98]"
      >
        <span>Open Memory Inspector</span>
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};
