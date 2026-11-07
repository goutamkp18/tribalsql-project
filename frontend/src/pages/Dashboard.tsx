import React, { useState, useEffect, useCallback } from 'react';
import { Database, CheckCircle2, Layers, BrainCircuit, Calendar, ChevronDown, RefreshCw } from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { QueryActivityChart } from '../components/dashboard/QueryActivityChart';
import { QueryResultsDonut } from '../components/dashboard/QueryResultsDonut';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';
import { RecentQueriesList } from '../components/dashboard/RecentQueriesList';
import { RecentLearningList } from '../components/dashboard/RecentLearningList';
import { MemoryInsightsCard } from '../components/dashboard/MemoryInsightsCard';
import { PageView, SystemStatus } from '../types';
import { checkBackendHealth } from '../services/api';
import { getDashboardAnalytics, DashboardAnalyticsPayload } from '../services/dashboardService';

interface DashboardProps {
  onNavigate: (page: PageView) => void;
  onSelectQueryForStudio: (query: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate,
  onSelectQueryForStudio,
}) => {
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState('Last 7 days');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [analytics, setAnalytics] = useState<DashboardAnalyticsPayload | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    postgresql: {
      status: 'reconnecting',
      label: 'Connecting...',
      database: 'postgres',
      host: 'Supabase Cloud',
      latencyMs: 18,
    },
    hindsight: {
      status: 'offline',
      label: 'Checking...',
      memoriesRetained: 0,
      cloudRegion: 'us-east (Vectorize)',
    },
    groq: {
      status: 'busy',
      label: 'Initializing...',
      model: 'openai/gpt-oss-120b',
    },
  });

  const getDaysFromRange = (range: string): number => {
    switch (range) {
      case 'Today': return 1;
      case 'Last 7 days': return 7;
      case 'Last 30 days': return 30;
      case 'Previous Quarter': return 90;
      default: return 7;
    }
  };

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const days = getDaysFromRange(selectedRange);
      const [analyticsRes, health] = await Promise.all([
        getDashboardAnalytics(days),
        checkBackendHealth()
      ]);

      if (analyticsRes.data) {
        setAnalytics(analyticsRes.data);
      }

      if (health.online) {
        const memCount = analyticsRes.data?.metrics?.hindsightMemories ?? 0;
        setSystemStatus({
          postgresql: {
            status: health.engine === 'postgresql' ? 'connected' : 'disconnected',
            label: health.engine === 'postgresql' ? 'Connected (Supabase)' : 'SQLite Local',
            database: 'postgres',
            host: 'aws-0-ap-southeast-2.pooler.supabase.com',
            latencyMs: 24,
          },
          hindsight: {
            status: health.hindsightConfigured ? 'active' : 'offline',
            label: health.hindsightConfigured ? `Active (${health.hindsightBank})` : 'Offline Fallback',
            memoriesRetained: memCount,
            cloudRegion: 'us-east (Vectorize)',
          },
          groq: {
            status: health.groqConfigured ? 'ready' : 'busy',
            label: health.groqConfigured ? 'Ready (Sub-second)' : 'Not Configured',
            model: health.primaryModel || 'openai/gpt-oss-120b',
          },
        });
      } else if (health.isWaking) {
        setSystemStatus({
          postgresql: {
            status: 'reconnecting',
            label: 'Waking backend...',
            database: 'postgres',
            host: 'aws-0-ap-southeast-2.pooler.supabase.com',
            latencyMs: 0,
          },
          hindsight: {
            status: 'offline',
            label: 'Connecting...',
            memoriesRetained: 0,
            cloudRegion: 'us-east (Vectorize)',
          },
          groq: {
            status: 'busy',
            label: 'Connecting...',
            model: 'openai/gpt-oss-120b',
          },
        });
      }
    } catch (err: any) {
      console.error('Failed to load dashboard analytics:', err);
      setError(err?.message || 'Could not load live analytics from backend.');
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Default values while loading or on initial render
  const metrics = analytics?.metrics ?? {
    totalQueries: 0,
    totalQueriesDelta: '0%',
    successfulQueries: 0,
    successRate: 0,
    successDelta: '0%',
    correctionsLearned: 0,
    correctionsDelta: '+0',
    hindsightMemories: 0,
    memoriesDelta: '+0',
  };

  const queryActivity = analytics?.queryActivity ?? [];
  const queryOutcomes = analytics?.queryOutcomes ?? [
    { name: 'Successful', value: 0, color: '#F45B0B' },
    { name: 'Failed', value: 0, color: '#A8C9C8' }
  ];
  const recentQueries = analytics?.recentQueries ?? [];
  const recentLearning = analytics?.recentLearning ?? [];
  const memoryInsights = analytics?.memoryInsights ?? {
    businessRules: 0,
    sqlFixes: 0,
    worldFacts: 0,
    mentalModels: 0,
  };
  const hindsightStatus = analytics?.hindsight?.status ?? 'connected';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Heading: Overview + Date Range Filter + Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#142337] tracking-tight">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Production database intelligence and institutional learning telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Refresh Button */}
          <button
            onClick={() => fetchDashboardData()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E4EAEA] shadow-2xs hover:bg-[#F5F7F7] text-xs font-semibold text-[#142337] transition-all cursor-pointer disabled:opacity-50"
            title="Refresh Live Analytics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#64748B] ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Date Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDateRangeOpen(!dateRangeOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-[#E4EAEA] shadow-2xs hover:bg-[#F5F7F7] text-xs font-semibold text-[#142337] transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-[#64748B]" />
              <span>{selectedRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
            </button>

            {dateRangeOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-[#E4EAEA] rounded-xl shadow-lg p-1 z-20 text-xs">
                {['Today', 'Last 7 days', 'Last 30 days', 'Previous Quarter'].map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setSelectedRange(r);
                      setDateRangeOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      selectedRange === r ? 'bg-[#FEECE3] text-[#F45B0B] font-semibold' : 'text-[#142337] hover:bg-[#F5F7F7]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner if backend fails */}
      {error && (
        <div className="p-3.5 rounded-xl bg-[#FEF2F2] border border-[#FECDD3] text-xs text-[#E5484D] flex items-center justify-between">
          <span>Failed to connect to backend telemetry: {error}</span>
          <button 
            onClick={() => fetchDashboardData()}
            className="font-bold underline hover:no-underline cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Queries"
          value={loading ? '...' : metrics.totalQueries}
          delta={metrics.totalQueriesDelta}
          icon={<Database className="w-5 h-5" />}
          accent="powder"
          delay={0}
        />
        <MetricCard
          title="Query Success Rate"
          value={loading ? '...' : `${metrics.successRate}%`}
          delta={metrics.successDelta}
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="orange"
          delay={0.05}
        />
        <MetricCard
          title="Corrections Learned"
          value={loading ? '...' : metrics.correctionsLearned}
          delta={metrics.correctionsDelta}
          icon={<Layers className="w-5 h-5" />}
          accent="powder"
          delay={0.1}
        />
        <MetricCard
          title="Active Memories"
          value={loading ? '...' : metrics.hindsightMemories}
          delta={metrics.memoriesDelta}
          icon={<BrainCircuit className="w-5 h-5" />}
          accent="orange"
          delay={0.15}
        />
      </div>

      {/* Analytics & System Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <QueryActivityChart data={queryActivity} />
        </div>
        <div className="lg:col-span-4">
          <QueryResultsDonut
            data={queryOutcomes}
            successRate={metrics.successRate}
          />
        </div>
        <div className="lg:col-span-3">
          <SystemStatusCard status={systemStatus} />
        </div>
      </div>

      {/* Feeds & Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <RecentQueriesList
            queries={recentQueries}
            onSelectQuery={(q) => {
              onSelectQueryForStudio(q);
              onNavigate('query-studio');
            }}
            onViewAll={() => onNavigate('query-studio')}
          />
        </div>
        <div className="lg:col-span-4">
          <RecentLearningList
            items={recentLearning}
            onViewAll={() => onNavigate('learning-history')}
            onSelectRule={() => onNavigate('learning-history')}
          />
        </div>
        <div className="lg:col-span-3">
          <MemoryInsightsCard
            counts={memoryInsights}
            status={hindsightStatus}
            onOpenMemoryInspector={() => onNavigate('memory-inspector')}
          />
        </div>
      </div>
    </div>
  );
};
