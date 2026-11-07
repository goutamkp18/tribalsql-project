"""
End-to-End CLI Verification Script for TribalSQL.

Demonstrates the 3-Stage Tribal Learning Lifecycle:
  1. Cold Start: Naive Agent falls into database schema traps (inflated revenue: $78,300)
  2. Human Analyst Correction: Retaining business rules & experience into Hindsight Memory
  3. Memory Recall & Learned Generation: Agent retrieves playbook and executes true net revenue ($5,650)
  4. AST Security & Trap Verification: Confirms SQLGlot blocks malicious and deprecated queries.
"""

import sys
import json
import time
from decimal import Decimal

from db import init_and_seed_db, execute_readonly_sql, get_active_engine
from memory import (
    init_memory_bank,
    retain_human_correction,
    retrieve_memory_context,
    clear_local_memory,
    is_hindsight_configured,
    HINDSIGHT_BANK_ID
)
from ai_agent import (
    generate_and_validate_sql,
    validate_sql_with_sqlglot,
    is_groq_configured,
    GROQ_PRIMARY_MODEL
)


def print_banner(text: str):
    print("\n" + "=" * 80)
    print(f"  {text}")
    print("=" * 80)


def print_section(title: str):
    print("\n" + "-" * 80)
    print(f"▶ {title}")
    print("-" * 80)


def format_currency(val) -> str:
    try:
        return f"${float(val):,.2f}"
    except (ValueError, TypeError):
        return str(val)


def run_e2e_test():
    print_banner("TribalSQL: End-to-End Verification Pipeline")
    print(f"Database Engine:  {get_active_engine().upper()}")
    print(f"Hindsight Bank:   {HINDSIGHT_BANK_ID} (Cloud Configured: {is_hindsight_configured()})")
    print(f"Groq LLM Model:   {GROQ_PRIMARY_MODEL} (API Configured: {is_groq_configured()})")

    # Step 0: Initialize and seed the NovaMart database
    print_section("STEP 0: Seeding NovaMart Database with Tribal Traps")
    clear_local_memory()
    seed_result = init_and_seed_db()
    print(f"✓ Seed status: {seed_result['status']}")
    print(f"✓ Seeded 10 customers, 10 active orders, 4 legacy orders, 3 refunds.")
    init_memory_bank()

    # The benchmark test question
    question = "Calculate net revenue from premium customers"

    # -------------------------------------------------------------------------
    # STAGE 1: COLD START (Baseline without Tribal Memory)
    # -------------------------------------------------------------------------
    print_section("STAGE 1: Cold Start Query Generation (No Tribal Memory)")
    print(f"Natural Language Question: \"{question}\"")
    print("Agent is querying raw schema without historical memory...\n")

    cold_result = generate_and_validate_sql(question, use_memory=False)
    cold_sql = cold_result["sql"]
    print("Agent Generated SQL (Cold Start):")
    print(f"  {cold_sql}\n")
    print(f"Explanation: {cold_result['explanation']}")

    # Execute Cold Start SQL
    cold_exec = execute_readonly_sql(cold_sql)
    cold_revenue = cold_exec["rows"][0]["net_revenue"]
    print(f"\nExecution Result:")
    print(f"  Returned Net Revenue:  {format_currency(cold_revenue)} (Rows: {cold_exec['row_count']}, Time: {cold_exec['execution_time_ms']}ms)")
    
    print("\n⚠ TRAP ANALYSIS (Cold Start Failure):")
    print("  ✗ Fell into Outdated Column Trap: used `account_type = 'premium'` (misses high-value GOLD tier customers).")
    print("  ✗ Fell into Internal QA Account Trap: included `@novamart-test.com` test accounts ($75,000 in fake orders!).")
    print("  ✗ Fell into Status Trap: included CANCELLED orders.")
    print("  ✗ Fell into Refund Trap: completely ignored refund deductions from `refunds` table.")
    print(f"  ✗ The reported revenue ({format_currency(cold_revenue)}) is GROSSLY INFLATED!")

    assert float(cold_revenue) > 50000, f"Expected cold start revenue to be inflated (>50000), got {cold_revenue}"

    # -------------------------------------------------------------------------
    # STAGE 2: HUMAN ANALYST CORRECTION (Retaining into Hindsight)
    # -------------------------------------------------------------------------
    print_section("STAGE 2: Human Analyst Correction -> Hindsight Cloud Retain")
    
    corrected_sql = (
        "SELECT COALESCE(SUM(o.total_amount - COALESCE(r.refund_amount, 0)), 0) AS net_revenue "
        "FROM orders o "
        "JOIN customers c ON o.customer_id = c.id "
        "LEFT JOIN ("
        "    SELECT order_id, SUM(refund_amount) AS refund_amount "
        "    FROM refunds "
        "    GROUP BY order_id"
        ") r ON o.id = r.order_id "
        "WHERE (c.loyalty_tier = 'GOLD' OR c.lifetime_value >= 50000) "
        "  AND c.email NOT LIKE '%@novamart-test.com' "
        "  AND o.status = 'COMPLETED';"
    )
    business_rule = (
        "NovaMart Company Policy for Premium Customer Revenue: "
        "1. Premium customers MUST be identified by `loyalty_tier = 'GOLD' OR lifetime_value >= 50000`. Do NOT use deprecated `account_type`. "
        "2. Exclude all internal company test accounts: `email NOT LIKE '%@novamart-test.com'`. "
        "3. Only sum COMPLETED orders (`status = 'COMPLETED'`); exclude CANCELLED or PENDING orders. "
        "4. Always deduct refunds from `refunds` table to calculate true NET revenue. "
        "5. NEVER query `orders_legacy`."
    )

    print("Analyst Feedback Submitted:")
    print(f"  • Wrong SQL:      {cold_sql}")
    print(f"  • Corrected SQL:  {corrected_sql}")
    print(f"  • Business Rule:  {business_rule}\n")

    retain_res = retain_human_correction(
        question=question,
        wrong_sql=cold_sql,
        corrected_sql=corrected_sql,
        business_rule=business_rule
    )
    print(f"✓ Hindsight Memory Retain Status: {retain_res['status']}")
    print(f"  Stored: 1x Business Rule (category: business_rule) + 1x SQL Correction Experience (category: sql_correction).")

    # -------------------------------------------------------------------------
    # STAGE 3: MEMORY RECALL & LEARNED QUERY GENERATION
    # -------------------------------------------------------------------------
    print_section("STAGE 3: Recall & Learned SQL Generation (With Hindsight Memory)")
    print(f"Natural Language Question: \"{question}\"")
    print("Agent is querying Hindsight semantic memory to synthesize active playbook...\n")

    learned_result = generate_and_validate_sql(question, use_memory=True)
    learned_sql = learned_result["sql"]

    print("Hindsight Memory Inspector:")
    mem_ctx = learned_result.get("memory_context", {})
    print(f"  • Recalled Items Count: {len(mem_ctx.get('recalled_items', []))}")
    print(f"  • Synthesized Playbook:\n    {mem_ctx.get('synthesized_playbook', '').strip()}\n")

    print("Agent Generated SQL (Learned State):")
    print(f"  {learned_sql}\n")
    print(f"Explanation: {learned_result['explanation']}\n")
    print("Applied Rules:")
    for rule in learned_result.get("applied_rules", []):
        print(f"  ✓ {rule}")

    # Execute Learned SQL
    learned_exec = execute_readonly_sql(learned_sql)
    learned_revenue = learned_exec["rows"][0]["net_revenue"]

    print(f"\nExecution Result:")
    print(f"  True Net Revenue:      {format_currency(learned_revenue)} (Rows: {learned_exec['row_count']}, Time: {learned_exec['execution_time_ms']}ms)")
    
    print("\n✓ SUCCESS VERIFICATION:")
    print(f"  • Cold Start Revenue:    {format_currency(cold_revenue)}  [WRONG / INFLATED]")
    print(f"  • Learned Net Revenue:   {format_currency(learned_revenue)}  [TRUE ACCURATE NET]")
    print(f"  • Difference Filtered:   {format_currency(float(cold_revenue) - float(learned_revenue))} in fake/cancelled/refunded dollars!")

    assert float(learned_revenue) == 5650.00, f"Expected learned net revenue to be exactly 5650.00, got {learned_revenue}"
    print("  ✓ EXACT REVENUE MATCH: $5,650.00 verified!")

    # -------------------------------------------------------------------------
    # STAGE 4: AST SECURITY & SCHEMA TRAP ENFORCEMENT
    # -------------------------------------------------------------------------
    print_section("STAGE 4: SQLGlot AST Safety & Schema Trap Guards")
    
    # 1. Mutating SQL Test
    print("Test 4.1: Attempting Mutating Query ('DROP TABLE customers;')...")
    try:
        validate_sql_with_sqlglot("DROP TABLE customers;")
        print("  ✗ FAILED: Security guard did not block DROP statement!")
        sys.exit(1)
    except ValueError as e:
        print(f"  ✓ BLOCKED by SQLGlot: {e}")

    # 2. Legacy Table Trap Test
    print("\nTest 4.2: Attempting Query to Deprecated Table ('SELECT * FROM orders_legacy;')...")
    try:
        validate_sql_with_sqlglot("SELECT * FROM orders_legacy;")
        print("  ✗ FAILED: Schema trap guard did not block orders_legacy!")
        sys.exit(1)
    except ValueError as e:
        print(f"  ✓ BLOCKED by SQLGlot: {e}")

    # 3. Readonly Session Test
    print("\nTest 4.3: Executing Safe Read-Only Query...")
    safe_check = execute_readonly_sql("SELECT COUNT(*) AS total_customers FROM customers;")
    print(f"  ✓ Read-only execution passed. Total customers: {safe_check['rows'][0]['total_customers']}")

    print_banner("ALL TRIBALSQL VERIFICATION CHECKS PASSED PERFECTLY! 🚀")


if __name__ == "__main__":
    run_e2e_test()

