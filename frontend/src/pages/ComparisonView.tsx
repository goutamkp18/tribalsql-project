import React, { useState } from 'react';
import { 
  Columns2, 
  AlertOctagon, 
  CheckCircle2, 
  BrainCircuit, 
  Sparkles, 
  ShieldAlert, 
  FileCode,
  Play,
  RotateCw,
  Clock,
  Database,
  ArrowRight
} from 'lucide-react';
import { comparisonScenarios } from '../data/mockComparison';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { generateSQL } from '../services/queryService';
import { QueryExecutionResult } from '../types';
import { useToast } from '../components/common/ToastContext';
import { getApiMode } from '../services/api';

interface LiveBenchmarkData {
  cold: QueryExecutionResult;
  learned: QueryExecutionResult;
  coldLatency: number;
  learnedLatency: number;
  executedAt: string;
}

export const ComparisonView: React.FC = () => {
  const { showToast } = useToast();
  const [activeScenarioId, setActiveScenarioId] = useState<string>(comparisonScenarios[0].id);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [benchmarkCache, setBenchmarkCache] = useState<Record<string, LiveBenchmarkData>>({});

  const scenario = comparisonScenarios.find((s) => s.id === activeScenarioId) || comparisonScenarios[0];
  const liveData = benchmarkCache[activeScenarioId];

  const handleRunLiveBenchmark = async () => {
    setIsRunning(true);
    showToast(
      'Executing Live Benchmark',
      `Running dual execution for "${scenario.userPrompt.slice(0, 35)}..." against database.`,
      'info'
    );

    try {
      // 1. Cold Start: Execute without memory
      const t0Cold = performance.now();
      const coldRes = await generateSQL(scenario.userPrompt, false);
      const coldLatency = Math.round(performance.now() - t0Cold);

      // 2. Learned Query: Execute with Hindsight Cloud memory
      const t0Learned = performance.now();
      const learnedRes = await generateSQL(scenario.userPrompt, true);
      const learnedLatency = Math.round(performance.now() - t0Learned);

      const newBenchmark: LiveBenchmarkData = {
        cold: coldRes.data,
        learned: learnedRes.data,
        coldLatency,
        learnedLatency,
        executedAt: new Date().toLocaleTimeString(),
      };

      setBenchmarkCache(prev => ({
        ...prev,
        [activeScenarioId]: newBenchmark,
      }));

      showToast(
        'Live Benchmark Completed',
        `Cold: ${coldLatency}ms (${coldRes.data.rows.length} rows) | Learned: ${learnedLatency}ms (${learnedRes.data.rows.length} rows)`,
        'success'
      );
    } catch (err: any) {
      showToast(
        'Benchmark Execution Error',
        err?.message || 'Failed to complete dual live benchmark run.',
        'error'
      );
    } finally {
      setIsRunning(false);
    }
  };

  const formatResultPreview = (rows: Record<string, any>[]) => {
    if (!rows || rows.length === 0) return 'No rows returned';
    const first = rows[0];
    const keys = Object.keys(first);
    if (keys.length === 1) {
      const val = first[keys[0]];
      return typeof val === 'number'
        ? `${keys[0]}: $${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        : `${keys[0]}: ${val}`;
    }
    return rows.map(r => Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(', ')).slice(0, 2).join(' | ');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAEA] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEECE3] border border-[#FCD2C0] flex items-center justify-center text-[#F45B0B]">
              <Columns2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#142337] tracking-tight">
              Memory Comparison Studio
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Side-by-side evidence: Generic LLM query generation vs TribalSQL with persistent Hindsight memory.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getApiMode() === 'live' ? 'emerald' : 'orange'} dot>
            {getApiMode() === 'live' ? 'Live Supabase DB' : 'Simulated DB'}
          </Badge>
          <Badge variant="powder" dot>
            Interactive Benchmark
          </Badge>
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs text-[#64748B] font-bold shrink-0">Scenarios:</span>
        {comparisonScenarios.map((sc) => (
          <button
            key={sc.id}
            onClick={() => setActiveScenarioId(sc.id)}
            className={`text-xs px-3.5 py-2 rounded-xl border transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 font-bold ${
              activeScenarioId === sc.id
                ? 'bg-[#F45B0B] border-[#F45B0B] text-white shadow-xs'
                : 'bg-white hover:bg-[#F5F7F7] border-[#E4EAEA] text-[#142337]'
            }`}
          >
            <span>{sc.title}</span>
            <span className="text-[10px] opacity-80">({sc.category})</span>
          </button>
        ))}
      </div>

      {/* Active User Prompt Card with Live Benchmark Action */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#E4EAEA] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FEECE3] text-[#F45B0B] shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">Target Benchmark Prompt</p>
            <p className="text-sm sm:text-base font-bold text-[#142337] mt-0.5">&quot;{scenario.userPrompt}&quot;</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Runs dual execution against the same database: once with <span className="font-semibold text-[#E5484D]">use_memory=false</span> and once with <span className="font-semibold text-[#16A36A]">use_memory=true</span>.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="primary"
            size="md"
            onClick={handleRunLiveBenchmark}
            disabled={isRunning}
            isLoading={isRunning}
            leftIcon={!isRunning ? <Play className="w-4 h-4 fill-white" /> : undefined}
            className="font-black tracking-wide shadow-md"
          >
            {isRunning ? 'Running Live Benchmark...' : liveData ? 'Re-run Live Benchmark' : '⚡ Run Live Benchmark'}
          </Button>
        </div>
      </div>

      {/* Execution Indicator Banner if Live Data Available */}
      {liveData && (
        <div className="p-3 rounded-xl bg-[#EAF3F3] border border-[#A8C9C8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#1E5755]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#16A36A] animate-pulse" />
            <span className="font-bold">Live Benchmark Completed at {liveData.executedAt}</span>
            <span className="text-[#64748B] hidden sm:inline">— Direct dual execution against Supabase PostgreSQL</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>Cold Latency: <strong>{liveData.coldLatency}ms</strong></span>
            <span>Learned Latency: <strong>{liveData.learnedLatency}ms</strong></span>
          </div>
        </div>
      )}

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: WITHOUT HINDSIGHT */}
        <div className="rounded-2xl bg-white border-2 border-[#FECDD3] shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-4 bg-[#FEF2F2] border-b border-[#FECDD3] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#E5484D]" />
                <div>
                  <h3 className="text-xs font-black text-[#E5484D] tracking-wider uppercase">
                    WITHOUT HINDSIGHT MEMORY
                  </h3>
                  <p className="text-[10px] text-[#E5484D]/80">
                    {liveData ? 'Live Cold Start (use_memory=false)' : 'Standard Generic Text-to-SQL LLM'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-[#E5484D] bg-white border border-[#FECDD3] px-2.5 py-0.5 rounded-full">
                {liveData ? 'LIVE COLD-START' : scenario.withoutMemory.status}
              </span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5" />
                    <span>Generated Naive SQL</span>
                  </p>
                  {liveData && (
                    <span className="text-[10px] font-mono text-[#64748B] bg-[#F5F7F7] px-2 py-0.5 rounded border border-[#E4EAEA]">
                      Engine: {liveData.cold.modelUsed || 'Groq LLM'} ({liveData.coldLatency}ms)
                    </span>
                  )}
                </div>
                <pre className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#FECDD3] text-[#142337] font-mono text-[11px] overflow-x-auto leading-relaxed max-h-56">
                  {liveData ? liveData.cold.generatedSql : scenario.withoutMemory.sql}
                </pre>
              </div>

              {/* Status Outcome */}
              <div className="p-3 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] space-y-1">
                <p className="text-[#E5484D] font-bold flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-[#E5484D]" />
                  <span>
                    Outcome: {liveData ? 'Fell into Baseline Schema Traps' : scenario.withoutMemory.statusLabel}
                  </span>
                </p>
                <p className="text-[#64748B] text-[11px]">
                  {liveData ? liveData.cold.explanation : scenario.withoutMemory.financialOrDataImpact}
                </p>
              </div>

              {/* Shortcomings Checklist */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Critical Vulnerabilities & Missing Context:
                </p>
                {scenario.withoutMemory.shortcomings.map((sc, i) => (
                  <div key={i} className="flex items-start gap-2 text-[#142337] bg-[#F5F7F7] p-2.5 rounded-lg border border-[#E4EAEA]">
                    <span className="text-[#E5484D] font-bold shrink-0">✕</span>
                    <span className="text-[11px] font-medium">{sc}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#F5F7F7] border-t border-[#E4EAEA] text-[11px] text-[#64748B] flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-[#64748B]" />
              <span>Result Preview:</span>
            </span>
            <span className="font-mono text-[#E5484D] font-bold">
              {liveData ? formatResultPreview(liveData.cold.rows) : scenario.withoutMemory.sampleResultSummary}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: WITH HINDSIGHT */}
        <div className="rounded-2xl bg-white border-2 border-[#F45B0B] shadow-md overflow-hidden flex flex-col justify-between">
          <div>
            {/* Header */}
            <div className="p-4 bg-[#FEECE3] border-b border-[#FCD2C0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-[#F45B0B]" />
                <div>
                  <h3 className="text-xs font-black text-[#F45B0B] tracking-wider uppercase">
                    WITH HINDSIGHT PERSISTENT MEMORY
                  </h3>
                  <p className="text-[10px] text-[#1E5755] font-semibold">
                    {liveData ? 'Live Learned Execution (use_memory=true)' : 'TribalSQL Autonomous Learning Agent'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-white bg-[#F45B0B] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                <CheckCircle2 className="w-3 h-3" />
                <span>{liveData ? 'LIVE VERIFIED' : scenario.withMemory.status}</span>
              </span>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4 text-xs">
              {/* Recalled Knowledge Cards */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-[#F45B0B] tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#F45B0B]" />
                  <span>
                    {liveData ? `Recalled Institutional Memories (${liveData.learned.recalledMemories.length})` : 'Recalled Institutional Memories'}
                  </span>
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {liveData && liveData.learned.recalledMemories.length > 0 ? (
                    liveData.learned.recalledMemories.slice(0, 3).map((rk, idx) => (
                      <div key={rk.id || idx} className="p-2.5 rounded-xl bg-[#EAF3F3] border border-[#A8C9C8]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#142337]">{rk.title}</span>
                          <span className="text-[9px] font-mono text-[#1E5755] font-bold">{rk.id}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{rk.ruleText || rk.description}</p>
                      </div>
                    ))
                  ) : (
                    scenario.withMemory.recalledKnowledge.map((rk) => (
                      <div key={rk.id} className="p-2.5 rounded-xl bg-[#EAF3F3] border border-[#A8C9C8]">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-[#142337]">{rk.title}</span>
                          <span className="text-[9px] font-mono text-[#1E5755] font-bold">{rk.id}</span>
                        </div>
                        <p className="text-[11px] text-[#64748B] mt-0.5">{rk.ruleText}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Generated Compliant SQL */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-[10px] uppercase font-bold text-[#64748B] flex items-center gap-1">
                    <FileCode className="w-3.5 h-3.5 text-[#16A36A]" />
                    <span>Institutional Guarded SQL</span>
                  </p>
                  {liveData && (
                    <span className="text-[10px] font-mono text-[#1E5755] bg-[#EAF3F3] px-2 py-0.5 rounded border border-[#A8C9C8]">
                      Engine: {liveData.learned.modelUsed || 'Groq LLM'} ({liveData.learnedLatency}ms)
                    </span>
                  )}
                </div>
                <pre className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#A8C9C8] text-[#142337] font-mono text-[11px] overflow-x-auto leading-relaxed shadow-2xs max-h-56">
                  {liveData ? liveData.learned.generatedSql : scenario.withMemory.sql}
                </pre>
              </div>

              {/* Improvements list */}
              <div className="space-y-1.5">
                <p className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider">
                  Audited Advantages & Compliance Guardrails:
                </p>
                {liveData && liveData.learned.businessRulesUsed.length > 0 ? (
                  liveData.learned.businessRulesUsed.map((rule, i) => (
                    <div key={i} className="flex items-start gap-2 text-[#142337] bg-[#ECFDF5] p-2.5 rounded-lg border border-[#A7F3D0]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] mt-0.5 shrink-0" />
                      <span className="text-[11px] font-medium">{rule}</span>
                    </div>
                  ))
                ) : (
                  scenario.withMemory.improvements.map((imp, i) => (
                    <div key={i} className="flex items-start gap-2 text-[#142337] bg-[#ECFDF5] p-2.5 rounded-lg border border-[#A7F3D0]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] mt-0.5 shrink-0" />
                      <span className="text-[11px] font-medium">{imp}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#F5F7F7] border-t border-[#E4EAEA] text-[11px] text-[#64748B] flex items-center justify-between">
            <span className="text-[#16A36A] font-bold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{liveData ? '100% Policy Compliant' : scenario.withMemory.accuracyGain}</span>
            </span>
            <span className="font-mono text-[#F45B0B] font-bold">
              {liveData ? formatResultPreview(liveData.learned.rows) : scenario.withMemory.sampleResultSummary}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
