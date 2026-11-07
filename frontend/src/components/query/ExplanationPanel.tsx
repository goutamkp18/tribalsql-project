import React from 'react';
import { HelpCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface ExplanationPanelProps {
  explanation: string;
  businessRules: string[];
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({
  explanation,
  businessRules,
}) => {
  return (
    <div className="rounded-2xl bg-white border border-[#E4EAEA] p-5 shadow-xs space-y-4">
      <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
        <HelpCircle className="w-4 h-4 text-[#F45B0B]" />
        <span>Query Logic & Institutional Explanation</span>
      </div>

      <p className="text-xs text-[#64748B] leading-relaxed font-normal">
        {explanation}
      </p>

      {businessRules.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-[#E4EAEA]">
          <h4 className="text-xs font-bold text-[#142337] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#F45B0B]" />
            <span>Applied Corporate Rules</span>
          </h4>
          <div className="space-y-1.5">
            {businessRules.map((r, i) => (
              <div key={i} className="flex items-start gap-2 text-xs text-[#142337] bg-[#F5F7F7] p-2.5 rounded-xl border border-[#E4EAEA]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] mt-0.5 shrink-0" />
                <span>{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
