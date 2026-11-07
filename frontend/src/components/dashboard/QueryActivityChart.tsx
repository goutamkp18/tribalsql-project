import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid 
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { QueryActivityPoint } from '../../types';

interface QueryActivityChartProps {
  data: QueryActivityPoint[];
}

export const QueryActivityChart: React.FC<QueryActivityChartProps> = ({ data }) => {
  const maxQueries = Math.max(...data.map(d => d.queries || 0), 0);
  const yUpper = Math.max(10, Math.ceil((maxQueries + 2) / 5) * 5);

  // Peak activity day
  const peakDay = [...data].sort((a, b) => (b.queries || 0) - (a.queries || 0))[0];

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
          <TrendingUp className="w-4 h-4 text-[#F45B0B]" />
          <span>Query Activity</span>
        </div>
        <div className="px-2.5 py-1 rounded-lg bg-white border border-[#E4EAEA] shadow-2xs text-[11px] text-[#142337] font-medium">
          {peakDay && peakDay.queries > 0 ? (
            <>
              <span className="text-[#64748B]">{peakDay.day}: </span>
              <span className="font-bold text-[#F45B0B]">{peakDay.queries} queries</span>
            </>
          ) : (
            <span className="text-[#64748B]">Real-time telemetry</span>
          )}
        </div>
      </div>

      <div className="h-56 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
            No activity recorded yet for this period.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="orangeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F45B0B" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#F45B0B" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4EAEA" vertical={false} />
              <XAxis 
                dataKey="day" 
                stroke="#94A3B8" 
                fontSize={11} 
                tickLine={false}
                axisLine={{ stroke: '#E4EAEA' }}
              />
              <YAxis 
                stroke="#94A3B8" 
                fontSize={11} 
                tickLine={false}
                axisLine={false}
                domain={[0, yUpper]}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const item = payload[0].payload as QueryActivityPoint;
                    return (
                      <div className="bg-white border border-[#E4EAEA] p-3 rounded-xl shadow-md text-xs">
                        <p className="font-bold text-[#142337] mb-1">{item.day}</p>
                        <p className="text-[#F45B0B] font-semibold">{item.queries} total queries</p>
                        <p className="text-[#16A36A] font-medium">{item.successful} successful</p>
                        {item.failed > 0 && <p className="text-[#E5484D] font-medium">{item.failed} failed</p>}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="queries"
                stroke="#F45B0B"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#orangeGradient)"
                dot={{ r: 4, fill: '#F45B0B', stroke: '#FFFFFF', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#F45B0B', stroke: '#FFFFFF', strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
