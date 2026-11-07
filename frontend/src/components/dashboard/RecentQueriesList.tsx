import React from 'react';
import { Clock, ArrowRight } from 'lucide-react';
import { QueryHistoryItem } from '../../types';

interface RecentQueriesListProps {
  queries: QueryHistoryItem[];
  onSelectQuery: (query: string) => void;
  onViewAll: () => void;
}

export const RecentQueriesList: React.FC<RecentQueriesListProps> = ({
  queries,
  onSelectQuery,
  onViewAll,
}) => {
  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between h-full">
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
          <Clock className="w-4 h-4 text-[#F45B0B]" />
          <span>Recent Queries</span>
        </div>
        <button
          onClick={onViewAll}
          className="text-xs text-[#F45B0B] hover:text-[#DE4E04] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
        >
          <span>View All</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-[#E4EAEA] text-[#64748B] font-semibold">
              <th className="py-2 px-2 w-8">#</th>
              <th className="py-2 px-2">Query</th>
              <th className="py-2 px-2">Status</th>
              <th className="py-2 px-2 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E4EAEA]/70">
            {queries.map((q, idx) => (
              <tr
                key={q.id}
                onClick={() => onSelectQuery(q.query)}
                className="hover:bg-[#F5F7F7] transition-colors cursor-pointer group"
              >
                <td className="py-2.5 px-2 text-[#64748B] font-medium">{idx + 1}</td>
                <td className="py-2.5 px-2 font-medium text-[#142337] group-hover:text-[#F45B0B] transition-colors line-clamp-1 max-w-[210px]">
                  {q.query}
                </td>
                <td className="py-2.5 px-2 whitespace-nowrap">
                  {q.status === 'success' ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#16A36A] bg-[#ECFDF5] border border-[#A7F3D0] px-2 py-0.5 rounded-full">
                      ✓ Success
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#E5484D] bg-[#FEF2F2] border border-[#FECDD3] px-2 py-0.5 rounded-full">
                      ✕ Failed
                    </span>
                  )}
                </td>
                <td className="py-2.5 px-2 text-right text-[11px] text-[#64748B] whitespace-nowrap">
                  {q.timestamp}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
