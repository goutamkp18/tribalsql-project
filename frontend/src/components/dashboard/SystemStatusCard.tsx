import React from 'react';
import { Activity, Database, Cloud, Zap } from 'lucide-react';
import { SystemStatus } from '../../types';

interface SystemStatusCardProps {
  status: SystemStatus;
}

export const SystemStatusCard: React.FC<SystemStatusCardProps> = ({ status }) => {
  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 text-[#142337] font-bold text-sm mb-4">
        <Activity className="w-4 h-4 text-[#F45B0B]" />
        <span>System Status</span>
      </div>

      <div className="space-y-3.5">
        {/* PostgreSQL */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
          <div className="flex items-center gap-2.5">
            <Database className="w-4 h-4 text-[#F45B0B]" />
            <div>
              <p className="text-xs font-bold text-[#142337]">PostgreSQL (NovaMart)</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
            <span className="text-[11px] font-semibold text-[#16A36A]">{status.postgresql.label}</span>
          </div>
        </div>

        {/* Hindsight Cloud */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-[#F45B0B]" />
            <div>
              <p className="text-xs font-bold text-[#142337]">Hindsight Cloud</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
            <span className="text-[11px] font-semibold text-[#16A36A]">{status.hindsight.label}</span>
          </div>
        </div>

        {/* Groq LLM */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
          <div className="flex items-center gap-2.5">
            <Zap className="w-4 h-4 text-[#F45B0B] fill-[#F45B0B]" />
            <div>
              <p className="text-xs font-bold text-[#142337]">Groq LLM ({status.groq.model})</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
            <span className="text-[11px] font-semibold text-[#16A36A]">{status.groq.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
