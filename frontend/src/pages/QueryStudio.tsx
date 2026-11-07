import React, { useState, useEffect } from 'react';
import { PromptBar } from '../components/query/PromptBar';
import { SqlCodeEditor, formatLLMLabel } from '../components/query/SqlCodeEditor';
import { MemoryRecallBanner } from '../components/query/MemoryRecallBanner';
import { ResultsTable } from '../components/query/ResultsTable';
import { ExplanationPanel } from '../components/query/ExplanationPanel';
import { CorrectionModal } from '../components/query/CorrectionModal';
import { Modal } from '../components/common/Modal';
import { generateSQL, executeSQL } from '../services/queryService';
import { QueryExecutionResult, RetainedMemory } from '../types';
import { presetQueries } from '../data/mockQueryStudio';
import { useToast } from '../components/common/ToastContext';
import { Badge } from '../components/common/Badge';
import { getApiMode } from '../services/api';
import { Code2, BrainCircuit } from 'lucide-react';

interface QueryStudioProps {
  initialQuery?: string;
}

export const QueryStudio: React.FC<QueryStudioProps> = ({ initialQuery = '' }) => {
  const { showToast } = useToast();
  const [naturalQuery, setNaturalQuery] = useState(
    initialQuery || 'Calculate net revenue from premium customers.'
  );
  const [useMemory, setUseMemory] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryResult, setQueryResult] = useState<QueryExecutionResult | null>(
    presetQueries[0].result
  );
  const [editableSql, setEditableSql] = useState<string>(presetQueries[0].result.generatedSql);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);
  const [isExplainOpen, setIsExplainOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<RetainedMemory | null>(null);

  useEffect(() => {
    if (initialQuery && initialQuery !== naturalQuery) {
      setNaturalQuery(initialQuery);
      handleGenerate(initialQuery, useMemory);
    }
  }, [initialQuery]);

  const handleGenerate = async (q: string, overrideUseMemory?: boolean) => {
    const memoryFlag = overrideUseMemory !== undefined ? overrideUseMemory : useMemory;
    setIsGenerating(true);
    // Clear stale results immediately upon submission
    setQueryResult(null);
    setEditableSql('');

    try {
      const res = await generateSQL(q, memoryFlag);
      setQueryResult(res.data);
      setEditableSql(res.data.generatedSql || '');
      const isLive = res.source === 'fastapi';
      showToast(
        memoryFlag 
          ? (isLive ? 'SQL Generated (Hindsight Memory Active)' : 'SQL Generated (Mock)') 
          : 'SQL Generated (Cold Start Mode)',
        res.data.generatedSql
          ? (memoryFlag 
              ? 'Recalled institutional rules via Groq LLM & Hindsight Cloud' 
              : 'Generated purely from raw schema DDL (Cold Start)')
          : (res.data.explanation || 'Schema Boundary: Missing schema entity requested'),
        memoryFlag ? 'success' : 'warning'
      );
    } catch (err: any) {
      setQueryResult({
        id: `err-${Date.now()}`,
        naturalQuery: q,
        status: 'failed',
        executionTimeMs: 0,
        rowCount: 0,
        recalledMemories: [],
        businessRulesUsed: [],
        generatedSql: '',
        explanation: err?.message || 'Failed to generate SQL query.',
        columns: [],
        rows: [],
        error: err?.message || 'SQL generation failed',
        demoDataNotice: 'Failed query generation attempt.',
        useMemory: memoryFlag
      });
      showToast('Error generating SQL', err?.message || 'Please check backend connection', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExecute = async () => {
    if (!editableSql.trim()) return;
    setIsExecuting(true);
    try {
      const res = await executeSQL(editableSql);
      setQueryResult(prev => prev ? ({
        ...prev,
        columns: res.data.columns || [],
        rows: res.data.rows || [],
        rowCount: (res.data as any).rowCount ?? res.data.rows?.length ?? 0,
        executionTimeMs: res.data.executionTimeMs,
        status: 'success',
        error: undefined,
      }) : null);
      showToast(
        'Query Executed Successfully',
        `Returned ${res.data.rows?.length || 0} rows in ${res.data.executionTimeMs}ms (${res.source === 'fastapi' ? 'Live DB' : 'Simulated'})`,
        'success'
      );
    } catch (err: any) {
      setQueryResult(prev => prev ? ({
        ...prev,
        rows: [],
        rowCount: 0,
        status: 'failed',
        error: err?.message || 'Query execution failed',
      }) : null);
      showToast('Query Execution Failed', err?.message || 'Check syntax or permissions', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4EAEA] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#142337] tracking-tight flex items-center gap-2">
            <Code2 className="w-6 h-6 text-[#F45B0B]" />
            <span>Query Studio</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Translate plain questions into compliant SQL backed by institutional memory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getApiMode() === 'live' ? 'emerald' : 'orange'} dot>
            {getApiMode() === 'live' ? 'Live Backend Active' : 'Mock Demo Mode'}
          </Badge>
          {queryResult?.modelUsed && (
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold ${
              formatLLMLabel(queryResult.modelUsed).isFallback
                ? 'bg-[#FEF3C7] border-[#FCD34D] text-[#92400E]'
                : 'bg-[#F0FDF4] border-[#BBF7D0] text-[#166534]'
            }`}>
              <span className={`w-2 h-2 rounded-full ${
                formatLLMLabel(queryResult.modelUsed).isFallback ? 'bg-[#D97706]' : 'bg-[#16A36A]'
              }`} />
              <span>{formatLLMLabel(queryResult.modelUsed).label}</span>
            </div>
          )}
          {useMemory ? (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-semibold text-[#16A36A]">
              <span className="w-2 h-2 rounded-full bg-[#16A36A] animate-pulse" />
              <span>Memory Guardrails Active</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FEF2F2] border border-[#FECDD3] text-xs font-semibold text-[#E5484D]">
              <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
              <span>Cold Start (Memory OFF)</span>
            </div>
          )}
        </div>
      </div>

      {/* Natural Language Prompt Input Bar */}
      <PromptBar
        query={naturalQuery}
        onChange={setNaturalQuery}
        onSubmit={(q) => handleGenerate(q, useMemory)}
        isLoading={isGenerating}
        onSelectSuggestion={(suggestion) => {
          setNaturalQuery(suggestion);
          handleGenerate(suggestion, useMemory);
        }}
        useMemory={useMemory}
        onToggleMemory={(val) => {
          setUseMemory(val);
          handleGenerate(naturalQuery, val);
        }}
      />

      {/* Query Results & Execution Workspace */}
      {queryResult && (
        <div className="space-y-6">
          {/* Recalled Hindsight Memories Banner */}
          <MemoryRecallBanner
            recalledMemories={queryResult.recalledMemories}
            rulesUsed={queryResult.businessRulesUsed}
            onOpenMemoryDetails={(mem) => setSelectedMemory(mem)}
            useMemory={queryResult.useMemory !== undefined ? queryResult.useMemory : useMemory}
          />

          {/* Generated SQL Code Editor */}
          <SqlCodeEditor
            sql={editableSql}
            onSqlChange={setEditableSql}
            onExecute={handleExecute}
            onExplain={() => setIsExplainOpen(true)}
            onOpenCorrection={() => setIsCorrectionOpen(true)}
            isExecuting={isExecuting}
            modelUsed={queryResult.modelUsed}
          />

          {/* Results Table & Visualizations */}
          <ResultsTable
            columns={queryResult.columns}
            rows={queryResult.rows}
            executionTimeMs={queryResult.executionTimeMs}
            rowCount={queryResult.rowCount}
            chartSuggestion={queryResult.chartSuggestion}
            demoNotice={queryResult.demoDataNotice}
          />

          {/* Business Rules Explanation Panel */}
          <ExplanationPanel
            explanation={queryResult.explanation}
            businessRules={queryResult.businessRulesUsed}
          />
        </div>
      )}

      {/* Human Correction Modal */}
      <CorrectionModal
        isOpen={isCorrectionOpen}
        onClose={() => setIsCorrectionOpen(false)}
        naturalQuery={naturalQuery}
        currentSql={editableSql}
        onCorrectionSaved={(newMemory) => {
          if (queryResult) {
            setQueryResult({
              ...queryResult,
              recalledMemories: [newMemory, ...queryResult.recalledMemories],
              businessRulesUsed: [newMemory.ruleText, ...queryResult.businessRulesUsed],
              explanation: `[Updated with freshly retained memory] ${newMemory.ruleText}. ${queryResult.explanation}`,
            });
            setEditableSql(
              `-- Recalled NEW Hindsight Memory (${newMemory.id}):\n-- ${newMemory.ruleText}\n\n` +
              editableSql
            );
          }
        }}
      />

      {/* Query Explanation Modal */}
      {queryResult && (
        <Modal
          isOpen={isExplainOpen}
          onClose={() => setIsExplainOpen(false)}
          title="SQL Query Execution Plan & Rationale"
          subtitle="PostgreSQL index scan analysis and memory provenance"
          maxWidth="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] space-y-2">
              <h4 className="font-bold text-[#142337] flex items-center gap-1.5 text-xs">
                <BrainCircuit className="w-4 h-4 text-[#F45B0B]" />
                <span>Memory Provenance</span>
              </h4>
              <p className="text-[#64748B] leading-relaxed">
                {queryResult.explanation}
              </p>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-[#142337]">Indexed Scan Nodes</h4>
              <div className="font-mono text-[11px] bg-[#142337] text-white p-3.5 rounded-xl border border-[#E4EAEA] space-y-1">
                <p>-&gt; Hash Join (orders.customer_id = customers.customer_id)</p>
                <p className="pl-4">-&gt; Index Scan using pk_customers on customers (cost=0.29..8.31)</p>
                <p className="pl-4">-&gt; Left Hash Join (orders.order_id = refunds.order_id)</p>
                <p className="pl-8">-&gt; Seq Scan on refunds (cost=0.00..18.74)</p>
                <p className="text-[#F45B0B]">Filter: (orders.status != &apos;CANCELLED&apos;)</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#EAF3F3] border border-[#A8C9C8] text-[#1E5755]">
              <p className="font-bold">Hindsight Continuous Learning Note:</p>
              <p className="text-[11px] mt-0.5 text-[#2B7370]">
                Executing this query verifies the active business rule and increases its confidence score in the mental model repository.
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Memory Details Inspector Modal */}
      {selectedMemory && (
        <Modal
          isOpen={!!selectedMemory}
          onClose={() => setSelectedMemory(null)}
          title={selectedMemory.title}
          subtitle={`Retained Memory ID: ${selectedMemory.id}`}
          maxWidth="md"
        >
          <div className="space-y-3.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold text-[#F45B0B] bg-[#FEECE3] border border-[#FCD2C0] px-2 py-0.5 rounded-full uppercase">
                {selectedMemory.type.replace('_', ' ')}
              </span>
              <span className="text-[#64748B]">
                Applied {selectedMemory.timesApplied} times
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
              <p className="text-[#64748B] text-[10px] uppercase font-bold">Rule Statement</p>
              <p className="text-[#142337] font-semibold mt-1 leading-relaxed">{selectedMemory.ruleText}</p>
            </div>

            <div>
              <p className="text-[#64748B] text-[10px] uppercase font-bold">Context & Author</p>
              <p className="text-[#64748B] mt-1">{selectedMemory.description}</p>
              <p className="text-[#94A3B8] mt-1">Ingested by: {selectedMemory.author}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
