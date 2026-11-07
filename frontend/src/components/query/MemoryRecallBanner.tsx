import React from 'react';
import { BrainCircuit, Sparkles, CheckCircle2, ChevronRight, ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';
import { RetainedMemory } from '../../types';

interface MemoryRecallBannerProps {
  recalledMemories: RetainedMemory[];
  rulesUsed: string[];
  onOpenMemoryDetails?: (mem: RetainedMemory) => void;
  useMemory?: boolean;
}

export const MemoryRecallBanner: React.FC<MemoryRecallBannerProps> = ({
  recalledMemories,
  rulesUsed,
  onOpenMemoryDetails,
  useMemory = true,
}) => {
  // If memory is explicitly OFF (Cold Start mode)
  if (!useMemory) {
    return (
      <div className="rounded-2xl bg-[#FEF2F2] border-2 border-[#FECDD3] p-5 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#FECDD3] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-white border border-[#FECDD3] text-[#E5484D]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-[#E5484D] tracking-tight flex items-center gap-1.5">
                <span>Cold Start Mode (Hindsight Memory Disabled)</span>
                <span className="text-[10px] font-semibold bg-white text-[#E5484D] border border-[#FECDD3] px-2 py-0.5 rounded-full">
                  0 Rules Applied
                </span>
              </h3>
              <p className="text-[11px] text-[#E5484D]/80">
                Agent is querying raw PostgreSQL schema DDL without historical memory or company tribal knowledge.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#E5484D] bg-white border border-[#FECDD3] px-2.5 py-1 rounded-full font-bold">
            <AlertTriangle className="w-3.5 h-3.5 text-[#E5484D]" />
            <span>Schema Traps Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px]">
          <div className="p-2.5 rounded-xl bg-white border border-[#FECDD3] text-[#991B1B]">
            <p className="font-bold">❌ Deprecated Column Trap</p>
            <p className="text-[10px] text-[#64748B] mt-0.5">Used `account_type = 'premium'` instead of GOLD tier / LTV &ge; $50k.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-[#FECDD3] text-[#991B1B]">
            <p className="font-bold">❌ Internal QA Accounts Trap</p>
            <p className="text-[10px] text-[#64748B] mt-0.5">Included `@novamart-test.com` accounts ($75k fake test orders).</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-[#FECDD3] text-[#991B1B]">
            <p className="font-bold">❌ Order Status Trap</p>
            <p className="text-[10px] text-[#64748B] mt-0.5">Included CANCELLED and PENDING orders.</p>
          </div>
          <div className="p-2.5 rounded-xl bg-white border border-[#FECDD3] text-[#991B1B]">
            <p className="font-bold">❌ Refund Trap</p>
            <p className="text-[10px] text-[#64748B] mt-0.5">Ignored refund deductions from `refunds` table.</p>
          </div>
        </div>
      </div>
    );
  }

  if (recalledMemories.length === 0) return null;

  return (
    <div className="rounded-2xl bg-[#EAF3F3] border border-[#A8C9C8] p-5 shadow-xs space-y-4">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#A8C9C8]/50 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-white border border-[#A8C9C8] text-[#F45B0B]">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-[#142337] tracking-tight flex items-center gap-1.5">
              <span>Hindsight Memories Recalled</span>
              <span className="text-[10px] font-semibold bg-white text-[#1E5755] border border-[#A8C9C8] px-2 py-0.5 rounded-full">
                {recalledMemories.length} Active Rules
              </span>
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Institutional intelligence applied automatically from Hindsight Cloud bank novamart-prod-db
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-[#16A36A] bg-white border border-[#A7F3D0] px-2.5 py-1 rounded-full font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Hindsight Verified</span>
        </div>
      </div>

      {/* Recalled Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {recalledMemories.map((mem) => (
          <div
            key={mem.id}
            onClick={() => onOpenMemoryDetails && onOpenMemoryDetails(mem)}
            className="p-3.5 rounded-xl bg-white border border-[#A8C9C8]/60 hover:border-[#F45B0B] transition-all cursor-pointer group flex flex-col justify-between shadow-2xs"
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs font-bold text-[#142337] group-hover:text-[#F45B0B] transition-colors">
                  {mem.title}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#F45B0B] bg-[#FEECE3] border border-[#FCD2C0] px-1.5 py-0.5 rounded">
                  {Math.round(mem.confidenceScore * 100)}% match
                </span>
              </div>
              <p className="text-[11px] text-[#64748B] line-clamp-2 leading-relaxed font-normal">
                {mem.ruleText}
              </p>
            </div>

            <div className="mt-2.5 pt-2 border-t border-[#E4EAEA] flex items-center justify-between text-[10px] text-[#64748B]">
              <span>By {mem.author}</span>
              <span className="flex items-center gap-1 text-[#F45B0B] font-semibold group-hover:translate-x-0.5 transition-transform">
                <span>View Memory</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Business Rules Checklist */}
      {rulesUsed.length > 0 && (
        <div className="pt-2 border-t border-[#A8C9C8]/50 flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-[#142337] font-bold flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#F45B0B]" />
            Applied Guardrails:
          </span>
          {rulesUsed.map((rule, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-white text-[#142337] border border-[#A8C9C8]/60 px-2.5 py-0.5 rounded-md flex items-center gap-1.5 font-medium shadow-2xs"
            >
              <CheckCircle2 className="w-3 h-3 text-[#16A36A]" />
              <span>{rule}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
