import React, { useState } from 'react';
import { 
  Table, 
  BarChart2, 
  Download, 
  ArrowUpDown, 
  Clock, 
  Database,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts';

interface ResultsTableProps {
  columns: string[];
  rows: Record<string, any>[];
  executionTimeMs?: number;
  rowCount?: number;
  chartSuggestion?: {
    type: 'bar' | 'line' | 'pie';
    xKey: string;
    yKey: string;
    title: string;
  };
  demoNotice?: string;
}

export const ResultsTable: React.FC<ResultsTableProps> = ({
  columns,
  rows,
  executionTimeMs = 142,
  rowCount,
  chartSuggestion,
  demoNotice = 'Simulated NovaMart dataset',
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const pageSize = 5;

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortCol) return 0;
    const aVal = a[sortCol];
    const bVal = b[sortCol];
    if (aVal === bVal) return 0;
    if (aVal == null) return 1;
    if (bVal == null) return -1;
    if (typeof aVal === 'number' && typeof bVal === 'number') {
      return sortAsc ? aVal - bVal : bVal - aVal;
    }
    return sortAsc 
      ? String(aVal).localeCompare(String(bVal))
      : String(bVal).localeCompare(String(aVal));
  });

  const totalPages = Math.ceil(sortedRows.length / pageSize) || 1;
  const paginatedRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportCSV = () => {
    if (rows.length === 0) return;
    const header = columns.join(',');
    const body = rows.map(r => columns.map(c => `"${r[c] ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tribalsql_query_result_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Orange & Powder Blue palette for charts
  const chartColors = ['#F45B0B', '#A8C9C8', '#142337', '#16A36A', '#F97316', '#0284C7'];

  return (
    <div className="rounded-2xl bg-white border border-[#E4EAEA] shadow-xs overflow-hidden flex flex-col">
      {/* Table Header Bar */}
      <div className="px-5 py-3.5 bg-[#F5F7F7] border-b border-[#E4EAEA] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
            <Database className="w-4 h-4 text-[#F45B0B]" />
            <span>Query Results</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#64748B] font-mono">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-[#94A3B8]" />
              <span>{executionTimeMs}ms</span>
            </span>
            <span>•</span>
            <span>{rowCount ?? rows.length} rows</span>
          </div>

          <span className="text-[10px] bg-[#EAF3F3] text-[#1E5755] border border-[#A8C9C8] px-2 py-0.5 rounded-full font-semibold">
            {demoNotice}
          </span>
        </div>

        {/* View mode toggle & CSV export */}
        <div className="flex items-center gap-2">
          {chartSuggestion && (
            <div className="flex items-center bg-white p-1 rounded-xl border border-[#E4EAEA]">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#F45B0B] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#142337]'
                }`}
                title="Table View"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`p-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  viewMode === 'chart'
                    ? 'bg-[#F45B0B] text-white shadow-2xs'
                    : 'text-[#64748B] hover:text-[#142337]'
                }`}
                title="Visual Chart View"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Chart</span>
              </button>
            </div>
          )}

          <button
            onClick={exportCSV}
            className="p-1.5 px-2.5 rounded-xl bg-white hover:bg-[#F5F7F7] text-[#142337] text-xs font-semibold border border-[#E4EAEA] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#F45B0B]" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Main Body */}
      {viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F5F7F7]/70 border-b border-[#E4EAEA] text-[#64748B] uppercase tracking-wider font-bold text-[11px]">
                {columns.map((col) => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="py-3 px-4 cursor-pointer hover:text-[#F45B0B] transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col}</span>
                      <ArrowUpDown className="w-3 h-3 text-[#94A3B8]" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E4EAEA] font-mono text-[#142337]">
              {paginatedRows.length > 0 ? (
                paginatedRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-[#F5F7F7] transition-colors">
                    {columns.map((col) => (
                      <td key={col} className="py-3 px-4 whitespace-nowrap">
                        {typeof row[col] === 'number'
                          ? row[col].toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : String(row[col] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-8 text-center text-[#94A3B8]">
                    No rows returned from query
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Chart Visualization Mode */
        <div className="p-6 bg-white min-h-[280px]">
          {chartSuggestion && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold text-[#142337] flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-[#F45B0B]" />
                <span>{chartSuggestion.title}</span>
              </h4>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartSuggestion.type === 'bar' ? (
                    <BarChart data={rows} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4EAEA" vertical={false} />
                      <XAxis dataKey={chartSuggestion.xKey} stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4EAEA', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                      />
                      <Bar dataKey={chartSuggestion.yKey} fill="#F45B0B" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  ) : chartSuggestion.type === 'line' ? (
                    <LineChart data={rows} margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E4EAEA" vertical={false} />
                      <XAxis dataKey={chartSuggestion.xKey} stroke="#64748B" fontSize={11} />
                      <YAxis stroke="#64748B" fontSize={11} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#FFFFFF', borderColor: '#E4EAEA', borderRadius: '12px', fontSize: '12px' }}
                      />
                      <Line type="monotone" dataKey={chartSuggestion.yKey} stroke="#F45B0B" strokeWidth={3} dot={{ r: 5, fill: '#F45B0B' }} />
                    </LineChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={rows}
                        dataKey={chartSuggestion.yKey}
                        nameKey={chartSuggestion.xKey}
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                      >
                        {rows.map((_, i) => (
                          <Cell key={`cell-${i}`} fill={chartColors[i % chartColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pagination Footer */}
      {viewMode === 'table' && sortedRows.length > pageSize && (
        <div className="px-5 py-2.5 bg-[#F5F7F7] border-t border-[#E4EAEA] flex items-center justify-between text-xs text-[#64748B]">
          <span>
            Showing {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, sortedRows.length)} of {sortedRows.length} results
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="p-1 rounded bg-white border border-[#E4EAEA] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed text-[#142337] cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[#142337] px-2 font-bold">Page {currentPage} of {totalPages}</span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-1 rounded bg-white border border-[#E4EAEA] hover:bg-[#F5F7F7] disabled:opacity-40 disabled:cursor-not-allowed text-[#142337] cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
