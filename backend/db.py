"""
NovaMart Database Layer & Tribal Knowledge Trap Generator.

Manages PostgreSQL connection, schema inspection, read-only safe query execution,
and seeding NovaMart E-Commerce database with intentional traps.
Includes automatic SQLite fallback for zero-dependency local development & testing.
"""

import os
import re
import time
import logging
import sqlite3
from typing import Any, Dict, List, Optional, Tuple
from decimal import Decimal
from datetime import datetime, date
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

logger = logging.getLogger("tribalsql.db")
logging.basicConfig(level=logging.INFO)

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/novamart")
SQLITE_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "novamart.db")


def mask_database_url(url: str) -> str:
    """Masks database credentials for safe logging and status reporting."""
    if not url:
        return ""
    return re.sub(r':([^@]+)@', r':****@', url)

# Flag tracking active engine: "postgresql" or "sqlite"
_ACTIVE_ENGINE = None


def _serialize_row_val(val: Any) -> Any:
    """Helper to ensure all DB return types are JSON-serializable."""
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, (datetime, date)):
        return val.isoformat()
    return val


def _serialize_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [{k: _serialize_row_val(v) for k, v in row.items()} for row in rows]


def get_pg_connection():
    """Attempt connecting to PostgreSQL using psycopg2."""
    import psycopg2
    from psycopg2.extras import RealDictCursor
    return psycopg2.connect(DATABASE_URL)


def is_pg_available() -> bool:
    """Check if PostgreSQL at DATABASE_URL is accessible."""
    try:
        import psycopg2
        conn = psycopg2.connect(DATABASE_URL, connect_timeout=2)
        conn.close()
        return True
    except Exception as e:
        logger.debug(f"PostgreSQL connection check failed: {e}")
        return False


def get_active_engine() -> str:
    """Determine or return current active database engine."""
    global _ACTIVE_ENGINE
    if _ACTIVE_ENGINE is None:
        if is_pg_available():
            _ACTIVE_ENGINE = "postgresql"
            logger.info(f"Using PostgreSQL database at {mask_database_url(DATABASE_URL)}")
        else:
            _ACTIVE_ENGINE = "sqlite"
            logger.warning(f"PostgreSQL is unreachable. Falling back to SQLite at {SQLITE_DB_PATH}")
    return _ACTIVE_ENGINE


def set_active_engine(engine: str):
    global _ACTIVE_ENGINE
    _ACTIVE_ENGINE = engine


# -----------------------------------------------------------------------------
# Database Initialization & Trap Seeding
# -----------------------------------------------------------------------------

def init_and_seed_db() -> Dict[str, Any]:
    """
    Creates and seeds NovaMart E-Commerce database with intentional traps:
      1. customers: outdated 'account_type' ('premium'/'standard') vs true 'loyalty_tier' ('GOLD')
         and internal test accounts ('%@novamart-test.com').
      2. orders_legacy: Deprecated 2024 table that should never be queried.
      3. orders: status column ('COMPLETED', 'CANCELLED', 'PENDING').
      4. refunds: must be deducted to calculate true net revenue.
    """
    engine = get_active_engine()
    if engine == "postgresql":
        return _init_and_seed_pg()
    else:
        return _init_and_seed_sqlite()


def _init_and_seed_pg() -> Dict[str, Any]:
    import psycopg2
    from psycopg2.extras import RealDictCursor

    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Drop existing tables
        cur.execute("""
            DROP TABLE IF EXISTS refunds CASCADE;
            DROP TABLE IF EXISTS orders CASCADE;
            DROP TABLE IF EXISTS orders_legacy CASCADE;
            DROP TABLE IF EXISTS customers CASCADE;
        """)

        # 1. Customers Table (Trap: outdated account_type vs loyalty_tier & internal test emails)
        cur.execute("""
            CREATE TABLE customers (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                city TEXT,
                account_type TEXT, -- TRAP: Outdated column!
                loyalty_tier TEXT, -- 'GOLD', 'SILVER', 'BRONZE'
                lifetime_value NUMERIC(12, 2),
                email TEXT
            );
        """)

        # 2. Orders Legacy Table (TRAP: Deprecated 2024 table, never query!)
        cur.execute("""
            CREATE TABLE orders_legacy (
                id SERIAL PRIMARY KEY,
                customer_id INT,
                amount NUMERIC(12, 2)
            );
        """)

        # 3. Orders Table (Current system)
        cur.execute("""
            CREATE TABLE orders (
                id SERIAL PRIMARY KEY,
                customer_id INT REFERENCES customers(id),
                total_amount NUMERIC(12, 2),
                status TEXT, -- 'COMPLETED', 'CANCELLED', 'PENDING'
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 4. Refunds Table (TRAP: Must be deducted from gross sales!)
        cur.execute("""
            CREATE TABLE refunds (
                id SERIAL PRIMARY KEY,
                order_id INT REFERENCES orders(id),
                refund_amount NUMERIC(12, 2),
                reason TEXT
            );
        """)

        # Seed Customers (10 rows)
        customers_data = [
            (1, 'Alice Smith', 'New York', 'premium', 'GOLD', 65000.00, 'alice@gmail.com'),
            (2, 'Bob Jones', 'San Francisco', 'standard', 'GOLD', 52000.00, 'bob@work.com'),
            (3, 'Charlie Davis', 'Chicago', 'premium', 'GOLD', 85000.00, 'charlie.qa@novamart-test.com'),
            (4, 'Diana Prince', 'Austin', 'premium', 'BRONZE', 12000.00, 'diana@yahoo.com'),
            (5, 'Evan Wright', 'Seattle', 'standard', 'SILVER', 32000.00, 'evan.tester@novamart-test.com'),
            (6, 'Fiona Gallagher', 'Chicago', 'standard', 'SILVER', 28000.00, 'fiona@outlook.com'),
            (7, 'George Clark', 'Denver', 'premium', 'SILVER', 45000.00, 'george@domain.com'),
            (8, 'Hannah Abbott', 'Boston', 'standard', 'GOLD', 75000.00, 'hannah@magic.edu'),
            (9, 'Ian Malcolm', 'Miami', 'standard', 'BRONZE', 1500.00, 'ian@chaos.net'),
            (10, 'Julia Bot', 'Dallas', 'premium', 'GOLD', 99000.00, 'bot-loadtest@novamart-test.com')
        ]
        cur.executemany("""
            INSERT INTO customers (id, name, city, account_type, loyalty_tier, lifetime_value, email)
            VALUES (%s, %s, %s, %s, %s, %s, %s);
        """, customers_data)

        # Seed Orders Legacy (Bogus 2024 table data)
        orders_legacy_data = [
            (1, 1, 4500.00),
            (2, 2, 8200.00),
            (3, 4, 3100.00),
            (4, 8, 9400.00)
        ]
        cur.executemany("""
            INSERT INTO orders_legacy (id, customer_id, amount)
            VALUES (%s, %s, %s);
        """, orders_legacy_data)

        # Seed Active Orders (10 rows)
        orders_data = [
            (1, 1, 1000.00, 'COMPLETED', '2025-01-15 10:00:00'),
            (2, 1, 500.00, 'CANCELLED', '2025-01-16 14:30:00'),
            (3, 2, 2000.00, 'COMPLETED', '2025-01-18 09:15:00'),
            (4, 2, 800.00, 'PENDING', '2025-01-20 11:00:00'),
            (5, 3, 50000.00, 'COMPLETED', '2025-01-22 16:45:00'), # Test account trap!
            (6, 4, 1200.00, 'COMPLETED', '2025-01-23 13:20:00'), # Outdated premium flag trap!
            (7, 4, 600.00, 'CANCELLED', '2025-01-25 15:10:00'),
            (8, 8, 3500.00, 'COMPLETED', '2025-01-28 10:05:00'), # True premium (GOLD tier)
            (9, 10, 25000.00, 'COMPLETED', '2025-01-29 17:00:00'), # Test account trap!
            (10, 6, 450.00, 'COMPLETED', '2025-01-30 12:00:00')
        ]
        cur.executemany("""
            INSERT INTO orders (id, customer_id, total_amount, status, created_at)
            VALUES (%s, %s, %s, %s, %s);
        """, orders_data)

        # Seed Refunds (3 rows)
        refunds_data = [
            (1, 1, 150.00, 'Damaged item returned'),
            (2, 3, 200.00, 'Customer discount adjustment'),
            (3, 8, 500.00, 'Partial order return')
        ]
        cur.executemany("""
            INSERT INTO refunds (id, order_id, refund_amount, reason)
            VALUES (%s, %s, %s, %s);
        """, refunds_data)

        # Reset serial sequences
        for tbl in ['customers', 'orders_legacy', 'orders', 'refunds']:
            cur.execute(f"SELECT setval(pg_get_serial_sequence('{tbl}', 'id'), coalesce(max(id), 1), max(id) IS NOT null) FROM {tbl};")

        conn.commit()
        logger.info("NovaMart PostgreSQL database seeded successfully.")
        return {"status": "success", "engine": "postgresql", "customers": 10, "orders": 10, "refunds": 3}
    except Exception as e:
        conn.rollback()
        logger.error(f"Failed to seed PostgreSQL database: {e}")
        raise
    finally:
        cur.close()
        conn.close()


def _init_and_seed_sqlite() -> Dict[str, Any]:
    conn = sqlite3.connect(SQLITE_DB_PATH)
    cur = conn.cursor()

    try:
        cur.executescript("""
            DROP TABLE IF EXISTS refunds;
            DROP TABLE IF EXISTS orders;
            DROP TABLE IF EXISTS orders_legacy;
            DROP TABLE IF EXISTS customers;

            CREATE TABLE customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                city TEXT,
                account_type TEXT,
                loyalty_tier TEXT,
                lifetime_value NUMERIC(12, 2),
                email TEXT
            );

            CREATE TABLE orders_legacy (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INT,
                amount NUMERIC(12, 2)
            );

            CREATE TABLE orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                customer_id INT REFERENCES customers(id),
                total_amount NUMERIC(12, 2),
                status TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE refunds (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id INT REFERENCES orders(id),
                refund_amount NUMERIC(12, 2),
                reason TEXT
            );
        """)

        customers_data = [
            (1, 'Alice Smith', 'New York', 'premium', 'GOLD', 65000.00, 'alice@gmail.com'),
            (2, 'Bob Jones', 'San Francisco', 'standard', 'GOLD', 52000.00, 'bob@work.com'),
            (3, 'Charlie Davis', 'Chicago', 'premium', 'GOLD', 85000.00, 'charlie.qa@novamart-test.com'),
            (4, 'Diana Prince', 'Austin', 'premium', 'BRONZE', 12000.00, 'diana@yahoo.com'),
            (5, 'Evan Wright', 'Seattle', 'standard', 'SILVER', 32000.00, 'evan.tester@novamart-test.com'),
            (6, 'Fiona Gallagher', 'Chicago', 'standard', 'SILVER', 28000.00, 'fiona@outlook.com'),
            (7, 'George Clark', 'Denver', 'premium', 'SILVER', 45000.00, 'george@domain.com'),
            (8, 'Hannah Abbott', 'Boston', 'standard', 'GOLD', 75000.00, 'hannah@magic.edu'),
            (9, 'Ian Malcolm', 'Miami', 'standard', 'BRONZE', 1500.00, 'ian@chaos.net'),
            (10, 'Julia Bot', 'Dallas', 'premium', 'GOLD', 99000.00, 'bot-loadtest@novamart-test.com')
        ]
        cur.executemany("INSERT INTO customers VALUES (?, ?, ?, ?, ?, ?, ?)", customers_data)

        orders_legacy_data = [
            (1, 1, 4500.00),
            (2, 2, 8200.00),
            (3, 4, 3100.00),
            (4, 8, 9400.00)
        ]
        cur.executemany("INSERT INTO orders_legacy VALUES (?, ?, ?)", orders_legacy_data)

        orders_data = [
            (1, 1, 1000.00, 'COMPLETED', '2025-01-15 10:00:00'),
            (2, 1, 500.00, 'CANCELLED', '2025-01-16 14:30:00'),
            (3, 2, 2000.00, 'COMPLETED', '2025-01-18 09:15:00'),
            (4, 2, 800.00, 'PENDING', '2025-01-20 11:00:00'),
            (5, 3, 50000.00, 'COMPLETED', '2025-01-22 16:45:00'),
            (6, 4, 1200.00, 'COMPLETED', '2025-01-23 13:20:00'),
            (7, 4, 600.00, 'CANCELLED', '2025-01-25 15:10:00'),
            (8, 8, 3500.00, 'COMPLETED', '2025-01-28 10:05:00'),
            (9, 10, 25000.00, 'COMPLETED', '2025-01-29 17:00:00'),
            (10, 6, 450.00, 'COMPLETED', '2025-01-30 12:00:00')
        ]
        cur.executemany("INSERT INTO orders VALUES (?, ?, ?, ?, ?)", orders_data)

        refunds_data = [
            (1, 1, 150.00, 'Damaged item returned'),
            (2, 3, 200.00, 'Customer discount adjustment'),
            (3, 8, 500.00, 'Partial order return')
        ]
        cur.executemany("INSERT INTO refunds VALUES (?, ?, ?, ?)", refunds_data)

        conn.commit()
        logger.info(f"NovaMart SQLite fallback database seeded successfully at {SQLITE_DB_PATH}")
        return {"status": "success", "engine": "sqlite", "customers": 10, "orders": 10, "refunds": 3}
    finally:
        cur.close()
        conn.close()


# -----------------------------------------------------------------------------
# Safe Read-Only Query Executor
# -----------------------------------------------------------------------------

def execute_readonly_sql(sql: str) -> Dict[str, Any]:
    """
    Executes a read-only SQL query with session-level safety guards.
    Returns:
      - columns: List of column names
      - rows: List of dicts representing data rows
      - row_count: Number of returned rows
      - execution_time_ms: Query execution duration in ms
      - engine: 'postgresql' or 'sqlite'
    """
    engine = get_active_engine()
    start_time = time.perf_counter()

    if engine == "postgresql":
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(DATABASE_URL)
        try:
            # Enforce read-only transaction session
            conn.set_session(readonly=True, autocommit=True)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(sql)
                raw_rows = cur.fetchall() if cur.description else []
                columns = [desc[0] for desc in cur.description] if cur.description else []
                elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
                return {
                    "columns": columns,
                    "rows": _serialize_rows([dict(r) for r in raw_rows]),
                    "row_count": len(raw_rows),
                    "execution_time_ms": elapsed_ms,
                    "engine": "postgresql"
                }
        finally:
            conn.close()
    else:
        # SQLite executor
        conn = sqlite3.connect(SQLITE_DB_PATH)
        conn.row_factory = sqlite3.Row
        try:
            cur = conn.cursor()
            # SQLite query execution
            cur.execute(sql)
            raw_rows = cur.fetchall()
            columns = [desc[0] for desc in cur.description] if cur.description else []
            rows = [dict(r) for r in raw_rows]
            elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
            return {
                "columns": columns,
                "rows": _serialize_rows(rows),
                "row_count": len(rows),
                "execution_time_ms": elapsed_ms,
                "engine": "sqlite"
            }
        finally:
            conn.close()


# -----------------------------------------------------------------------------
# Dynamic Schema Inspection
# -----------------------------------------------------------------------------

def get_schema_ddl() -> str:
    """
    Dynamically inspects information_schema.columns (or SQLite sqlite_master)
    and returns a clean, structured text representation of the schema.
    """
    engine = get_active_engine()
    tables_summary = []

    if engine == "postgresql":
        import psycopg2
        from psycopg2.extras import RealDictCursor

        conn = psycopg2.connect(DATABASE_URL)
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("""
                    SELECT 
                        c.table_name,
                        c.column_name,
                        c.data_type,
                        c.is_nullable
                    FROM information_schema.columns c
                    WHERE c.table_schema = 'public'
                      AND c.table_name IN ('customers', 'orders', 'orders_legacy', 'refunds')
                    ORDER BY c.table_name, c.ordinal_position;
                """)
                rows = cur.fetchall()

                # Group by table
                schema_map: Dict[str, List[str]] = {}
                for r in rows:
                    tname = r['table_name']
                    schema_map.setdefault(tname, []).append(
                        f"    - {r['column_name']} ({r['data_type']})"
                    )

                for tname, cols in sorted(schema_map.items()):
                    tables_summary.append(f"Table: {tname}\n" + "\n".join(cols))

                return "\n\n".join(tables_summary)
        finally:
            conn.close()
    else:
        # SQLite schema inspection
        conn = sqlite3.connect(SQLITE_DB_PATH)
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT name, sql FROM sqlite_master 
                WHERE type='table' AND name IN ('customers', 'orders', 'orders_legacy', 'refunds')
                ORDER BY name;
            """)
            rows = cur.fetchall()
            for tname, create_sql in rows:
                cur.execute(f"PRAGMA table_info({tname});")
                cols = cur.fetchall()
                col_defs = [f"    - {c[1]} ({c[2]})" for c in cols]
                tables_summary.append(f"Table: {tname}\n" + "\n".join(col_defs))
            return "\n\n".join(tables_summary)
        finally:
            conn.close()


if __name__ == "__main__":
    res = init_and_seed_db()
    print("Database Initialized:", res)
    print("\n--- SCHEMA DDL ---")
    print(get_schema_ddl())

