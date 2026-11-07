import { apiFetch, ApiResponse } from './api';
import { 
  DashboardMetrics, 
  QueryActivityPoint, 
  QueryResultSegment, 
  QueryHistoryItem 
} from '../types';

export interface RecentLearningItem {
  id: string;
  rule: string;
  status: string;
  timestamp: string;
  type: string;
  appliedCount?: number;
}

export interface MemoryInsightsCounts {
  businessRules: number;
  sqlFixes: number;
  worldFacts: number;
  mentalModels: number;
}

export interface DashboardAnalyticsPayload {
  database_engine: string;
  metrics: DashboardMetrics;
  queryActivity: QueryActivityPoint[];
  queryOutcomes: QueryResultSegment[];
  recentQueries: QueryHistoryItem[];
  recentLearning: RecentLearningItem[];
  memoryInsights: MemoryInsightsCounts;
  hindsight: {
    configured: boolean;
    bank_id: string;
    active_memories: number;
    status: string;
    type_counts: {
      world: number;
      experience: number;
      observation: number;
    };
    error: string | null;
  };
}

export async function getDashboardAnalytics(days: number = 7): Promise<ApiResponse<DashboardAnalyticsPayload>> {
  return apiFetch<DashboardAnalyticsPayload>(
    `/api/dashboard/analytics?days=${days}`,
    {
      method: 'GET',
    },
    async () => {
      // In mock mode only: provide a realistic empty/baseline schema
      return {
        database_engine: 'mock',
        metrics: {
          totalQueries: 0,
          totalQueriesDelta: '0%',
          successfulQueries: 0,
          successRate: 0,
          successDelta: '0%',
          correctionsLearned: 0,
          correctionsDelta: '+0',
          hindsightMemories: 0,
          memoriesDelta: '+0',
        },
        queryActivity: [],
        queryOutcomes: [
          { name: 'Successful', value: 0, color: '#F45B0B' },
          { name: 'Failed', value: 0, color: '#A8C9C8' },
        ],
        recentQueries: [],
        recentLearning: [],
        memoryInsights: {
          businessRules: 0,
          sqlFixes: 0,
          worldFacts: 0,
          mentalModels: 0,
        },
        hindsight: {
          configured: false,
          bank_id: 'novamart-prod-db',
          active_memories: 0,
          status: 'unavailable',
          type_counts: { world: 0, experience: 0, observation: 0 },
          error: null,
        },
      };
    }
  );
}

