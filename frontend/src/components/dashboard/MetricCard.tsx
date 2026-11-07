import React from 'react';
import { motion } from 'framer-motion';

export interface MetricCardProps {
  title: string;
  value: string | number;
  delta: string;
  icon: React.ReactNode;
  accent: 'cyan' | 'emerald' | 'violet' | 'amber' | 'powder' | 'orange';
  delay?: number;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  delta,
  icon,
  accent,
  delay = 0,
}) => {
  // Map accents to powder blue vs peach/orange icons matching reference image
  const isTeal = accent === 'cyan' || accent === 'powder' || title.includes('Total') || title.includes('Corrections');

  const iconContainerClass = isTeal
    ? 'bg-[#EAF3F3] text-[#1E5755] border border-[#A8C9C8]/50'
    : 'bg-[#FEECE3] text-[#F45B0B] border border-[#FCD2C0]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
      className="p-5 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex items-center justify-between"
    >
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${iconContainerClass}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs font-semibold text-[#64748B]">{title}</p>
          <div className="flex items-baseline gap-2.5 mt-1">
            <span className="text-2xl font-black text-[#142337] tracking-tight">{value}</span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#FEECE3] text-[#F45B0B] border border-[#FCD2C0] flex items-center gap-0.5">
              <span>↑</span> {delta}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
