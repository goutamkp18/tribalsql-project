import { QueryExecutionResult } from '../types';
import { mockRetainedMemories } from './mockMemories';

export interface PresetQuery {
  id: string;
  question: string;
  category: string;
  result: QueryExecutionResult;
}

export const presetQueries: PresetQuery[] = [
  {
    id: 'pq-1',
    question: 'Calculate net revenue from premium customers.',
    category: 'Finance & Segments',
    result: {
      id: 'res-pq-1',
      naturalQuery: 'Calculate net revenue from premium customers.',
      status: 'success',
      executionTimeMs: 142,
      rowCount: 2,
      recalledMemories: [
        mockRetainedMemories[0], // Net Revenue Computation Rule
        mockRetainedMemories[1], // Premium Customer Identification Rule
      ],
      businessRulesUsed: [
        'Excludes orders with status = "CANCELLED"',
        'Deducts associated refunds from the refunds table using LEFT JOIN',
        'Defines premium customers as segment_id IN ("SEG_GOLD", "SEG_PLATINUM") OR lifetime_value >= $50,000',
      ],
      generatedSql: `-- Recalled Hindsight Memories:
-- 1. Net Revenue Rule (ID: mem-001): Gross billing minus refunds, excluding CANCELLED orders.
-- 2. Premium Customer Rule (ID: mem-002): Tier GOLD/PLATINUM or LTV >= 50,000.

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
      explanation: 'TribalSQL recalled two active institutional memories: (1) CFO Office rule requiring deduction of refunds and exclusion of cancelled orders, and (2) Growth team rule specifying that premium accounts include both Platinum and Gold tiers plus high-LTV accounts. It joined customers, customer_segments, orders, and refunds safely.',
      columns: ['segment_name', 'total_orders', 'gross_revenue', 'total_refunds', 'net_revenue'],
      rows: [
        { segment_name: 'Platinum VIP', total_orders: 842, gross_revenue: 1248000.00, total_refunds: 18200.00, net_revenue: 1229800.00 },
        { segment_name: 'Gold Executive', total_orders: 1420, gross_revenue: 894500.00, total_refunds: 23100.00, net_revenue: 871400.00 },
      ],
      chartSuggestion: {
        type: 'bar',
        xKey: 'segment_name',
        yKey: 'net_revenue',
        title: 'Net Revenue by Premium Segment ($ USD)',
      },
      demoDataNotice: 'Executed in simulated NovaMart environment with Hindsight memory recall.',
    },
  },
  {
    id: 'pq-2',
    question: 'Which five products generated the highest revenue?',
    category: 'Product Performance',
    result: {
      id: 'res-pq-2',
      naturalQuery: 'Which five products generated the highest revenue?',
      status: 'success',
      executionTimeMs: 198,
      rowCount: 5,
      recalledMemories: [
        mockRetainedMemories[2], // Deprecated Schema: orders_legacy
        mockRetainedMemories[5], // Product Unit Gross Margin
      ],
      businessRulesUsed: [
        'Avoids orders_legacy; queries modern order_items joined with products',
        'Only counts COMPLETED orders within active catalog items',
        'Accounts for item-level discounts: (quantity * unit_price) - discount_amount',
      ],
      generatedSql: `-- Recalled Hindsight Memories:
-- 1. Schema Guardrail (ID: mem-003): Enforce unified "order_items" table over deprecated "orders_legacy".
-- 2. Revenue Accuracy: Deduct item-level promotional discount amounts.

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
      explanation: 'TribalSQL avoided querying the legacy tables due to retained memory mem-003, and correctly aggregated revenue at the order item level subtracting applied promotional discounts.',
      columns: ['product_id', 'product_name', 'category', 'units_sold', 'total_realized_revenue'],
      rows: [
        { product_id: 'prod-104', product_name: 'NovaBook Max 16 M-Studio', category: 'Computing', units_sold: 142, total_realized_revenue: 1645000.00 },
        { product_id: 'prod-101', product_name: 'Nova Pro ANC Headphones', category: 'Audio', units_sold: 840, total_realized_revenue: 1390400.00 },
        { product_id: 'prod-105', product_name: 'AcousticWave Soundbar', category: 'Audio', units_sold: 520, total_realized_revenue: 1042000.00 },
        { product_id: 'prod-103', product_name: 'PulseTrack GPS Smartwatch', category: 'Wearables', units_sold: 790, total_realized_revenue: 785400.00 },
        { product_id: 'prod-102', product_name: 'Swift Charge Ultra 100W', category: 'Accessories', units_sold: 1250, total_realized_revenue: 694000.00 },
      ],
      chartSuggestion: {
        type: 'bar',
        xKey: 'product_name',
        yKey: 'total_realized_revenue',
        title: 'Top 5 Products by Realized Revenue ($ USD)',
      },
      demoDataNotice: 'Executed in simulated NovaMart environment with Hindsight memory recall.',
    },
  },
  {
    id: 'pq-3',
    question: 'Show monthly sales for the previous quarter.',
    category: 'Sales Trends',
    result: {
      id: 'res-pq-3',
      naturalQuery: 'Show monthly sales for the previous quarter.',
      status: 'success',
      executionTimeMs: 165,
      rowCount: 3,
      recalledMemories: [
        mockRetainedMemories[0], // Net Revenue Computation Rule
        mockRetainedMemories[4], // Performance join index pattern
      ],
      businessRulesUsed: [
        'Groups order_date by month using DATE_TRUNC("month", o.order_date)',
        'Filters for previous calendar quarter (Q3 2026: Jul 1 to Sep 30)',
        'Excludes cancelled and disputed orders',
      ],
      generatedSql: `-- Recalled Hindsight Memories:
-- 1. Performance Join Pattern (ID: mem-005): Optimal DATE_TRUNC with index on orders.order_date.
-- 2. Finance Rule: Exclude CANCELLED transactions.

SELECT 
  TO_CHAR(DATE_TRUNC('month', o.order_date), 'Mon YYYY') AS month_label,
  COUNT(DISTINCT o.order_id) AS order_volume,
  ROUND(SUM(o.gross_amount), 2) AS gross_sales,
  ROUND(SUM(o.gross_amount) - COALESCE(SUM(r.refund_amount), 0), 2) AS net_sales
FROM orders o
LEFT JOIN refunds r ON o.order_id = r.order_id
WHERE o.order_date >= '2026-07-01'::DATE 
  AND o.order_date < '2026-10-01'::DATE
  AND o.status != 'CANCELLED'
GROUP BY DATE_TRUNC('month', o.order_date)
ORDER BY DATE_TRUNC('month', o.order_date) ASC;`,
      explanation: 'Filtered by the strict calendar boundaries of Q3 2026. Applied corporate net sales formula deducting refunds and excluding cancellations.',
      columns: ['month_label', 'order_volume', 'gross_sales', 'net_sales'],
      rows: [
        { month_label: 'Jul 2026', order_volume: 4820, gross_sales: 642000.00, net_sales: 618500.00 },
        { month_label: 'Aug 2026', order_volume: 5310, gross_sales: 719400.00, net_sales: 694100.00 },
        { month_label: 'Sep 2026', order_volume: 5940, gross_sales: 825100.00, net_sales: 798400.00 },
      ],
      chartSuggestion: {
        type: 'line',
        xKey: 'month_label',
        yKey: 'net_sales',
        title: 'Monthly Net Sales (Q3 2026)',
      },
      demoDataNotice: 'Executed in simulated NovaMart environment with Hindsight memory recall.',
    },
  },
  {
    id: 'pq-4',
    question: 'Which products have the highest refund rate?',
    category: 'Quality & Risk',
    result: {
      id: 'res-pq-4',
      naturalQuery: 'Which products have the highest refund rate?',
      status: 'success',
      executionTimeMs: 310,
      rowCount: 5,
      recalledMemories: [
        mockRetainedMemories[3], // Division by Zero Prevention
      ],
      businessRulesUsed: [
        'Wraps denominator in NULLIF to prevent division by zero runtime crash',
        'Minimum threshold of 10 orders to eliminate skew from single-order anomalies',
        'Calculates refund percentage: (refund_count / order_count) * 100',
      ],
      generatedSql: `-- Recalled Hindsight Memories:
-- 1. SQL Error Guardrail (ID: mem-004): Division by zero guardrail using NULLIF.
-- Prevents Postgres error 22012 when products have minimal sales.

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
      explanation: 'TribalSQL recalled an automated exception memory (mem-004) preventing Postgres error 22012 by wrapping the denominator in NULLIF. It filtered for products with at least 10 orders to ensure statistical relevance.',
      columns: ['product_name', 'category', 'total_orders', 'total_refunds', 'refund_rate_pct'],
      rows: [
        { product_name: 'Nova Pro ANC Headphones', category: 'Audio', total_orders: 840, total_refunds: 58, refund_rate_pct: 6.90 },
        { product_name: 'AcousticWave Soundbar', category: 'Audio', total_orders: 520, total_refunds: 29, refund_rate_pct: 5.58 },
        { product_name: 'PulseTrack GPS Smartwatch', category: 'Wearables', total_orders: 790, total_refunds: 34, refund_rate_pct: 4.30 },
        { product_name: 'Swift Charge Ultra 100W', category: 'Accessories', total_orders: 1250, total_refunds: 21, refund_rate_pct: 1.68 },
        { product_name: 'NovaBook Max 16 M-Studio', category: 'Computing', total_orders: 142, total_refunds: 2, refund_rate_pct: 1.41 },
      ],
      chartSuggestion: {
        type: 'bar',
        xKey: 'product_name',
        yKey: 'refund_rate_pct',
        title: 'Product Refund Rate (%)',
      },
      demoDataNotice: 'Executed in simulated NovaMart environment with Hindsight memory recall.',
    },
  },
  {
    id: 'pq-5',
    question: 'Compare revenue across customer segments.',
    category: 'Customer Intelligence',
    result: {
      id: 'res-pq-5',
      naturalQuery: 'Compare revenue across customer segments.',
      status: 'success',
      executionTimeMs: 172,
      rowCount: 4,
      recalledMemories: [
        mockRetainedMemories[0], // Net Revenue
        mockRetainedMemories[1], // Premium Customer Identification Rule
      ],
      businessRulesUsed: [
        'Groups by all active segments in customer_segments hierarchy',
        'Calculates average revenue per customer (ARPU) within each tier',
        'Excludes cancelled orders and incorporates refund deductions',
      ],
      generatedSql: `-- Recalled Hindsight Memories:
-- 1. Net Revenue standard with refunds.
-- 2. Customer segmentation master link via customer_segments.

SELECT 
  cs.segment_name,
  COUNT(DISTINCT c.customer_id) AS total_customers,
  ROUND(SUM(o.gross_amount) - COALESCE(SUM(r.refund_amount), 0), 2) AS net_revenue,
  ROUND((SUM(o.gross_amount) - COALESCE(SUM(r.refund_amount), 0)) / COUNT(DISTINCT c.customer_id), 2) AS arpu
FROM customer_segments cs
JOIN customers c ON cs.segment_id = c.segment_id
JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN refunds r ON o.order_id = r.order_id
WHERE o.status != 'CANCELLED'
GROUP BY cs.segment_name, cs.vip_tier_rank
ORDER BY cs.vip_tier_rank ASC;`,
      explanation: 'Evaluated full customer segment spectrum from Platinum VIP down to Bronze Standard, displaying net revenue alongside Average Revenue Per User (ARPU).',
      columns: ['segment_name', 'total_customers', 'net_revenue', 'arpu'],
      rows: [
        { segment_name: 'Platinum VIP', total_customers: 245, net_revenue: 1229800.00, arpu: 5019.59 },
        { segment_name: 'Gold Executive', total_customers: 1240, net_revenue: 871400.00, arpu: 702.74 },
        { segment_name: 'Silver Preferred', total_customers: 6820, net_revenue: 640100.00, arpu: 93.86 },
        { segment_name: 'Bronze Standard', total_customers: 16215, net_revenue: 312500.00, arpu: 19.27 },
      ],
      chartSuggestion: {
        type: 'pie',
        xKey: 'segment_name',
        yKey: 'net_revenue',
        title: 'Revenue Distribution by Customer Tier',
      },
      demoDataNotice: 'Executed in simulated NovaMart environment with Hindsight memory recall.',
    },
  },
];

