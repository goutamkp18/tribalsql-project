import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, Layers, BrainCircuit, Calendar, ChevronDown } from 'lucide-react';
import { MetricCard } from '../components/dashboard/MetricCard';
import { QueryActivityChart } from '../components/dashboard/QueryActivityChart';
import { QueryResultsDonut } from '../components/dashboard/QueryResultsDonut';
import { SystemStatusCard } from '../components/dashboard/SystemStatusCard';
import { RecentQueriesList } from '../components/dashboard/RecentQueriesList';
import { RecentLearningList } from '../components/dashboard/RecentLearningList';
import { MemoryInsightsCard } from '../components/dashboard/MemoryInsightsCard';
import { 
  mockDashboardMetrics, 
  mockQueryActivity, 
  mockQueryResultBreakdown, 
  mockSystemStatus, 
  mockRecentQueries, 
  mockRecentLearning,
  mockMemoryInsightsCounts
} from '../data/mockDashboard';
import { PageView, SystemStatus } from '../types';
import { checkBackendHealth, getApiMode } from '../services/api';
import { getRetainedMemories } from '../services/memoryService';

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
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(mockSystemStatus);
  const [activeMemoryCount, setActiveMemoryCount] = useState<number>(mockDashboardMetrics.hindsightMemories);

  useEffect(() => {
    const fetchHealthAndStats = async () => {
      try {
        const health = await checkBackendHealth();
        if (health.online) {
          setSystemStatus({
            postgresql: {
              status: health.engine === 'postgresql' ? 'connected' : 'disconnected',
              label: health.engine === 'postgresql' ? 'Connected (Supabase)' : 'SQLite Local',
              database: 'postgres',
              host: 'Supabase Cloud',
              latencyMs: 18,
            },
            hindsight: {
              status: health.hindsightConfigured ? 'active' : 'offline',
              label: health.hindsightConfigured ? `Active (${health.hindsightBank})` : 'Offline Fallback',
              memoriesRetained: activeMemoryCount,
              cloudRegion: 'us-east (Vectorize)',
            },
            groq: {
              status: health.groqConfigured ? 'ready' : 'busy',
              label: health.groqConfigured ? 'Ready (Sub-second)' : 'Not Configured',
              model: health.primaryModel || 'openai/gpt-oss-120b',
            },
          });
        }

        const memRes = await getRetainedMemories();
        if (memRes.source === 'fastapi' && memRes.data) {
          setActiveMemoryCount(memRes.data.length);
        }
      } catch (err) {
        console.warn('Backend health check error on dashboard:', err);
      }
    };

    fetchHealthAndStats();
  }, []);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Heading: Overview + Date Range Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#142337] tracking-tight">
            Overview
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Database intelligence and institutional learning.
          </p>
        </div>

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

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Queries"
          value={mockDashboardMetrics.totalQueries}
          delta={mockDashboardMetrics.totalQueriesDelta}
          icon={<Database className="w-5 h-5" />}
          accent="powder"
          delay={0}
        />
        <MetricCard
          title="Query Success Rate"
          value={`${mockDashboardMetrics.successRate}%`}
          delta="+6.8 pp"
          icon={<CheckCircle2 className="w-5 h-5" />}
          accent="orange"
          delay={0.05}
        />
        <MetricCard
          title="Corrections Learned"
          value={mockDashboardMetrics.correctionsLearned}
          delta={mockDashboardMetrics.correctionsDelta}
          icon={<Layers className="w-5 h-5" />}
          accent="powder"
          delay={0.1}
        />
        <MetricCard
          title="Active Memories"
          value={activeMemoryCount}
          delta={mockDashboardMetrics.memoriesDelta}
          icon={<BrainCircuit className="w-5 h-5" />}
          accent="orange"
          delay={0.15}
        />
      </div>

      {/* Analytics & System Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5">
          <QueryActivityChart data={mockQueryActivity} />
        </div>
        <div className="lg:col-span-4">
          <QueryResultsDonut
            data={mockQueryResultBreakdown}
            successRate={mockDashboardMetrics.successRate}
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
            queries={mockRecentQueries}
            onSelectQuery={(q) => {
              onSelectQueryForStudio(q);
              onNavigate('query-studio');
            }}
            onViewAll={() => onNavigate('query-studio')}
          />
        </div>
        <div className="lg:col-span-4">
          <RecentLearningList
            items={mockRecentLearning}
            onViewAll={() => onNavigate('learning-history')}
            onSelectRule={() => onNavigate('learning-history')}
          />
        </div>
        <div className="lg:col-span-3">
          <MemoryInsightsCard
            counts={mockMemoryInsightsCounts}
            onOpenMemoryInspector={() => onNavigate('memory-inspector')}
          />
        </div>
      </div>
    </div>
  );
};
