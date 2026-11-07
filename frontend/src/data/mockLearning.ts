import { LearningEvent } from '../types';

export const mockLearningEvents: LearningEvent[] = [
  {
    id: 'lrn-001',
    timestamp: '2026-11-06 14:32:10',
    originalQuery: 'Calculate net revenue from premium customers.',
    mistakeOrCorrection: 'Original SQL summed orders.gross_amount directly without subtracting refunds and included CANCELLED orders.',
    employeeExplanation: 'Net revenue must exclude cancelled orders and subtract refunds from the refunds table. Also, premium customers must include both Gold/Platinum segments AND any customers with lifetime value ≥ $50,000.',
    resultingBusinessRule: 'Net Revenue = SUM(orders.gross_amount) - COALESCE(SUM(refunds.refund_amount), 0) WHERE orders.status != "CANCELLED" AND (customers.segment_id IN ("SEG_GOLD", "SEG_PLATINUM") OR customers.lifetime_value >= 50000).',
    correctedSql: `SELECT 
  c.segment_id,
  COUNT(DISTINCT o.order_id) AS total_orders,
  ROUND(SUM(o.gross_amount), 2) AS gross_revenue,
  ROUND(COALESCE(SUM(r.refund_amount), 0), 2) AS total_refunds,
  ROUND(SUM(o.gross_amount) - COALESCE(SUM(r.refund_amount), 0), 2) AS net_revenue
FROM customers c
JOIN orders o ON c.customer_id = o.customer_id
LEFT JOIN refunds r ON o.order_id = r.order_id
WHERE o.status != 'CANCELLED'
  AND (c.segment_id IN ('SEG_GOLD', 'SEG_PLATINUM') OR c.lifetime_value >= 50000)
GROUP BY c.segment_id
ORDER BY net_revenue DESC;`,
    memoryStatus: 'active',
    verificationStatus: 'verified',
    author: {
      name: 'Shreya Patel',
      role: 'Staff Financial Analyst',
    },
    tableAffected: 'orders, refunds, customers',
    tags: ['Finance', 'Revenue Definition', 'Customer Segments'],
  },
  {
    id: 'lrn-002',
    timestamp: '2026-11-05 18:10:44',
    originalQuery: 'Top 5 products by revenue last month.',
    mistakeOrCorrection: 'Agent queried the deprecated "orders_legacy" table which lacked 2026 SKU updates.',
    employeeExplanation: 'orders_legacy was frozen in Dec 2024. All active and historical consolidated transaction data is now in the "orders" and "order_items" tables.',
    resultingBusinessRule: 'Reject any query targeting orders_legacy. Route product sales queries to order_items joined with products and orders.',
    correctedSql: `SELECT 
  p.product_id,
  p.product_name,
  p.category,
  SUM(oi.quantity) AS total_units_sold,
  ROUND(SUM(oi.quantity * oi.unit_price - oi.discount_amount), 2) AS realized_revenue
FROM order_items oi
JOIN products p ON oi.product_id = p.product_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.status = 'COMPLETED'
  AND o.order_date >= NOW() - INTERVAL '30 days'
GROUP BY p.product_id, p.product_name, p.category
ORDER BY realized_revenue DESC
LIMIT 5;`,
    memoryStatus: 'active',
    verificationStatus: 'verified',
    author: {
      name: 'Rohan Mehta',
      role: 'Principal Data Architect',
    },
    tableAffected: 'orders, order_items, products',
    tags: ['Schema Deprecation', 'Data Governance'],
  },
  {
    id: 'lrn-003',
    timestamp: '2026-11-04 11:05:12',
    originalQuery: 'Which products have the highest refund rate?',
    mistakeOrCorrection: 'PostgreSQL threw error 22012: division by zero for new products with zero orders.',
    employeeExplanation: 'New products or categories with 0 completed orders caused a division by zero error in the refund calculation denominator. Must safeguard with NULLIF.',
    resultingBusinessRule: 'Always wrap refund rate denominators with NULLIF(COUNT(o.order_id), 0) or NULLIF(SUM(o.gross_amount), 0) to prevent runtime exceptions.',
    correctedSql: `SELECT 
  p.product_name,
  p.category,
  COUNT(DISTINCT o.order_id) AS total_orders,
  COUNT(DISTINCT r.refund_id) AS total_refunds,
  ROUND(
    COALESCE(COUNT(DISTINCT r.refund_id)::NUMERIC / NULLIF(COUNT(DISTINCT o.order_id), 0) * 100, 0), 
    2
  ) AS refund_percentage
FROM products p
LEFT JOIN order_items oi ON p.product_id = oi.product_id
LEFT JOIN orders o ON oi.order_id = o.order_id
LEFT JOIN refunds r ON o.order_id = r.order_id
GROUP BY p.product_id, p.product_name, p.category
HAVING COUNT(DISTINCT o.order_id) >= 5
ORDER BY refund_percentage DESC
LIMIT 10;`,
    memoryStatus: 'active',
    verificationStatus: 'verified',
    author: {
      name: 'Agent Self-Healing Engine',
      role: 'Automated Exception Retainer',
    },
    tableAffected: 'refunds, products, orders',
    tags: ['Error Fix', 'SQL Safety', 'NULLIF'],
  },
  {
    id: 'lrn-004',
    timestamp: '2026-11-03 09:40:21',
    originalQuery: 'Compare sales across customer segments in Q3.',
    mistakeOrCorrection: 'Query used delivery status instead of gateway settlement status.',
    employeeExplanation: 'For accounting sales reports, we recognize sales when payment gateway status is SETTLED, not based on tracking courier delivery status.',
    resultingBusinessRule: 'Sales reconciliation must require payments.gateway_status = "SETTLED" OR orders.status = "COMPLETED".',
    correctedSql: `SELECT 
  cs.segment_name,
  COUNT(DISTINCT o.order_id) AS paid_orders,
  ROUND(SUM(p.amount), 2) AS settled_volume
FROM customer_segments cs
JOIN customers c ON cs.segment_id = c.segment_id
JOIN orders o ON c.customer_id = o.customer_id
JOIN payments p ON o.order_id = p.order_id
WHERE p.gateway_status = 'SETTLED'
GROUP BY cs.segment_name, cs.vip_tier_rank
ORDER BY cs.vip_tier_rank ASC;`,
    memoryStatus: 'retained',
    verificationStatus: 'pending',
    author: {
      name: 'Devika Sen',
      role: 'Billing Operations Manager',
    },
    tableAffected: 'customer_segments, payments',
    tags: ['Payments', 'Reconciliation'],
  },
  {
    id: 'lrn-005',
    timestamp: '2026-10-28 17:15:00',
    originalQuery: 'Find inactive customers with high pending carts.',
    mistakeOrCorrection: 'Checked cart_items table which was superseded by temporary session redis store in v3.2 release.',
    employeeExplanation: 'cart_items relational table is superseded. Cart abandonment analytics now use analytics_sessions or customers status = "CHURNED".',
    resultingBusinessRule: 'Superseded legacy table cart_items; use customers churn filter instead.',
    correctedSql: `SELECT customer_id, first_name, email, lifetime_value
FROM customers
WHERE status = 'CHURNED' AND lifetime_value > 25000;`,
    memoryStatus: 'superseded',
    verificationStatus: 'superseded',
    author: {
      name: 'Karan Joshi',
      role: 'Backend Engineering',
    },
    tableAffected: 'cart_items (deprecated)',
    tags: ['Superseded', 'Cart Analytics'],
  },
];

