import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon } from 'lucide-react';
import { QueryResultSegment } from '../../types';

interface QueryResultsDonutProps {
  data: QueryResultSegment[];
  successRate: number;
}

export const QueryResultsDonut: React.FC<QueryResultsDonutProps> = ({ data, successRate }) => {
  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  // If no queries yet, display an empty placeholder donut segment
  const chartSegments = total > 0 
    ? data 
    : [{ name: 'No queries', value: 1, color: '#E4EAEA' }];

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center gap-2 text-[#142337] font-bold text-sm mb-2">
        <PieIcon className="w-4 h-4 text-[#F45B0B]" />
        <span>Query Outcomes</span>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        {/* Donut chart with dynamic center count */}
        <div className="relative w-40 h-40 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartSegments}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                paddingAngle={total > 0 ? 3 : 0}
                dataKey="value"
                stroke="none"
              >
                {chartSegments.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-xl font-black text-[#142337]">{total}</span>
            <span className="text-[11px] text-[#64748B] font-medium">Queries</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 text-xs w-full sm:w-auto">
          {total === 0 ? (
            <div className="text-[11px] text-[#64748B] italic">
              No queries logged yet. Execute queries to see live outcome distribution.
            </div>
          ) : (
            data.map((item) => (
              <div key={item.name} className="flex items-center justify-between sm:justify-start gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-[#64748B] font-medium">{item.name}</span>
                </div>
                <span className="text-[#142337] font-bold font-mono">
                  {item.value}{' '}
                  <span className="text-[#94A3B8] font-normal">
                    ({total > 0 ? ((item.value / total) * 100).toFixed(1) : 0}%)
                  </span>
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
