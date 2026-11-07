import React, { useState } from 'react';
import { Play, Copy, Check, Info, Edit3, MessageSquarePlus } from 'lucide-react';
import { Button } from '../common/Button';

interface SqlCodeEditorProps {
  sql: string;
  onSqlChange: (newSql: string) => void;
  onExecute: () => void;
  onExplain: () => void;
  onOpenCorrection: () => void;
  isExecuting?: boolean;
  modelUsed?: string;
}

export function formatLLMLabel(model?: string): { label: string; isFallback: boolean } {
  if (!model) return { label: 'LLM: Groq', isFallback: false };
  const m = model.toLowerCase();
  if (m.includes('rate-limited') || m.includes('unavailable')) {
    return { label: 'LLM: Service Rate-Limited', isFallback: true };
  }
  if (m.includes('offline-heuristic')) {
    return { label: 'Offline Heuristic Agent', isFallback: true };
  }
  if (m.includes('gpt-oss-120b') && !m.includes('fallback')) {
    return { label: 'LLM: GPT OSS 120B (Primary)', isFallback: false };
  }
  if (m.includes('gpt-oss-20b')) {
    return { label: 'LLM: GPT OSS 20B (Fallback)', isFallback: true };
  }
  if (m.includes('qwen')) {
    return { label: 'LLM: Qwen (Deprecated)', isFallback: true };
  }
  return { label: `LLM: ${model}`, isFallback: false };
}

export const SqlCodeEditor: React.FC<SqlCodeEditorProps> = ({
  sql,
  onSqlChange,
  onExecute,
  onExplain,
  onOpenCorrection,
  isExecuting = false,
  modelUsed,
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditable, setIsEditable] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Light theme SQL Syntax Highlighter
  const highlightSql = (code: string) => {
    const lines = code.split('\n');
    return lines.map((line, lineIdx) => {
      // Highlight comments
      if (line.trim().startsWith('--')) {
        return (
          <div key={lineIdx} className="table-row">
            <span className="table-cell pr-4 text-[#94A3B8] select-none text-right font-mono text-xs w-8">{lineIdx + 1}</span>
            <span className="table-cell text-[#16A36A] font-mono text-xs italic">{line}</span>
          </div>
        );
      }

      // Tokenize and color keywords
      const words = line.split(/(\s+|[(),;])/);
      const keywords = new Set([
        'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER', 'FULL',
        'ON', 'GROUP', 'BY', 'ORDER', 'DESC', 'ASC', 'LIMIT', 'AND', 'OR', 'NOT',
        'AS', 'IN', 'IS', 'NULL', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'HAVING',
        'DISTINCT', 'COALESCE', 'NULLIF', 'ROUND', 'SUM', 'COUNT', 'AVG', 'MIN', 'MAX',
        'TO_CHAR', 'DATE_TRUNC', 'INTERVAL', 'NOW'
      ]);

      return (
        <div key={lineIdx} className="table-row leading-6">
          <span className="table-cell pr-4 text-[#94A3B8] select-none text-right font-mono text-xs w-8">{lineIdx + 1}</span>
          <span className="table-cell font-mono text-xs text-[#142337]">
            {words.map((token, tokenIdx) => {
              const upper = token.toUpperCase();
              if (keywords.has(upper)) {
                return (
                  <span key={tokenIdx} className="text-[#F45B0B] font-bold">
                    {token}
                  </span>
                );
              }
              if (token.startsWith("'") || token.endsWith("'") || token.startsWith('"') || token.endsWith('"')) {
                return (
                  <span key={tokenIdx} className="text-[#1E5755] font-semibold">
                    {token}
                  </span>
                );
              }
              if (/^\d+(\.\d+)?$/.test(token)) {
                return (
                  <span key={tokenIdx} className="text-[#0284C7] font-semibold">
                    {token}
                  </span>
                );
              }
              return token;
            })}
          </span>
        </div>
      );
    });
  };

  return (
    <div className="rounded-2xl bg-white border border-[#E4EAEA] shadow-xs overflow-hidden flex flex-col">
      {/* Editor Top Bar */}
      <div className="px-4 py-2.5 bg-[#F5F7F7] border-b border-[#E4EAEA] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white border border-[#E4EAEA] text-[11px] font-bold text-[#142337]">
            <span>PostgreSQL 16</span>
          </div>
          {modelUsed && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[11px] font-bold transition-all ${
              formatLLMLabel(modelUsed).isFallback
                ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                formatLLMLabel(modelUsed).isFallback ? 'bg-[#D97706]' : 'bg-[#16A36A]'
              }`} />
              <span>{formatLLMLabel(modelUsed).label}</span>
            </div>
          )}
          <span className="text-xs text-[#64748B] font-mono hidden sm:inline">generated_query.sql</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditable(!isEditable)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer font-medium ${
              isEditable
                ? 'bg-[#EAF3F3] border-[#A8C9C8] text-[#1E5755]'
                : 'bg-white border-[#E4EAEA] text-[#142337] hover:bg-[#F5F7F7]'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5 text-[#64748B]" />
            <span>{isEditable ? 'Editing' : 'Edit SQL'}</span>
          </button>

          <button
            onClick={handleCopy}
            className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#142337] border border-[#E4EAEA] transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#16A36A]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            onClick={onExplain}
            className="text-xs px-2.5 py-1 rounded-lg bg-white hover:bg-[#F5F7F7] text-[#142337] border border-[#E4EAEA] transition-colors flex items-center gap-1 cursor-pointer font-medium"
          >
            <Info className="w-3.5 h-3.5 text-[#F45B0B]" />
            <span>Explain</span>
          </button>

          <button
            onClick={onOpenCorrection}
            className="text-xs px-2.5 py-1 rounded-lg bg-[#EAF3F3] hover:bg-[#DCEDED] text-[#1E5755] border border-[#A8C9C8] transition-colors flex items-center gap-1 cursor-pointer font-semibold"
          >
            <MessageSquarePlus className="w-3.5 h-3.5 text-[#1E5755]" />
            <span>Teach TribalSQL</span>
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={onExecute}
            isLoading={isExecuting}
            leftIcon={<Play className="w-3.5 h-3.5 fill-current" />}
          >
            Execute Query
          </Button>
        </div>
      </div>

      {/* Editor Body */}
      <div className="p-4 overflow-x-auto min-h-[160px] max-h-[380px] bg-white">
        {isEditable ? (
          <textarea
            value={sql}
            onChange={(e) => onSqlChange(e.target.value)}
            className="w-full h-56 bg-transparent text-[#142337] font-mono text-xs focus:outline-none resize-y leading-6 selection:bg-[#FEECE3]"
            spellCheck={false}
          />
        ) : (
          <div className="table w-full">
            {highlightSql(sql || '-- No SQL generated for this query (see explanation below)')}
          </div>
        )}
      </div>
    </div>
  );
};
