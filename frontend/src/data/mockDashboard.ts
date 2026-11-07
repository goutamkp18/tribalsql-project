import { DashboardMetrics, QueryActivityPoint, QueryResultSegment, SystemStatus, QueryHistoryItem } from '../types';

export const mockDashboardMetrics: DashboardMetrics = {
  totalQueries: 248,
  totalQueriesDelta: '+32%',
  successfulQueries: 221,
  successRate: 89.1,
  successDelta: '+89.1%',
  correctionsLearned: 18,
  correctionsDelta: '+6',
  hindsightMemories: 56,
  memoriesDelta: '+14',
};

export const mockQueryActivity: QueryActivityPoint[] = [
  { day: 'Nov 1', queries: 12, successful: 11, failed: 1 },
  { day: 'Nov 2', queries: 25, successful: 22, failed: 3 },
  { day: 'Nov 3', queries: 18, successful: 16, failed: 2 },
  { day: 'Nov 4', queries: 31, successful: 28, failed: 3 },
  { day: 'Nov 5', queries: 24, successful: 21, failed: 3 },
  { day: 'Nov 6', queries: 42, successful: 39, failed: 3 },
  { day: 'Nov 7', queries: 28, successful: 26, failed: 2 },
];

export const mockQueryResultBreakdown: QueryResultSegment[] = [
  { name: 'Successful', value: 221, color: '#10B981' },
  { name: 'Failed', value: 17, color: '#F43F5E' },
  { name: 'Pending', value: 10, color: '#64748B' },
];

export const mockSystemStatus: SystemStatus = {
  postgresql: {
    status: 'connected',
    label: 'Connected',
    database: 'novamart_prod_db',
    host: 'aurora-pg.novamart.internal',
    latencyMs: 14,
  },
  hindsight: {
    status: 'active',
    label: 'Active',
    memoriesRetained: 56,
    cloudRegion: 'us-east-1 (Hindsight Cluster #4)',
  },
  groq: {
    status: 'ready',
    label: 'Ready',
    model: 'qwen3-32b-fast',
  },
};

export const mockRecentQueries: QueryHistoryItem[] = [
  {
    id: 'q-101',
    query: 'Calculate net revenue from premium customers.',
    status: 'success',
    timestamp: '2 min ago',
    executionTimeMs: 142,
    rulesRecalledCount: 3,
  },
  {
    id: 'q-102',
    query: 'Top 5 products by revenue last month.',
    status: 'success',
    timestamp: '7 min ago',
    executionTimeMs: 198,
    rulesRecalledCount: 2,
  },
  {
    id: 'q-103',
    query: 'Show refund rate by product category.',
    status: 'success',
    timestamp: '14 min ago',
    executionTimeMs: 310,
    rulesRecalledCount: 4,
  },
  {
    id: 'q-104',
    query: 'Monthly sales comparison by segment.',
    status: 'failed',
    timestamp: '19 min ago',
    executionTimeMs: 84,
    rulesRecalledCount: 1,
  },
];

export const mockRecentLearning = [
  {
    id: 'learn-01',
    rule: 'Net revenue excludes cancelled orders and deducts refunds.',
    status: 'Verified',
    timestamp: '5 min ago',
    type: 'Business Rule',
    appliedCount: 48,
  },
  {
    id: 'learn-02',
    rule: 'orders_legacy table is deprecated. Use orders table.',
    status: 'Verified',
    timestamp: '18 min ago',
    type: 'Schema Deprecation',
    appliedCount: 29,
  },
  {
    id: 'learn-03',
    rule: 'Premium customers are identified as GOLD tier or LTV ≥ 50,000.',
    status: 'Verified',
    timestamp: '32 min ago',
    type: 'Customer Definition',
    appliedCount: 63,
  },
];

export const mockMemoryInsightsCounts = {
  businessRules: 12,
  sqlFixes: 24,
  worldFacts: 8,
  mentalModels: 4,
};

