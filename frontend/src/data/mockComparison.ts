export interface ComparisonScenario {
  id: string;
  title: string;
  category: string;
  userPrompt: string;
  withoutMemory: {
    status: 'INACCURATE' | 'RUNTIME_ERROR' | 'DEPRECATED_SCHEMA';
    statusLabel: string;
    sql: string;
    shortcomings: string[];
    financialOrDataImpact: string;
    sampleResultSummary: string;
  };
  withMemory: {
    status: 'OPTIMIZED & ACCURATE';
    statusLabel: string;
    sql: string;
    recalledKnowledge: {
      id: string;
      title: string;
      ruleText: string;
    }[];
    improvements: string[];
    accuracyGain: string;
    sampleResultSummary: string;
  };
}

export const comparisonScenarios: ComparisonScenario[] = [
  {
    id: 'comp-1',
    title: 'Net Revenue Calculation',
    category: 'Corporate Finance',
    userPrompt: 'Calculate net revenue from premium customers.',
    withoutMemory: {
      status: 'INACCURATE',
      statusLabel: 'Critical Revenue Skew (+$41,300)',
      sql: `-- Generic LLM (No Hindsight Memory)
SELECT 
  c.first_name,
  c.last_name,
  SUM(o.gross_amount) AS revenue
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
WHERE c.lifetime_value > 1000 -- Naive guess of "premium"
GROUP BY c.customer_id, c.first_name, c.last_name;`,
      shortcomings: [
        'Included 18 CANCELLED orders that never generated cash receipts.',
        'Did not join refunds table; missed $41,300 in customer chargebacks.',
        'Arbitrarily guessed "lifetime_value > 1000" instead of NovaMart Gold/Platinum segment rules.',
        'Overstated company net revenue by 16.4%.',
      ],
      financialOrDataImpact: 'Overreported net revenue by $41,300; would lead to false quarterly earnings filings.',
      sampleResultSummary: 'Calculated: $2,162,500 (Overstated)',
    },
    withMemory: {
      status: 'OPTIMIZED & ACCURATE',
      statusLabel: 'GAAP Compliant & Audited',
      sql: `-- TribalSQL with Hindsight Memory
-- Recalled mem-001 (Net Revenue standard) + mem-002 (Premium definition)
SELECT 
  cs.segment_name,
  COUNT(DISTINCT o.order_id) AS total_orders,
  ROUND(SUM(o.gross_amount), 2) AS gross_revenue,
  ROUND(COALESCE(SUM(r.refund_amount), 0), 2) AS total_refunds,
  ROUND(SUM(o.gross_amount) - COALESCE(SUM(r.refund_amount), 0), 2) AS net_revenue
FROM customers c
JOIN customer_segments cs ON c.segment_id = cs.segment_id
JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN refunds r ON o.order_id = r.order_id
WHERE o.status != 'CANCELLED'
  AND (c.segment_id IN ('SEG_GOLD', 'SEG_PLATINUM') OR c.lifetime_value >= 50000)
GROUP BY cs.segment_name, cs.vip_tier_rank
ORDER BY net_revenue DESC;`,
      recalledKnowledge: [
        {
          id: 'mem-001',
          title: 'Net Revenue Computation Rule',
          ruleText: 'Net Revenue = Gross Amount minus refunds from refunds table. Exclude orders where status = "CANCELLED".',
        },
        {
          id: 'mem-002',
          title: 'Premium Customer Identification Rule',
          ruleText: 'Premium = segment_id IN ("SEG_GOLD", "SEG_PLATINUM") OR lifetime_value >= $50,000.',
        },
      ],
      improvements: [
        'Automated LEFT JOIN to refunds table ensures GAAP refund reconciliation.',
        'Filtered out cancelled orders using strict institutional business rule.',
        'Correctly unioned Gold and Platinum tiers with $50k LTV thresholds.',
        'Exact match with audited financial ledgers.',
      ],
      accuracyGain: '+100% adherence to corporate finance policy',
      sampleResultSummary: 'Calculated: $2,101,200 (100% Verified)',
    },
  },
  {
    id: 'comp-2',
    title: 'Product Revenue Query (Schema Deprecation)',
    category: 'Data Governance',
    userPrompt: 'Which five products generated the highest revenue?',
    withoutMemory: {
      status: 'DEPRECATED_SCHEMA',
      statusLabel: 'Hallucinated Legacy Table',
      sql: `-- Generic LLM (No Hindsight Memory)
SELECT 
  product_id,
  product_name,
  SUM(amount) AS total_sales
FROM orders_legacy -- DEPRECATED TABLE!
GROUP BY product_id, product_name
ORDER BY total_sales DESC
LIMIT 5;`,
      shortcomings: [
        'Queried "orders_legacy" which ceased updates in 2024.',
        'Lacks any sales figures from recent 2025/2026 product catalog.',
        'Ignored item-level discount structures.',
      ],
      financialOrDataImpact: 'Data is 2 years stale; ignores modern flagship products.',
      sampleResultSummary: 'Returned stale 2024 products (Wrong catalog)',
    },
    withMemory: {
      status: 'OPTIMIZED & ACCURATE',
      statusLabel: 'Modern Schema Enforced',
      sql: `-- TribalSQL with Hindsight Memory
-- Recalled mem-003: orders_legacy is deprecated. Route to order_items + products.
SELECT 
  p.product_id,
  p.product_name,
  p.category,
  SUM(oi.quantity) AS units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price - oi.discount_amount), 2) AS total_realized_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'COMPLETED'
GROUP BY p.product_id, p.product_name, p.category
ORDER BY total_realized_revenue DESC
LIMIT 5;`,
      recalledKnowledge: [
        {
          id: 'mem-003',
          title: 'Deprecated Schema: orders_legacy',
          ruleText: 'Reject queries targeting orders_legacy. Route to order_items joined with products and orders.',
        },
      ],
      improvements: [
        'Zero schema hallucinations; strictly enforced active tables.',
        'Subtracted line-item discount amounts for true realized revenue.',
        'Correctly identified NovaBook Max 16 as top 2026 revenue driver.',
      ],
      accuracyGain: 'Current 2026 active database catalog',
      sampleResultSummary: 'Returned Top 2026 Products ($1.64M top item)',
    },
  },
  {
    id: 'comp-3',
    title: 'Refund Rate Calculation (SQL Safety)',
    category: 'SQL Reliability',
    userPrompt: 'Which products have the highest refund rate?',
    withoutMemory: {
      status: 'RUNTIME_ERROR',
      statusLabel: 'PostgreSQL Error 22012 Crash',
      sql: `-- Generic LLM (No Hindsight Memory)
SELECT 
  p.product_name,
  (COUNT(r.refund_id) / COUNT(o.order_id)) * 100 AS refund_rate -- CRASH!
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
LEFT JOIN refunds r ON o.order_id = r.order_id
GROUP BY p.product_name
ORDER BY refund_rate DESC;`,
      shortcomings: [
        'Unprotected division by zero when product has 0 orders.',
        'Executed in production and crashed with PostgreSQL error code 22012.',
        'Failed to return any results to the user.',
      ],
      financialOrDataImpact: 'Database error thrown directly to end-user UI; zero insights delivered.',
      sampleResultSummary: 'Error: division by zero (22012)',
    },
    withMemory: {
      status: 'OPTIMIZED & ACCURATE',
      statusLabel: 'Auto Self-Healed with NULLIF',
      sql: `-- TribalSQL with Hindsight Memory
-- Recalled mem-004: Division by zero prevention learned from previous error.
SELECT 
  p.product_id,
  p.product_name,
  p.category,
  COUNT(DISTINCT o.order_id) AS total_orders,
  COUNT(DISTINCT r.refund_id) AS total_refunds,
  ROUND(
    COALESCE(COUNT(DISTINCT r.refund_id)::NUMERIC / NULLIF(COUNT(DISTINCT o.order_id), 0) * 100, 0),
    2
  ) AS refund_rate_pct
FROM products p
JOIN order_items oi ON p.product_id = oi.product_id
JOIN orders o ON oi.order_id = o.order_id
LEFT JOIN refunds r ON o.order_id = r.order_id
GROUP BY p.product_id, p.product_name, p.category
HAVING COUNT(DISTINCT o.order_id) >= 10
ORDER BY refund_rate_pct DESC
LIMIT 5;`,
      recalledKnowledge: [
        {
          id: 'mem-004',
          title: 'Division by Zero Prevention in Refund Rates',
          ruleText: 'Always wrap refund rate denominators with NULLIF(total_orders, 0) to prevent PostgreSQL error 22012.',
        },
      ],
      improvements: [
        'Safe arithmetic protected by NULLIF and COALESCE.',
        'HAVING filter ensures statistical significance (≥ 10 orders).',
        'Flawless execution with zero downtime or crash.',
      ],
      accuracyGain: '100% execution reliability, 0 crashes',
      sampleResultSummary: 'Successfully isolated Nova Pro ANC Headphones (6.90% return rate)',
    },
  },
];

