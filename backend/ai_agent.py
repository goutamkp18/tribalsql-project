"""
TribalSQL AI Agent Engine.

Handles:
  1. Groq LLM integration (qwen/qwen3-32b with automatic fallback to openai/gpt-oss-120b)
  2. NovaMart database schema DDL injection (customers, orders, orders_legacy, refunds)
  3. Hindsight Cloud Memory integration (recall rules/KPIs from novamart-prod-db, retain interaction logs/errors)
  4. SQLGlot syntax & security AST validation (setting sqlglot_valid flag)
  5. Read-only query execution (PostgreSQL/Supabase or SQLite fallback)
  6. Structured response returning:
       - sql: The generated SQL query
       - sqlglot_valid: boolean
       - results: Query rows/results
       - memory_inspector: Hindsight memory payload used/recalled
"""

import os
import re
import json
import logging
from typing import Any, Dict, List, Optional, Tuple
import sqlglot
from sqlglot import exp, errors as sqlglot_errors
from pydantic import BaseModel, Field
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

from db import get_schema_ddl, execute_readonly_sql
from memory import (
    retrieve_memory_context,
    retain_sql_error,
    log_query_interaction,
    HINDSIGHT_BANK_ID,
    is_hindsight_configured
)

load_dotenv()

logger = logging.getLogger("tribalsql.ai_agent")
logging.basicConfig(level=logging.INFO)

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_PRIMARY_MODEL = os.getenv("GROQ_PRIMARY_MODEL", "qwen/qwen3-32b")
GROQ_FALLBACK_MODEL = os.getenv("GROQ_FALLBACK_MODEL", "openai/gpt-oss-120b")


class SQLAgentResponse(BaseModel):
    sql: str = Field(..., description="Safe, executable PostgreSQL query")
    explanation: str = Field(..., description="Step-by-step reasoning and business logic applied")
    applied_rules: List[str] = Field(default_factory=list, description="Company rules or tribal knowledge applied")


def is_groq_configured() -> bool:
    """Check if Groq API key is present."""
    key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    return bool(key and key.strip())


def get_groq_client():
    """Instantiate Groq SDK client."""
    from groq import Groq
    key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    return Groq(api_key=key)


# -----------------------------------------------------------------------------
# SQLGlot AST Validation & Syntax Verification
# -----------------------------------------------------------------------------

FORBIDDEN_EXPRESSIONS = (
    exp.Insert,
    exp.Update,
    exp.Delete,
    exp.Drop,
    exp.Alter,
    exp.TruncateTable,
    exp.Command,
    exp.Create
)


def validate_sql_syntax(sql: str) -> Tuple[bool, Optional[str]]:
    """
    Passes the generated SQL string through SQLGlot to verify syntax validity.
    Returns: (sqlglot_valid: bool, error_message: Optional[str])
    """
    clean_sql = sql.strip().rstrip(";")
    if not clean_sql:
        return False, "Generated SQL is empty."

    try:
        parsed = sqlglot.parse_one(clean_sql, read="postgres")
    except sqlglot_errors.ParseError as e:
        return False, f"SQLGlot Syntax Parse Error: {e}"
    except Exception as e:
        return False, f"SQLGlot Parse Exception: {e}"

    # Check for mutating expressions
    for forbidden in FORBIDDEN_EXPRESSIONS:
        if parsed.find(forbidden):
            return False, f"Security Violation: Mutating statements ({forbidden.__name__}) are forbidden. Only SELECT queries are permitted."

    # Must contain a SELECT
    if not isinstance(parsed, (exp.Select, exp.Union)) and not parsed.find(exp.Select):
        return False, "Query must be a valid SELECT statement."

    return True, None


def validate_sql_with_sqlglot(sql: str, active_playbook: str = "") -> None:
    """
    Comprehensive AST safety check: raises ValueError if syntax is invalid
    or if known schema traps (e.g. orders_legacy, outdated account_type) are triggered.
    """
    is_valid, err = validate_sql_syntax(sql)
    if not is_valid:
        raise ValueError(err)

    parsed = sqlglot.parse_one(sql.strip().rstrip(";"), read="postgres")

    # Schema Trap Check: orders_legacy table (deprecated 2024 table)
    for tbl in parsed.find_all(exp.Table):
        tname = tbl.name.lower() if tbl.name else ""
        if tname == "orders_legacy":
            raise ValueError(
                "Schema Trap Violation: 'orders_legacy' is a deprecated 2024 table and must never be queried. Use 'orders' instead."
            )

    # Schema Trap Check: customers.account_type column
    if "account_type" in active_playbook.lower():
        for col in parsed.find_all(exp.Column):
            cname = col.name.lower() if col.name else ""
            if cname == "account_type":
                raise ValueError(
                    "Schema Trap Violation: 'customers.account_type' is an outdated column. "
                    "Company rule requires using 'loyalty_tier' = 'GOLD' or 'lifetime_value' >= 50000."
                )


# -----------------------------------------------------------------------------
# Groq LLM Inference & SQL Extraction
# -----------------------------------------------------------------------------

def _extract_sql_from_text(raw_text: str) -> Tuple[str, str, List[str]]:
    """Robustly extracts SQL, explanation, and applied rules from model completion."""
    raw_text = raw_text.strip()

    # 1. Direct JSON parse
    try:
        data = json.loads(raw_text)
        if isinstance(data, dict) and "sql" in data:
            return (
                data["sql"].strip(),
                data.get("explanation", "Generated by Groq model"),
                data.get("applied_rules", [])
            )
    except Exception:
        pass

    # 2. Markdown JSON block ```json ... ```
    match_json = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw_text, re.DOTALL)
    if match_json:
        try:
            data = json.loads(match_json.group(1))
            if isinstance(data, dict) and "sql" in data:
                return (
                    data["sql"].strip(),
                    data.get("explanation", "Generated by Groq model"),
                    data.get("applied_rules", [])
                )
        except Exception:
            pass

    # 3. Markdown SQL block ```sql ... ```
    match_sql = re.search(r"```(?:sql)?\s*(SELECT.*?)```", raw_text, re.DOTALL | re.IGNORECASE)
    if match_sql:
        return match_sql.group(1).strip(), "Extracted SQL block from model output", []

    # 4. Raw SQL starting with SELECT
    if "SELECT" in raw_text.upper():
        start_idx = raw_text.upper().find("SELECT")
        candidate = raw_text[start_idx:].split(";")[0] + ";"
        return candidate.strip(), "Extracted raw SELECT query", []

    return raw_text, "Unparsed output", []


def _call_groq_llm(
    messages: List[Dict[str, str]],
    model_override: Optional[str] = None
) -> Tuple[str, str, List[str], str]:
    """
    Calls Groq API with model `qwen/qwen3-32b` and automatic fallback to `openai/gpt-oss-120b`.
    Returns: (sql, explanation, applied_rules, model_used)
    """
    client = get_groq_client()
    primary = model_override or os.getenv("GROQ_PRIMARY_MODEL", GROQ_PRIMARY_MODEL)
    fallback = os.getenv("GROQ_FALLBACK_MODEL", GROQ_FALLBACK_MODEL)
    primary_err = None
    fallback_err = None

    # Try Primary Model
    try:
        logger.info(f"Calling Groq LLM with primary model: {primary}")
        completion = client.chat.completions.create(
            model=primary,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.0
        )
        content = completion.choices[0].message.content
        sql, explanation, rules = _extract_sql_from_text(content)
        return sql, explanation, rules, primary
    except Exception as e_primary:
        primary_err = str(e_primary)
        logger.warning(f"Groq primary model '{primary}' failed ({e_primary}). Invoking fallback '{fallback}'...")

    # Try Fallback Model
    try:
        completion = client.chat.completions.create(
            model=fallback,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.0
        )
        content = completion.choices[0].message.content
        sql, explanation, rules = _extract_sql_from_text(content)
        return sql, explanation, rules, fallback
    except Exception as e_fallback:
        fallback_err = str(e_fallback)
        logger.warning(f"Groq fallback model '{fallback}' failed ({e_fallback}). Trying standard resilient fallback...")
        last_resort = "llama-3.3-70b-versatile"
        try:
            completion = client.chat.completions.create(
                model=last_resort,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            content = completion.choices[0].message.content
            sql, explanation, rules = _extract_sql_from_text(content)
            return sql, explanation, rules, last_resort
        except Exception as e_final:
            raise RuntimeError(f"All Groq LLM models failed. Primary error: {primary_err}; Fallback error: {fallback_err}; Final error: {e_final}")


# -----------------------------------------------------------------------------
# Heuristic Fallback Generator (for offline testing / deterministic demo)
# -----------------------------------------------------------------------------

def _heuristic_generate(question: str, use_memory: bool, memory_ctx: Dict[str, Any]) -> SQLAgentResponse:
    """
    Deterministic simulation when running offline without Groq API key,
    accurately reflecting Cold Start vs Learned Memory states.
    """
    has_rules = bool(memory_ctx.get("recalled_items") and len(memory_ctx["recalled_items"]) > 0)

    if not use_memory or not has_rules:
        return SQLAgentResponse(
            sql="SELECT SUM(total_amount) AS net_revenue FROM orders o JOIN customers c ON o.customer_id = c.id WHERE c.account_type = 'premium';",
            explanation="Cold Start (Schema Only): Filtered by outdated 'account_type = premium' without company rules.",
            applied_rules=["None (Cold Start - Baseline schema only)"]
        )
    else:
        return SQLAgentResponse(
            sql=(
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
            ),
            explanation=(
                "Learned State (Hindsight Memory Applied): Incorporated active NovaMart tribal playbook. "
                "Defined premium by loyalty_tier = 'GOLD' or LTV >= 50,000 (avoided deprecated account_type), "
                "excluded test accounts (%@novamart-test.com), filtered for COMPLETED orders, deducted refunds, "
                "and bypassed deprecated orders_legacy table."
            ),
            applied_rules=[
                "Rule 1: Premium Customers = loyalty_tier 'GOLD' or LTV >= $50,000 (outdated account_type bypassed)",
                "Rule 2: Exclude QA Test Accounts (email NOT LIKE '%@novamart-test.com')",
                "Rule 3: Only count COMPLETED orders (exclude CANCELLED and PENDING)",
                "Rule 4: Deduct refunds to compute true net revenue",
                "Rule 5: Deprecated orders_legacy table ignored"
            ]
        )


# -----------------------------------------------------------------------------
# Core Agent Logic: Natural Language to SQL Generation & Execution
# -----------------------------------------------------------------------------

def generate_and_validate_sql(
    question: str,
    use_memory: bool = True,
    max_retries: int = 3
) -> Dict[str, Any]:
    """
    Main Text-to-SQL logic:
      1. Recall company rules, KPI definitions, and past corrections from Hindsight Cloud (novamart-prod-db)
      2. Inject NovaMart DDL schema (customers, orders, orders_legacy, refunds) and recalled memory into Groq prompt
      3. Call Groq API client with model qwen/qwen3-32b (fallback to openai/gpt-oss-120b)
      4. Validate SQL syntax using SQLGlot (transpile / parse_one) and set sqlglot_valid flag
      5. Execute validated SQL against database (PostgreSQL/Supabase or SQLite fallback)
      6. Retain operational interaction log or error into Hindsight memory
      7. Return structured JSON response:
           - sql: generated SQL query
           - sqlglot_valid: boolean
           - results: query rows/results
           - memory_inspector: Hindsight memory payload used/recalled
    """
    # 1. Hindsight Memory Recall
    if use_memory:
        memory_ctx = retrieve_memory_context(question)
    else:
        memory_ctx = {
            "recalled_items": [],
            "synthesized_playbook": "Memory recall disabled by request."
        }

    recalled_items = memory_ctx.get("recalled_items", [])
    active_playbook = memory_ctx.get("synthesized_playbook", "")

    # Structured Memory Inspector payload
    memory_inspector = {
        "bank_id": HINDSIGHT_BANK_ID,
        "query": question,
        "recalled_memories": recalled_items,
        "synthesized_playbook": active_playbook,
        "recalled_count": len(recalled_items),
        "cloud_connected": is_hindsight_configured()
    }

    # 2. Schema DDL Injection
    schema_ddl = get_schema_ddl()

    system_prompt = f"""You are the lead database engineer and AI Text-to-SQL agent for NovaMart.
Translate the user's natural language question into an accurate, safe PostgreSQL query.

--- DATABASE SCHEMA (PostgreSQL) ---
{schema_ddl}

--- RECALLED COMPANY RULES & PLAYBOOK (From Hindsight Semantic Memory) ---
{active_playbook if active_playbook else "No past human corrections or company tribal knowledge available."}

--- RECALLED PAST INTERACTIONS & CORRECTIONS ---
{json.dumps(recalled_items, indent=2) if recalled_items else "[]"}

--- INSTRUCTIONS ---
1. If company rules, KPI definitions, or past analyst corrections are provided in the Hindsight memory section above, you MUST strictly follow them.
2. Only generate read-only SELECT queries. Mutating operations (DROP, INSERT, UPDATE, DELETE) are strictly forbidden.
3. You MUST return your response as a valid JSON object matching this schema:
{{
  "sql": "SELECT ...",
  "explanation": "Step-by-step reasoning...",
  "applied_rules": ["Rule 1", "Rule 2"]
}}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"User Question: {question}"}
    ]

    attempts = 0
    candidate_sql = ""
    explanation = ""
    applied_rules: List[str] = []
    model_used = "offline-heuristic-agent"
    sqlglot_valid = False
    exec_result: Dict[str, Any] = {"rows": [], "row_count": 0, "execution_time_ms": 0.0}
    last_error: Optional[str] = None

    while attempts < max_retries:
        attempts += 1
        try:
            # Step A: Generate SQL from Groq or Heuristic Fallback
            if is_groq_configured():
                try:
                    candidate_sql, explanation, applied_rules, model_used = _call_groq_llm(messages)
                except Exception as e_groq:
                    logger.warning(f"Groq API call failed ({e_groq}). Falling back to local agent simulation.")
                    heuristic_resp = _heuristic_generate(question, use_memory, memory_ctx)
                    candidate_sql = heuristic_resp.sql
                    explanation = heuristic_resp.explanation
                    applied_rules = heuristic_resp.applied_rules
                    model_used = "offline-heuristic-agent"
            else:
                heuristic_resp = _heuristic_generate(question, use_memory, memory_ctx)
                candidate_sql = heuristic_resp.sql
                explanation = heuristic_resp.explanation
                applied_rules = heuristic_resp.applied_rules
                model_used = "offline-heuristic-agent"

            # Step B: SQLGlot Validation
            sqlglot_valid, syntax_error = validate_sql_syntax(candidate_sql)
            if not sqlglot_valid:
                raise ValueError(f"SQLGlot validation failed: {syntax_error}")

            # Also verify schema traps (orders_legacy, outdated columns)
            validate_sql_with_sqlglot(candidate_sql, active_playbook)

            # Step C: Execution against Database (PostgreSQL/Supabase or SQLite)
            exec_result = execute_readonly_sql(candidate_sql)

            # Step D: Log successful interaction into Hindsight Memory
            log_query_interaction(
                question=question,
                sql=candidate_sql,
                success=True,
                results_summary=f"Returned {exec_result.get('row_count', 0)} rows in {exec_result.get('execution_time_ms', 0)}ms."
            )

            # Step E: Log into production query_logs table
            try:
                from analytics import log_query_execution
                log_query_execution(
                    natural_language_query=question,
                    generated_sql=candidate_sql,
                    execution_status="SUCCESS",
                    execution_time_ms=exec_result.get("execution_time_ms", 0.0),
                    rows_returned=exec_result.get("row_count", 0),
                    used_hindsight_memory=use_memory
                )
            except Exception as e_log:
                logger.warning(f"Failed to record analytics log: {e_log}")

            # Success response
            return {
                "sql": candidate_sql,
                "sqlglot_valid": True,
                "results": exec_result.get("rows", []),
                "memory_inspector": memory_inspector,
                "explanation": explanation,
                "applied_rules": applied_rules,
                "memory_context": memory_inspector,
                "execution_time_ms": exec_result.get("execution_time_ms", 0.0),
                "row_count": exec_result.get("row_count", 0),
                "engine": exec_result.get("engine", "postgresql"),
                "attempts": attempts,
                "self_healed": attempts > 1,
                "model_used": model_used,
                "preview_result": exec_result,
                "use_memory": use_memory
            }

        except Exception as err:
            last_error = str(err)
            sqlglot_valid = False
            logger.warning(f"[Attempt {attempts}/{max_retries}] Execution/Validation error: {last_error}")

            # Retain error in Hindsight memory
            retain_sql_error(question, candidate_sql or "None", last_error)
            log_query_interaction(
                question=question,
                sql=candidate_sql or "None",
                success=False,
                error_message=last_error
            )

            # Self-healing feedback for next attempt
            messages.append({"role": "assistant", "content": json.dumps({
                "sql": candidate_sql,
                "explanation": "Attempt resulted in error",
                "applied_rules": []
            })})
            messages.append({
                "role": "user",
                "content": (
                    f"Your SQL query failed with this error:\n'{last_error}'\n"
                    f"Please self-heal and fix the SQL query according to NovaMart rules. Return valid JSON only."
                )
            })

    # If retries exhausted, log failure to production query_logs table
    try:
        from analytics import log_query_execution
        log_query_execution(
            natural_language_query=question,
            generated_sql=candidate_sql or "None",
            execution_status="FAILED",
            execution_time_ms=0.0,
            rows_returned=0,
            error_message=last_error,
            used_hindsight_memory=use_memory
        )
    except Exception as e_log:
        logger.warning(f"Failed to record analytics log for query failure: {e_log}")

    # If retries exhausted, return failed structure
    return {
        "sql": candidate_sql,
        "sqlglot_valid": sqlglot_valid,
        "results": [],
        "memory_inspector": memory_inspector,
        "explanation": f"Self-healing exhausted after {attempts} attempts. Last error: {last_error}",
        "applied_rules": [],
        "memory_context": memory_inspector,
        "execution_time_ms": 0.0,
        "row_count": 0,
        "attempts": attempts,
        "self_healed": False,
        "model_used": model_used,
        "error": last_error
    }


# Aliases for flexible integration
generate_sql = generate_and_validate_sql
process_query = generate_and_validate_sql


# -----------------------------------------------------------------------------
# Quick CLI Test
# -----------------------------------------------------------------------------

if __name__ == "__main__":
    print("Testing TribalSQL AI Agent Core Logic...")
    q = "Calculate net revenue from premium customers"
    res = generate_and_validate_sql(q, use_memory=True)
    print("\n--- AGENT RESULT ---")
    print(f"SQL:            {res['sql']}")
    print(f"SQLGlot Valid:  {res['sqlglot_valid']}")
    print(f"Results:        {res['results']}")
    print(f"Model Used:     {res['model_used']}")
    print(f"Memory Items:   {res['memory_inspector']['recalled_count']}")
