export type MemoryType = 
  | 'business_rule' 
  | 'human_correction' 
  | 'sql_error_fix' 
  | 'deprecated_table' 
  | 'successful_query';

export type VerificationStatus = 'verified' | 'pending' | 'superseded';

export interface Workspace {
  id: string;
  name: string;
  subtitle: string;
  database: string;
  environment: string;
}

export interface SystemStatus {
  postgresql: {
    status: 'connected' | 'disconnected' | 'reconnecting';
    label: string;
    database: string;
    host: string;
    latencyMs: number;
  };
  hindsight: {
    status: 'active' | 'syncing' | 'offline';
    label: string;
    memoriesRetained: number;
    cloudRegion: string;
  };
  groq: {
    status: 'ready' | 'busy';
    label: string;
    model: string;
  };
}

export interface DashboardMetrics {
  totalQueries: number;
  totalQueriesDelta: string;
  successfulQueries: number;
  successRate: number;
  successDelta: string;
  correctionsLearned: number;
  correctionsDelta: string;
  hindsightMemories: number;
  memoriesDelta: string;
}

export interface QueryActivityPoint {
  day: string;
  queries: number;
  successful: number;
  failed: number;
}

export interface QueryResultSegment {
  name: string;
  value: number;
  color: string;
}

export interface ColumnSchema {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
  nullable: boolean;
  description?: string;
}

export interface TableSchema {
  name: string;
  description: string;
  rowCount: number;
  sizeBytes: string;
  columns: ColumnSchema[];
  sampleRows: Record<string, any>[];
  isLiveDatabaseTable?: boolean;
  isDeprecatedTrap?: boolean;
  trapWarning?: string;
}

export interface RetainedMemory {
  id: string;
  type: MemoryType;
  title: string;
  description: string;
  ruleText: string;
  createdAt: string;
  confidenceScore: number;
  timesApplied: number;
  author: string;
  verified: boolean;
  sourceQuery?: string;
  categoryTag: string;
}

export interface RecalledMemory {
  id: string;
  memoryId: string;
  title: string;
  relevanceScore: number; // 0.00 to 1.00
  selectionReason: string;
  queryId: string;
  queryText: string;
  timestamp: string;
  appliedRule: string;
}

export interface ReflectedKnowledge {
  id: string;
  theme: string;
  synthesizedFact: string;
  confidence: number;
  supportingEvidence: string[];
  impactScope: string;
  lastReflected: string;
}

export interface MentalModel {
  id: string;
  domain: string;
  title: string;
  description: string;
  rulesIncluded: number;
  refreshStatus: 'synced' | 'evaluating' | 'stale';
  lastUpdatedAt: string;
  corePrinciples: string[];
}

export interface LearningEvent {
  id: string;
  timestamp: string;
  originalQuery: string;
  mistakeOrCorrection: string;
  employeeExplanation: string;
  resultingBusinessRule: string;
  correctedSql: string;
  memoryStatus: 'active' | 'retained' | 'superseded';
  verificationStatus: VerificationStatus;
  author: {
    name: string;
    role: string;
  };
  tableAffected: string;
  tags: string[];
}

export interface QueryHistoryItem {
  id: string;
  query: string;
  status: 'success' | 'failed' | 'pending';
  timestamp: string;
  executionTimeMs: number;
  rulesRecalledCount: number;
}

export interface QueryExecutionResult {
  id: string;
  naturalQuery: string;
  status: 'idle' | 'generating' | 'generated' | 'executing' | 'success' | 'failed';
  generatedSql: string;
  executionTimeMs?: number;
  rowCount?: number;
  recalledMemories: RetainedMemory[];
  businessRulesUsed: string[];
  explanation: string;
  columns: string[];
  rows: Record<string, any>[];
  chartSuggestion?: {
    type: 'bar' | 'line' | 'pie';
    xKey: string;
    yKey: string;
    title: string;
  };
  error?: string;
  demoDataNotice: string;
  useMemory?: boolean;
  modelUsed?: string;
}

export type PageView = 
  | 'dashboard' 
  | 'query-studio' 
  | 'database-explorer' 
  | 'memory-inspector' 
  | 'learning-history' 
  | 'comparison-view' 
  | 'settings';

