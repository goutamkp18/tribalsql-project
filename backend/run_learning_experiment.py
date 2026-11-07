import sys
from decimal import Decimal
from db import execute_readonly_sql, get_active_engine
from memory import (
    retrieve_memory_context,
    is_hindsight_configured,
    HINDSIGHT_BANK_ID
)
from ai_agent import (
    generate_and_validate_sql,
    validate_sql_with_sqlglot,
    is_groq_configured,
    GROQ_PRIMARY_MODEL
)


def format_currency(val) -> str:
    try:
        return f"${float(val):,.2f}"
    except (ValueError, TypeError):
        return str(val)


def run_experiment():
    print("=" * 80)
    print("  TRIBALSQL: POST-CONFIGURATION EXPERIMENT RUNNER")
    print("=" * 80)
    print(f"Database Engine:          {get_active_engine().upper()}")
    print(f"Hindsight Bank ID:        {HINDSIGHT_BANK_ID}")
    print(f"Hindsight Cloud Active:   {is_hindsight_configured()}")
    print(f"Groq LLM Configured:      {is_groq_configured()}")

    question = "Calculate net revenue from premium customers"

    # -------------------------------------------------------------------------
    # STAGE 1: COLD START (Memory Disabled)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("▶ STAGE 1: Cold Start Query Generation (use_memory=False)")
    print("-" * 80)
    print(f"Question: \"{question}\"")
    print("Generating baseline SQL purely from raw schema DDL...\n")

    cold_res = generate_and_validate_sql(question, use_memory=False)
    cold_sql = cold_res["sql"]
    print("Generated Cold-Start SQL:")
    print(f"  {cold_sql}\n")
    print(f"Cold-Start Explanation: {cold_res['explanation']}")

    cold_exec = execute_readonly_sql(cold_sql)
    cold_rev = cold_exec["rows"][0]["net_revenue"]
    print(f"\nExecution Result (Cold Start):")
    print(f"  Net Revenue: {format_currency(cold_rev)} (Execution Time: {cold_exec['execution_time_ms']}ms)")

    # -------------------------------------------------------------------------
    # STAGE 2: MEMORY CONTEXT RETRIEVAL (From Hindsight Cloud)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("▶ STAGE 2: Hindsight Cloud Memory Inspection")
    print("-" * 80)
    mem_ctx = retrieve_memory_context(question)
    recalled_count = len(mem_ctx.get("recalled_items", []))
    print(f"Recalled Items from Hindsight Cloud: {recalled_count}")
    for idx, item in enumerate(mem_ctx.get("recalled_items", [])[:3]):
        print(f"  [{idx+1}] {item.get('text', '')[:100]}...")
    print("\nSynthesized Playbook Preview:")
    lines = mem_ctx.get("synthesized_playbook", "").strip().split("\n")
    for l in lines[:8]:
        print(f"  {l}")

    # -------------------------------------------------------------------------
    # STAGE 3: LEARNED QUERY GENERATION (With Hindsight Cloud Memory)
    # -------------------------------------------------------------------------
    print("\n" + "-" * 80)
    print("▶ STAGE 3: Learned Query Generation (use_memory=True)")
    print("-" * 80)
    print(f"Question: \"{question}\"")
    print("Generating SQL with active Hindsight Cloud tribal playbook...\n")

    learned_res = generate_and_validate_sql(question, use_memory=True)
    learned_sql = learned_res["sql"]
    print("Generated Learned SQL:")
    print(f"  {learned_sql}\n")
    print(f"Learned Explanation: {learned_res['explanation']}\n")
    print("Applied Rules:")
    for rule in learned_res.get("applied_rules", []):
        print(f"  ✓ {rule}")

    # AST validation
    validate_sql_with_sqlglot(learned_sql, mem_ctx.get("synthesized_playbook", ""))
    print("\n✓ SQLGlot AST validation: PASSED")

    learned_exec = execute_readonly_sql(learned_sql)
    learned_rev = learned_exec["rows"][0]["net_revenue"]
    print(f"\nExecution Result (Learned Query):")
    print(f"  True Net Revenue: {format_currency(learned_rev)} (Execution Time: {learned_exec['execution_time_ms']}ms)")

    # -------------------------------------------------------------------------
    # VERIFICATION SUMMARY
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("  VERIFICATION AUDIT SUMMARY")
    print("=" * 80)
    print(f"Cold Start Net Revenue (Naive / Inflated): {format_currency(cold_rev)}")
    print(f"Learned Net Revenue (True Net):            {format_currency(learned_rev)}")
    diff = float(cold_rev) - float(learned_rev)
    print(f"Difference Filtered:                       {format_currency(diff)}")

    is_exact_match = (float(learned_rev) == 5650.00)
    print(f"\nTarget Value Expected: $5,650.00")
    print(f"Target Value Returned: {format_currency(learned_rev)}")
    print(f"Revenue Check Outcome: {'EXACT MATCH ($5,650.00)' if is_exact_match else 'DISCREPANCY DETECTED'}")

    return {
        "cold_revenue": float(cold_rev),
        "learned_revenue": float(learned_rev),
        "recalled_items_count": recalled_count,
        "is_exact_match": is_exact_match
    }


if __name__ == "__main__":
    run_experiment()

