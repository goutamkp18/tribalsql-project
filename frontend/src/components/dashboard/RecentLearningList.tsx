import React from 'react';
import { BookOpen, CheckCircle2, RefreshCw, PlusCircle, ArrowRight, BrainCircuit } from 'lucide-react';

interface RecentLearningListProps {
  items: {
    id: string;
    rule: string;
    status: string;
    timestamp: string;
    type: string;
  }[];
  onViewAll: () => void;
  onSelectRule?: (rule: string) => void;
}

export const RecentLearningList: React.FC<RecentLearningListProps> = ({
  items,
  onViewAll,
  onSelectRule,
}) => {
  const getIcon = (idx: number) => {
    if (idx === 0) return <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />;
    if (idx === 1) return <RefreshCw className="w-4 h-4 text-[#F45B0B]" />;
    return <PlusCircle className="w-4 h-4 text-[#F45B0B]" />;
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
          <BookOpen className="w-4 h-4 text-[#F45B0B]" />
          <span>Recent Learning Activity</span>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-[#F45B0B] hover:text-[#DE4E04] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="py-8 flex flex-col items-center justify-center text-center">
          <BrainCircuit className="w-8 h-8 text-[#A8C9C8] mb-2 stroke-[1.5]" />
          <p className="text-xs font-semibold text-[#142337]">No learning events yet</p>
          <p className="text-[11px] text-[#64748B] mt-0.5">
            Submit a human correction or business rule to retain institutional memory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div
              key={item.id}
              onClick={() => onSelectRule && onSelectRule(item.rule)}
              className="p-2.5 rounded-xl hover:bg-[#F5F7F7] border border-transparent hover:border-[#E4EAEA] transition-all cursor-pointer group flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0">
                  {getIcon(idx)}
                </span>
                <p className="text-xs font-medium text-[#142337] truncate group-hover:text-[#F45B0B] transition-colors">
                  {item.rule}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-semibold text-[#16A36A] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full">
                  {item.status}
                </span>
                <span className="text-[10px] text-[#64748B] whitespace-nowrap">{item.timestamp}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
