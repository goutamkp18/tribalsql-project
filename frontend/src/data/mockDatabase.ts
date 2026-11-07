import { TableSchema } from '../types';

export interface DatabaseRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationship: '1:N' | 'N:1' | '1:1';
}

export const mockDatabaseRelationships: DatabaseRelationship[] = [
  { fromTable: 'orders', fromColumn: 'customer_id', toTable: 'customers', toColumn: 'customer_id', relationship: 'N:1' },
  { fromTable: 'customers', fromColumn: 'segment_id', toTable: 'customer_segments', toColumn: 'segment_id', relationship: 'N:1' },
  { fromTable: 'order_items', fromColumn: 'order_id', toTable: 'orders', toColumn: 'order_id', relationship: 'N:1' },
  { fromTable: 'order_items', fromColumn: 'product_id', toTable: 'products', toColumn: 'product_id', relationship: 'N:1' },
  { fromTable: 'payments', fromColumn: 'order_id', toTable: 'orders', toColumn: 'order_id', relationship: 'N:1' },
  { fromTable: 'refunds', fromColumn: 'order_id', toTable: 'orders', toColumn: 'order_id', relationship: 'N:1' },
];

export const mockTables: TableSchema[] = [
  {
    name: 'customers',
    description: 'Master record of all registered NovaMart consumers including loyalty tiers and lifetime values. (Live in Supabase)',
    rowCount: 10,
    sizeBytes: '16 KB',
    isLiveDatabaseTable: true,
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true, nullable: false, description: 'Customer unique ID' },
      { name: 'name', type: 'TEXT', nullable: false, description: 'Customer full name' },
      { name: 'city', type: 'TEXT', nullable: true, description: 'Customer billing city' },
      { name: 'account_type', type: 'TEXT', nullable: true, description: '⚠️ Outdated column: Company now requires loyalty_tier or lifetime_value' },
      { name: 'loyalty_tier', type: 'TEXT', nullable: true, description: 'Active tier: GOLD, SILVER, BRONZE' },
      { name: 'lifetime_value', type: 'NUMERIC', nullable: false, description: 'Total historical spend in USD' },
      { name: 'email', type: 'TEXT', nullable: false, description: 'Email address (Notice: @novamart-test.com are QA test accounts)' },
    ],
    sampleRows: [
      { id: 1, name: 'Alice Smith', city: 'New York', account_type: 'premium', loyalty_tier: 'GOLD', lifetime_value: 52000, email: 'alice@gmail.com' },
      { id: 2, name: 'Bob Jones', city: 'San Francisco', account_type: 'standard', loyalty_tier: 'SILVER', lifetime_value: 12000, email: 'bob@gmail.com' },
      { id: 3, name: 'Charlie Brown', city: 'Austin', account_type: 'premium', loyalty_tier: 'GOLD', lifetime_value: 65000, email: 'charlie@gmail.com' },
      { id: 4, name: 'David Test', city: 'Seattle', account_type: 'premium', loyalty_tier: 'GOLD', lifetime_value: 99000, email: 'qa1@novamart-test.com' },
      { id: 5, name: 'Eva Test', city: 'Chicago', account_type: 'premium', loyalty_tier: 'GOLD', lifetime_value: 99000, email: 'qa2@novamart-test.com' },
    ],
  },
  {
    name: 'orders',
    description: 'Order transactions header. (Live in Supabase. Must exclude CANCELLED orders)',
    rowCount: 10,
    sizeBytes: '16 KB',
    isLiveDatabaseTable: true,
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true, nullable: false, description: 'Primary order ID' },
      { name: 'customer_id', type: 'INTEGER', isForeignKey: true, references: { table: 'customers', column: 'id' }, nullable: false, description: 'Customer placing the order' },
      { name: 'total_amount', type: 'NUMERIC', nullable: false, description: 'Order gross amount' },
      { name: 'status', type: 'TEXT', nullable: false, description: 'Order lifecycle: COMPLETED, CANCELLED' },
      { name: 'created_at', type: 'TIMESTAMP', nullable: false, description: 'Order timestamp' },
    ],
    sampleRows: [
      { id: 101, customer_id: 1, total_amount: 3500.00, status: 'COMPLETED', created_at: '2026-11-01 10:00:00' },
      { id: 102, customer_id: 1, total_amount: 1200.00, status: 'COMPLETED', created_at: '2026-11-02 11:30:00' },
      { id: 103, customer_id: 2, total_amount: 800.00, status: 'COMPLETED', created_at: '2026-11-03 14:15:00' },
      { id: 104, customer_id: 3, total_amount: 1200.00, status: 'COMPLETED', created_at: '2026-11-04 16:45:00' },
      { id: 105, customer_id: 4, total_amount: 50000.00, status: 'COMPLETED', created_at: '2026-11-05 09:00:00' },
      { id: 106, customer_id: 5, total_amount: 25000.00, status: 'COMPLETED', created_at: '2026-11-05 09:00:00' },
      { id: 107, customer_id: 1, total_amount: 4000.00, status: 'CANCELLED', created_at: '2026-11-06 18:20:00' },
    ],
  },
  {
    name: 'orders_legacy',
    description: '⚠️ DEPRECATED 2024 SCHEMA TRAP: Historical 2024 orders table. Ceased updates in 2024. Obsoleted by orders table.',
    rowCount: 4,
    sizeBytes: '8 KB',
    isLiveDatabaseTable: true,
    isDeprecatedTrap: true,
    trapWarning: 'Deprecated 2024 Table: Ceased receiving updates. Generic LLMs without memory hallucinate joins to this table.',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true, nullable: false, description: 'Legacy order ID' },
      { name: 'customer_id', type: 'INTEGER', isForeignKey: true, references: { table: 'customers', column: 'id' }, nullable: false, description: 'Customer placing the order' },
      { name: 'amount', type: 'NUMERIC', nullable: false, description: 'Outdated legacy currency amount' },
    ],
    sampleRows: [
      { id: 1, customer_id: 1, amount: 150.00 },
      { id: 2, customer_id: 2, amount: 200.00 },
      { id: 3, customer_id: 3, amount: 350.00 },
      { id: 4, customer_id: 4, amount: 500.00 },
    ],
  },
  {
    name: 'refunds',
    description: 'Customer refunds and returns ledger. (Live in Supabase. Must be deducted from revenue)',
    rowCount: 3,
    sizeBytes: '8 KB',
    isLiveDatabaseTable: true,
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true, nullable: false, description: 'Refund unique identifier' },
      { name: 'order_id', type: 'INTEGER', isForeignKey: true, references: { table: 'orders', column: 'id' }, nullable: false, description: 'Associated order ID' },
      { name: 'refund_amount', type: 'NUMERIC', nullable: false, description: 'Amount refunded' },
      { name: 'reason', type: 'TEXT', nullable: true, description: 'Customer refund reason' },
    ],
    sampleRows: [
      { id: 1, order_id: 101, refund_amount: 150.00, reason: 'Damaged item' },
      { id: 2, order_id: 101, refund_amount: 100.00, reason: 'Partial return' },
      { id: 3, order_id: 103, refund_amount: 50.00, reason: 'Late delivery discount' },
    ],
  },
  {
    name: 'customer_segments',
    description: 'Business tier taxonomy classifying NovaMart buyers according to annual spend threshold.',
    rowCount: 4,
    sizeBytes: '12 KB',
    columns: [
      { name: 'segment_id', type: 'VARCHAR(50)', isPrimaryKey: true, nullable: false, description: 'Segment code' },
      { name: 'segment_name', type: 'VARCHAR(100)', nullable: false, description: 'Human friendly name' },
      { name: 'min_annual_spend', type: 'NUMERIC(12,2)', nullable: false, description: 'Annual qualifying spend' },
      { name: 'vip_tier_rank', type: 'INTEGER', nullable: false, description: '1 (highest) to 4 (entry)' },
      { name: 'description', type: 'TEXT', nullable: true, description: 'Corporate business rule notes' },
    ],
    sampleRows: [
      { segment_id: 'SEG_PLATINUM', segment_name: 'Platinum VIP', min_annual_spend: 100000.00, vip_tier_rank: 1, description: 'Top 1% spenders, dedicated account management' },
      { segment_id: 'SEG_GOLD', segment_name: 'Gold Executive', min_annual_spend: 50000.00, vip_tier_rank: 2, description: 'Premium customer tier with priority support' },
      { segment_id: 'SEG_SILVER', segment_name: 'Silver Preferred', min_annual_spend: 10000.00, vip_tier_rank: 3, description: 'Frequent buyers with monthly active purchasing' },
      { segment_id: 'SEG_BRONZE', segment_name: 'Bronze Standard', min_annual_spend: 0.00, vip_tier_rank: 4, description: 'Default introductory shopper classification' },
    ],
  },
];

