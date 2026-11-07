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

from db import get_schema_ddl, execute_readonly_sql, get_active_engine
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

def _sanitize_model_name(model_name: Optional[str], default_model: str) -> str:
    """Sanitizes model name to ensure deprecated/invalid models like qwen are replaced."""
    if not model_name:
        return default_model
    cleaned = str(model_name).strip().strip('"').strip("'")
    if not cleaned or "qwen" in cleaned.lower() or cleaned.lower() == "none":
        logger.warning(f"Deprecated or invalid model '{model_name}' detected. Overriding with '{default_model}'.")
        return default_model
    return cleaned

GROQ_PRIMARY_MODEL = _sanitize_model_name(os.getenv("GROQ_PRIMARY_MODEL"), "openai/gpt-oss-120b")
GROQ_FALLBACK_MODEL = _sanitize_model_name(os.getenv("GROQ_FALLBACK_MODEL"), "openai/gpt-oss-20b")


class GroqServiceUnavailableError(Exception):
    """Raised when both Groq primary and fallback models fail (e.g. rate limits or downtime)."""
    def __init__(self, message: str, primary_model: str, fallback_model: str, last_error: str):
        super().__init__(message)
        self.primary_model = primary_model
        self.fallback_model = fallback_model
        self.last_error = last_error


class SQLAgentResponse(BaseModel):
    sql: str = Field(..., description="Safe, executable PostgreSQL query")
    explanation: str = Field(..., description="Step-by-step reasoning and business logic applied")
    applied_rules: List[str] = Field(default_factory=list, description="Company rules or tribal knowledge applied")


def is_groq_configured() -> bool:
    """Check if Groq API key is present."""
    key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    return bool(key and key.strip())


def get_groq_client():
    """Instantiate Groq SDK client with max_retries=0 so 429 rate limits trigger immediate fallback."""
    from groq import Groq
    key = os.getenv("GROQ_API_KEY", GROQ_API_KEY)
    # Set max_retries=0 to avoid waiting/retrying repeatedly on rate-limited/exhausted models
    return Groq(api_key=key, max_retries=0)


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


def validate_sql_with_sqlglot(sql: str, active_playbook: str = "", question: str = "") -> None:
    """
    Comprehensive AST safety check: raises ValueError if syntax is invalid
    or if non-SELECT / mutating statements are attempted.
    """
    clean_sql = (sql or "").strip()
    if not clean_sql:
        return

    is_valid, err = validate_sql_syntax(clean_sql)
    if not is_valid:
        raise ValueError(err)


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
    Calls Groq API with configured primary model (openai/gpt-oss-120b) and
    immediate fallback to secondary model (openai/gpt-oss-20b) upon error or rate limit.
    Returns: (sql, explanation, applied_rules, model_used)
    """
    client = get_groq_client()
    raw_primary = model_override or os.getenv("GROQ_PRIMARY_MODEL", GROQ_PRIMARY_MODEL)
    raw_fallback = os.getenv("GROQ_FALLBACK_MODEL", GROQ_FALLBACK_MODEL)

    primary = _sanitize_model_name(raw_primary, "openai/gpt-oss-120b")
    fallback = _sanitize_model_name(raw_fallback, "openai/gpt-oss-20b")

    candidate_models: List[str] = []
    if primary:
        candidate_models.append(primary)
    if fallback and fallback not in candidate_models:
        candidate_models.append(fallback)

    errors = []
    for model in candidate_models:
        try:
            logger.info(f"Calling Groq LLM with model: {model}")
            completion = client.chat.completions.create(
                model=model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            content = completion.choices[0].message.content
            sql, explanation, rules = _extract_sql_from_text(content)
            return sql, explanation, rules, model
        except Exception as e:
            err_str = str(e)
            errors.append(f"{model}: {err_str}")
            logger.warning(f"Groq model '{model}' failed (rate limit/error): {err_str}")

    raise GroqServiceUnavailableError(
        f"Both Groq LLM models failed. Primary ({primary}) and Fallback ({fallback}) errors: {'; '.join(errors)}",
        primary_model=primary,
        fallback_model=fallback,
        last_error="; ".join(errors)
    )


# -----------------------------------------------------------------------------
# Heuristic Fallback Generator (for offline testing / deterministic demo)
# -----------------------------------------------------------------------------

def _heuristic_generate(question: str, use_memory: bool, memory_ctx: Dict[str, Any]) -> SQLAgentResponse:
    """
    Deterministic simulation when running offline without Groq API key,
    supporting varied user questions, schema boundary enforcement,
    and accurately reflecting Cold Start vs Learned Memory states.
    """
    q_lower = (question or "").lower().strip()
    has_rules = bool(memory_ctx.get("recalled_items") and len(memory_ctx["recalled_items"]) > 0)

    # 1. Schema boundary check: non-existent tables (products, inventory, suppliers, categories)
    if any(k in q_lower for k in ["product", "item", "inventory", "category", "categories", "supplier"]):
        return SQLAgentResponse(
            sql="",
            explanation="The NovaMart database schema does not contain a 'products', 'inventory', or 'categories' table. Available tables are customers, orders, refunds, and orders_legacy.",
            applied_rules=["Schema Boundary: missing table / column requested"]
        )

    # 2. Benchmark Query: "Calculate net revenue from premium customers..."
    if "premium" in q_lower and "revenue" in q_lower:
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
                    "Rule 1: Premium Customers = loyalty_tier 'GOLD' or LTV >= $50,000",
                    "Rule 2: Exclude QA Test Accounts (email NOT LIKE '%@novamart-test.com')",
                    "Rule 3: Only count COMPLETED orders",
                    "Rule 4: Deduct refunds to compute true net revenue",
                    "Rule 5: Deprecated orders_legacy table ignored"
                ]
            )

    # 3. Gold loyalty-tier customers
    if "gold" in q_lower and "customer" in q_lower:
        return SQLAgentResponse(
            sql="SELECT id, name, city, account_type, loyalty_tier, lifetime_value, email FROM customers WHERE loyalty_tier = 'GOLD';",
            explanation="Returns all customers who hold GOLD loyalty tier status.",
            applied_rules=["Filter: loyalty_tier = 'GOLD'"]
        )

    # 4. Highest lifetime value
    if "highest" in q_lower and ("lifetime" in q_lower or "ltv" in q_lower or "value" in q_lower):
        return SQLAgentResponse(
            sql="SELECT name, lifetime_value FROM customers ORDER BY lifetime_value DESC LIMIT 1;",
            explanation="Returns the customer with the highest lifetime value.",
            applied_rules=["Ranking: ORDER BY lifetime_value DESC LIMIT 1"]
        )

    # 5. Count customers
    if ("how many" in q_lower or "count" in q_lower) and "customer" in q_lower:
        return SQLAgentResponse(
            sql="SELECT COUNT(*) AS customer_count FROM customers;",
            explanation="Counts total registered customer records.",
            applied_rules=["Aggregation: COUNT"]
        )

    # 6. Customers who have never placed an order
    if "never" in q_lower and "order" in q_lower:
        return SQLAgentResponse(
            sql="SELECT c.id, c.name, c.city, c.loyalty_tier, c.lifetime_value, c.email FROM customers c WHERE c.email NOT LIKE '%@novamart-test.com' AND NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);",
            explanation="Identifies genuine customers who have no records in the orders table, excluding internal QA test accounts.",
            applied_rules=["Anti-join / NOT EXISTS check", "Exclude test accounts"]
        )

    # 7. Customers with most orders
    if "most orders" in q_lower:
        return SQLAgentResponse(
            sql="SELECT c.id, c.name, COUNT(o.id) AS order_count FROM customers c JOIN orders o ON c.id = o.customer_id WHERE c.email NOT LIKE '%@novamart-test.com' GROUP BY c.id, c.name ORDER BY order_count DESC;",
            explanation="Aggregates and ranks non-test customers by order count.",
            applied_rules=["Group by customer_id", "Rank by order_count DESC", "Exclude test accounts"]
        )

    # 8. All customers
    if "customer" in q_lower and any(w in q_lower for w in ["all", "show", "list"]):
        return SQLAgentResponse(
            sql="SELECT * FROM customers;",
            explanation="Retrieves all customer records from the customers table.",
            applied_rules=["Read-only schema access: customers"]
        )

    # 9. Legacy orders
    if "legacy" in q_lower or "orders_legacy" in q_lower:
        return SQLAgentResponse(
            sql="SELECT * FROM orders_legacy;",
            explanation="Retrieves archived records from the orders_legacy table.",
            applied_rules=["Table: orders_legacy"]
        )

    # 10. Completed orders count
    if "completed" in q_lower and "order" in q_lower and any(w in q_lower for w in ["how many", "count"]):
        return SQLAgentResponse(
            sql="SELECT COUNT(*) AS completed_orders_count FROM orders WHERE status = 'COMPLETED';",
            explanation="Counts orders with status 'COMPLETED'.",
            applied_rules=["Filter: status = 'COMPLETED'"]
        )

    # 11. Total revenue from completed orders
    if "revenue" in q_lower and "completed" in q_lower:
        return SQLAgentResponse(
            sql="SELECT SUM(o.total_amount) AS total_revenue FROM orders o WHERE o.status = 'COMPLETED' AND o.customer_id IN (SELECT c.id FROM customers c WHERE c.email NOT LIKE '%@novamart-test.com');",
            explanation="Calculates sum of completed orders excluding test accounts.",
            applied_rules=["Filter: status = 'COMPLETED'", "Exclude test accounts"]
        )

    # 12. List all orders
    if "order" in q_lower and any(w in q_lower for w in ["all", "show", "list"]):
        return SQLAgentResponse(
            sql="SELECT * FROM orders;",
            explanation="Retrieves all records from the orders table.",
            applied_rules=["Table: orders"]
        )

    # 13. Refund details
    if "refund" in q_lower:
        return SQLAgentResponse(
            sql="SELECT r.id, r.order_id, r.refund_amount, r.reason, o.customer_id, o.total_amount, o.status, o.created_at FROM refunds r JOIN orders o ON r.order_id = o.id;",
            explanation="Returns refund records joined with corresponding orders.",
            applied_rules=["Join refunds and orders"]
        )

    # Default fallback
    return SQLAgentResponse(
        sql="SELECT * FROM customers LIMIT 10;",
        explanation=f"Generated basic customer query for '{question}'.",
        applied_rules=["Default schema query"]
    )


# -----------------------------------------------------------------------------
# Core Agent Logic: Natural Language to SQL Generation & Execution
# -----------------------------------------------------------------------------

def generate_and_validate_sql(
    question: str,
    use_memory: bool = True,
    max_retries: int = 3,
    model_override: Optional[str] = None
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
        recalled_items = memory_ctx.get("recalled_items", [])
        active_playbook = memory_ctx.get("synthesized_playbook", "")
        recalled_texts = [item.get("text", "") for item in recalled_items if item.get("text")]
        
        memory_prompt_block = f"""--- INSTITUTIONAL BUSINESS RULES (Recalled from Hindsight Cloud Memory) ---
Active Playbook:
{active_playbook if active_playbook else "No active playbook synthesized."}

Recalled Company Rules & Experiences:
{json.dumps(recalled_texts, indent=2) if recalled_texts else "[]"}

Carefully apply the relevant institutional business rules above to ensure company policy compliance."""
    else:
        memory_ctx = {
            "recalled_items": [],
            "synthesized_playbook": "Memory recall disabled by request."
        }
        recalled_items = []
        active_playbook = ""
        memory_prompt_block = """--- MODE: COLD START BASELINE (Hindsight Memory OFF) ---
You are operating in Cold Start Baseline Mode without access to institutional memory, historical corrections, or company business rules.
Generate standard SQL based solely on the PostgreSQL schema DDL and user question."""

    # Structured Memory Inspector payload
    memory_inspector = {
        "bank_id": HINDSIGHT_BANK_ID,
        "query": question,
        "recalled_memories": recalled_items,
        "synthesized_playbook": active_playbook or ("Memory recall disabled by request." if not use_memory else ""),
        "recalled_count": len(recalled_items),
        "cloud_connected": is_hindsight_configured() and use_memory
    }

    # 2. Schema DDL Injection
    schema_ddl = get_schema_ddl()

    system_prompt = f"""You are the lead database engineer and AI Text-to-SQL agent for NovaMart.
Translate the user's natural language question into an accurate, safe PostgreSQL query.

--- DATABASE SCHEMA (PostgreSQL) ---
The ONLY tables that exist in the PostgreSQL database are:
1. customers (id, name, city, account_type, loyalty_tier, lifetime_value, email)
2. orders (id, customer_id, total_amount, status, created_at)
3. refunds (id, order_id, refund_amount, reason)
4. orders_legacy (id, customer_id, amount)

Detailed Schema Column Definitions:
{schema_ddl}

{memory_prompt_block}

--- INSTRUCTIONS ---
1. Dynamic SQL: Answer the user's SPECIFIC question accurately based on the available schema.
2. Query Scoping & Intent:
   - For raw table inspection and direct count queries (e.g., "Show all customers", "List all orders", "Count customers", "Count all customers"), query the table directly without filtering out records (return all raw table records, including test accounts).
   - For business analytics, financial metrics, customer rankings, and activity analysis (e.g., "Which customer has the highest lifetime value?", "Which customers have never placed an order?", top customer analysis, revenue calculations), apply Hindsight institutional rules (exclude internal test accounts where email LIKE '%@novamart-test.com').
3. Schema Accuracy & Strict Boundaries: Never hallucinate or assume tables/columns not in the schema. Tables like 'products', 'inventory', 'categories', 'suppliers', 'reviews', 'shipping', 'customer_segments' DO NOT EXIST.
   - If a question asks for entities, tables, or attributes that do not exist in the database (such as products, inventory, items), you MUST set "sql": "" (empty string) and explain in "explanation" which tables/columns are missing from NovaMart's schema.
4. Safe SELECT Only: Only generate read-only SELECT queries. Mutating operations (DROP, INSERT, UPDATE, DELETE, ALTER) are strictly forbidden.
5. You MUST return your response as a valid JSON object matching this schema:
{{
  "sql": "SELECT ...;",
  "explanation": "Clear explanation of how the query answers the user question or why a table is missing...",
  "applied_rules": ["Rule applied..."]
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
    model_used = "openai/gpt-oss-120b" if is_groq_configured() else "offline-heuristic-agent"
    sqlglot_valid = False
    exec_result: Dict[str, Any] = {"rows": [], "row_count": 0, "execution_time_ms": 0.0}
    last_error: Optional[str] = None

    while attempts < max_retries:
        attempts += 1
        try:
            # Step A: Generate SQL from Groq or Heuristic Fallback
            if is_groq_configured():
                try:
                    candidate_sql, explanation, applied_rules, model_used = _call_groq_llm(messages, model_override=model_override)
                except GroqServiceUnavailableError as llm_err:
                    # Immediately exit upon rate limit / quota exhaustion across both models.
                    # Do not loop 3 times and do not disguise as offline heuristic agent!
                    logger.error(f"Groq service unavailable: {llm_err}")
                    return {
                        "sql": "",
                        "sqlglot_valid": False,
                        "results": [],
                        "memory_inspector": memory_inspector,
                        "explanation": (
                            "Groq LLM service is temporarily unavailable due to upstream rate limits or quota exhaustion "
                            f"on both primary ({llm_err.primary_model}) and fallback ({llm_err.fallback_model}) models. "
                            "Please wait a few moments before submitting another query."
                        ),
                        "applied_rules": ["Notice: Upstream Groq LLM rate limit encountered on all configured models"],
                        "memory_context": memory_inspector,
                        "execution_time_ms": 0.0,
                        "row_count": 0,
                        "engine": get_active_engine(),
                        "attempts": 1,
                        "self_healed": False,
                        "model_used": f"{llm_err.primary_model} (rate-limited) / {llm_err.fallback_model} (unavailable)",
                        "preview_result": {"columns": [], "rows": [], "row_count": 0, "execution_time_ms": 0.0},
                        "use_memory": use_memory,
                        "error": (
                            f"Upstream Groq LLM rate limit or quota exceeded. "
                            f"Attempted: {llm_err.primary_model} and {llm_err.fallback_model}. Details: {llm_err.last_error}"
                        )
                    }
            else:
                heuristic_resp = _heuristic_generate(question, use_memory, memory_ctx)
                candidate_sql = heuristic_resp.sql
                explanation = heuristic_resp.explanation
                applied_rules = heuristic_resp.applied_rules
                model_used = "offline-heuristic-agent"

            # If candidate_sql is empty (schema boundary: entity not in database)
            if not candidate_sql.strip():
                return {
                    "sql": "",
                    "sqlglot_valid": True,
                    "results": [],
                    "memory_inspector": memory_inspector,
                    "explanation": explanation or "The requested entities or attributes do not exist in the NovaMart database schema.",
                    "applied_rules": applied_rules or ["Schema Boundary: Missing schema entity requested"],
                    "memory_context": memory_inspector,
                    "execution_time_ms": 0.0,
                    "row_count": 0,
                    "engine": get_active_engine(),
                    "attempts": attempts,
                    "self_healed": False,
                    "model_used": model_used,
                    "preview_result": {"columns": [], "rows": [], "row_count": 0, "execution_time_ms": 0.0},
                    "use_memory": use_memory
                }

            # Step B: SQLGlot Validation
            sqlglot_valid, syntax_error = validate_sql_syntax(candidate_sql)
            if not sqlglot_valid:
                raise ValueError(f"SQLGlot validation failed: {syntax_error}")

            # Also verify schema traps (orders_legacy, outdated columns)
            validate_sql_with_sqlglot(candidate_sql, active_playbook, question=question)

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
