import { apiFetch, ApiResponse } from './api';
import { QueryExecutionResult, RetainedMemory } from '../types';
import { presetQueries } from '../data/mockQueryStudio';
import { mockRetainedMemories } from '../data/mockMemories';

export async function generateSQL(naturalQuery: string, useMemory: boolean = true): Promise<ApiResponse<QueryExecutionResult>> {
  const response = await apiFetch<any>(
    '/api/query',
    {
      method: 'POST',
      body: JSON.stringify({
        question: naturalQuery,
        use_memory: useMemory,
      }),
    },
    async () => {
      // Find matching preset or generate dynamic intelligent response
      const clean = naturalQuery.trim().toLowerCase();
      
      // If mock mode and memory is turned OFF (Cold Start simulation)
      if (!useMemory) {
        return {
          id: `cold-q-${Date.now()}`,
          naturalQuery,
          status: 'success',
          executionTimeMs: 142,
          rowCount: 1,
          recalledMemories: [],
          businessRulesUsed: [
            'None (Cold Start - Baseline raw schema DDL only)',
          ],
          generatedSql: `-- Baseline Cold-Start (No Memory Applied)
-- Notice: Uses deprecated customers.account_type, fails to exclude test accounts, ignores refunds

SELECT 
  COALESCE(SUM(o.total_amount), 0) - COALESCE(SUM(r.refund_amount), 0) AS net_revenue
FROM orders o
JOIN customers c ON o.customer_id = c.id
LEFT JOIN refunds r ON r.order_id = o.id
WHERE c.account_type = 'premium';`,
          explanation: 'Cold Start (Schema Only): The agent queried solely against the raw schema DDL. Without Hindsight memory, it fell into the deprecated account_type trap and internal test account traps, resulting in inflated revenue.',
          columns: ['net_revenue'],
          rows: [{ net_revenue: 78150.00 }],
          demoDataNotice: '🧪 SIMULATED MOCK (Cold Start): Baseline schema query with Hindsight Memory OFF.',
          useMemory: false,
        };
      }

      const match = presetQueries.find(p => 
        clean.includes(p.question.toLowerCase().slice(0, 15)) ||
        p.question.toLowerCase().includes(clean.slice(0, 15))
      );

      if (match) {
        return {
          ...match.result,
          naturalQuery,
          useMemory: true,
        };
      }

      // Dynamic fallback for custom user queries
      return {
        id: `dyn-q-${Date.now()}`,
        naturalQuery,
        status: 'success',
        executionTimeMs: 184,
        rowCount: 3,
        recalledMemories: [
          mockRetainedMemories[0],
          mockRetainedMemories[1],
        ],
        businessRulesUsed: [
          'Excludes CANCELLED orders per corporate GAAP policy',
          'Recalled NovaMart customer segment definitions (Gold & Platinum)',
          'Applied safe NULLIF on aggregate ratios',
        ],
        generatedSql: `-- Dynamically generated for: "${naturalQuery}"
-- Recalled Hindsight Memories: mem-001 (Net Revenue), mem-002 (VIP Segment Rules)

SELECT 
  c.first_name || ' ' || c.last_name AS customer_name,
  cs.segment_name,
  COUNT(o.order_id) AS total_orders,
  ROUND(SUM(o.gross_amount) - COALESCE(SUM(r.refund_amount), 0), 2) AS calculated_net_revenue
FROM customers c
JOIN customer_segments cs ON c.segment_id = cs.segment_id
JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN refunds r ON o.order_id = r.order_id
WHERE o.status != 'CANCELLED'
GROUP BY c.customer_id, c.first_name, c.last_name, cs.segment_name
ORDER BY calculated_net_revenue DESC
LIMIT 10;`,
        explanation: `TribalSQL interpreted your natural language prompt against NovaMart schema and applied 2 institutional memory guardrails (Net revenue refund subtraction and segment joins).`,
        columns: ['customer_name', 'segment_name', 'total_orders', 'calculated_net_revenue'],
        rows: [
          { customer_name: 'Priya Nair', segment_name: 'Platinum VIP', total_orders: 28, calculated_net_revenue: 112450.50 },
          { customer_name: 'Ananya Deshmukh', segment_name: 'Gold Executive', total_orders: 19, calculated_net_revenue: 73900.25 },
          { customer_name: 'Aarav Sharma', segment_name: 'Gold Executive', total_orders: 14, calculated_net_revenue: 58240.00 },
        ],
        chartSuggestion: {
          type: 'bar',
          xKey: 'customer_name',
          yKey: 'calculated_net_revenue',
          title: 'Top Accounts by Calculated Net Revenue ($ USD)',
        },
        demoDataNotice: '🧪 SIMULATED MOCK: Executed in mock demonstration mode.',
        useMemory: true,
      };
    }
  );

  // When live FastAPI backend responds, map properties to the UI's QueryExecutionResult interface
  if (response.source === 'fastapi' && response.data) {
    const raw = response.data;
    const rows: Record<string, any>[] = raw.results || (raw.execution && raw.execution.rows) || raw.rows || [];
    const columns: string[] = (rows.length > 0)
      ? Object.keys(rows[0])
      : ((raw.execution && raw.execution.columns) || raw.columns || []);

    const rawMemories = (raw.memory_inspector && raw.memory_inspector.recalled_memories) || raw.recalledMemories || [];
    const recalledMemories: RetainedMemory[] = rawMemories.map((m: any, idx: number) => ({
      id: m.id || `mem-${idx + 1}`,
      type: (m.type as any) || 'business_rule',
      title: m.text ? (m.text.slice(0, 45) + '...') : (m.title || 'Recalled Rule'),
      description: m.context || m.description || 'Recalled from Hindsight Cloud Memory',
      ruleText: m.text || m.content || m.ruleText || '',
      createdAt: m.timestamp || new Date().toISOString(),
      confidenceScore: m.score || 0.98,
      timesApplied: 1,
      author: 'Hindsight Memory Engine',
      verified: true,
      categoryTag: (m.metadata && m.metadata.category) || 'NovaMart Policy'
    }));

    const businessRules = raw.applied_rules || raw.businessRulesUsed || (
      raw.memory_inspector?.synthesized_playbook 
        ? raw.memory_inspector.synthesized_playbook.split('\n').filter((l: string) => l.trim().length > 0)
        : []
    );

    const actualUseMemory = raw.use_memory !== undefined ? raw.use_memory : useMemory;

    const adapted: QueryExecutionResult = {
      id: raw.id || `q-${Date.now()}`,
      naturalQuery: naturalQuery,
      status: raw.sqlglot_valid !== false ? 'success' : 'failed',
      generatedSql: raw.sql || raw.generatedSql || '',
      executionTimeMs: raw.execution_time_ms ?? (raw.execution?.execution_time_ms ?? 120),
      rowCount: raw.row_count ?? (raw.execution?.row_count ?? rows.length),
      columns,
      rows,
      recalledMemories,
      businessRulesUsed: businessRules,
      explanation: raw.explanation || (raw.sqlglot_valid ? 'Verified read-only query validated with SQLGlot AST.' : 'Execution completed.'),
      error: raw.error,
      demoDataNotice: actualUseMemory 
        ? '⚡ LIVE LEARNED QUERY: Verified against NovaMart PostgreSQL via Groq LLM & Hindsight Cloud.'
        : '⚠️ LIVE COLD START: Generated without Hindsight Memory (Baseline Schema DDL Only).',
      useMemory: actualUseMemory,
      modelUsed: raw.model_used
    };

    return {
      ...response,
      data: adapted
    };
  }

  return response;
}

export async function executeSQL(sql: string): Promise<ApiResponse<{ rows: any[]; columns: string[]; executionTimeMs: number }>> {
  const response = await apiFetch<any>(
    '/api/execute-sql',
    {
      method: 'POST',
      body: JSON.stringify({ sql }),
    },
    async () => {
      // Mock execution delay
      return {
        columns: ['segment_name', 'total_orders', 'gross_revenue', 'total_refunds', 'net_revenue'],
        rows: [
          { segment_name: 'Platinum VIP', total_orders: 842, gross_revenue: 1248000.00, total_refunds: 18200.00, net_revenue: 1229800.00 },
          { segment_name: 'Gold Executive', total_orders: 1420, gross_revenue: 894500.00, total_refunds: 23100.00, net_revenue: 871400.00 },
        ],
        executionTimeMs: 148,
      };
    }
  );

  if (response.source === 'fastapi' && response.data) {
    const raw = response.data;
    return {
      ...response,
      data: {
        rows: raw.rows || raw.results || [],
        columns: raw.columns || ((raw.rows && raw.rows.length > 0) ? Object.keys(raw.rows[0]) : []),
        executionTimeMs: raw.execution_time_ms ?? raw.executionTimeMs ?? 110
      }
    };
  }

  return response;
}

export async function explainSQL(sql: string): Promise<ApiResponse<{ explanation: string; rules: string[] }>> {
  return apiFetch(
    '/api/query',
    {
      method: 'POST',
      body: JSON.stringify({ question: `Explain this SQL: ${sql}`, use_memory: true }),
    },
    async () => {
      return {
        explanation: 'The query evaluates customer orders against active refund line-items. It applies index scans on order_id and customer_id, aggregates revenue grouping by customer segment tier, and strips out all cancelled order headers.',
        rules: [
          'Filter out orders with status = CANCELLED',
          'Left join refunds to deduct settled returns',
          'Group by customer_segments.vip_tier_rank for index ordering',
        ],
      };
    }
  );
}
