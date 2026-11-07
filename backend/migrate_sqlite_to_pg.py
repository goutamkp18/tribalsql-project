"""
Safe, Idempotent SQLite to PostgreSQL Data Migration Script for NovaMart
=======================================================================
Migrates all tables (customers, orders, refunds, orders_legacy) from SQLite
(backend/novamart.db) to Supabase PostgreSQL using DATABASE_URL.

Features:
- Preserves all original primary key IDs and values exactly.
- Uses 'INSERT ... ON CONFLICT (id) DO UPDATE SET ...' for 100% idempotency.
- Respects Foreign Key constraints: customers -> orders -> refunds, and orders_legacy.
- Syncs PostgreSQL SERIAL sequences (setval) after migration.
- Never deletes or modifies SQLite source data.
- Masks database connection credentials in output.
- Supports --dry-run mode (default is dry-run for safety).
"""

import os
import sys
import argparse
import sqlite3
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment from current dir or backend dir
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
SQLITE_DB_PATH = os.path.join(os.path.dirname(__file__), "novamart.db")


def mask_url(url: str) -> str:
    if not url:
        return "None"
    try:
        prefix, rest = url.split("://", 1)
        user_pass, host_db = rest.split("@", 1)
        user = user_pass.split(":")[0]
        return f"{prefix}://{user}:****@{host_db}"
    except Exception:
        return "postgresql://****"


def get_sqlite_conn():
    if not os.path.exists(SQLITE_DB_PATH):
        raise FileNotFoundError(f"SQLite database not found at {SQLITE_DB_PATH}")
    # Open read-only
    conn = sqlite3.connect(f"file:{os.path.abspath(SQLITE_DB_PATH)}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def get_pg_conn():
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL is not set in environment.")
    return psycopg2.connect(DATABASE_URL)


TABLES_IN_ORDER = [
    {
        "name": "customers",
        "columns": ["id", "name", "city", "account_type", "loyalty_tier", "lifetime_value", "email"],
        "pk": "id",
    },
    {
        "name": "orders",
        "columns": ["id", "customer_id", "total_amount", "status", "created_at"],
        "pk": "id",
    },
    {
        "name": "refunds",
        "columns": ["id", "order_id", "refund_amount", "reason"],
        "pk": "id",
    },
    {
        "name": "orders_legacy",
        "columns": ["id", "customer_id", "amount"],
        "pk": "id",
    },
]


def inspect_data():
    print("=" * 60)
    print("NovaMart Migration Inspection & Plan")
    print("=" * 60)
    print(f"Source SQLite DB:     {SQLITE_DB_PATH}")
    print(f"Target PostgreSQL DB: {mask_url(DATABASE_URL)}")
    print("-" * 60)

    sqlite_conn = get_sqlite_conn()
    pg_conn = get_pg_conn()

    summary = []

    with sqlite_conn, pg_conn.cursor() as pg_cur:
        for t in TABLES_IN_ORDER:
            tname = t["name"]
            # SQLite count
            s_cur = sqlite_conn.execute(f"SELECT COUNT(*) FROM {tname}")
            sqlite_count = s_cur.fetchone()[0]

            # PG count
            pg_cur.execute(f"SELECT COUNT(*) FROM {tname}")
            pg_count = pg_cur.fetchone()[0]

            summary.append((tname, sqlite_count, pg_count))
            print(f"Table '{tname}': SQLite={sqlite_count} rows | PostgreSQL={pg_count} rows")

    sqlite_conn.close()
    pg_conn.close()
    return summary


def run_migration(execute: bool = False):
    print("=" * 60)
    if execute:
        print("EXECUTING MIGRATION: SQLite -> Supabase PostgreSQL")
    else:
        print("DRY-RUN SIMULATION (No writes to PostgreSQL)")
    print("=" * 60)

    sqlite_conn = get_sqlite_conn()
    pg_conn = get_pg_conn()

    try:
        with pg_conn.cursor() as pg_cur:
            for t in TABLES_IN_ORDER:
                tname = t["name"]
                cols = t["columns"]
                pk = t["pk"]

                # Fetch all rows from SQLite
                s_cur = sqlite_conn.execute(f"SELECT {', '.join(cols)} FROM {tname} ORDER BY {pk}")
                rows = s_cur.fetchall()
                print(f"\nProcessing table '{tname}' ({len(rows)} rows to sync)...")

                if not rows:
                    print(f"  No rows to sync for {tname}.")
                    continue

                # Prepare ON CONFLICT DO UPDATE statement
                cols_str = ", ".join(cols)
                placeholders = ", ".join(["%s"] * len(cols))
                update_set = ", ".join([f"{col} = EXCLUDED.{col}" for col in cols if col != pk])

                upsert_query = f"""
                    INSERT INTO {tname} ({cols_str})
                    VALUES ({placeholders})
                    ON CONFLICT ({pk}) DO UPDATE SET
                    {update_set};
                """

                for row in rows:
                    values = tuple(row[col] for col in cols)
                    # Execute within transaction (validated by PostgreSQL)
                    pg_cur.execute(upsert_query, values)
                    # print sample for verification
                    if row[pk] == 1:
                        print(f"  [Sample ID 1] {dict(row)}")

                # Sync PostgreSQL serial sequence within transaction
                seq_query = f"""
                    SELECT setval(
                        pg_get_serial_sequence('{tname}', '{pk}'),
                        COALESCE((SELECT MAX({pk}) FROM {tname}), 1),
                        true
                    );
                """
                try:
                    pg_cur.execute(seq_query)
                    print(f"  Sequence reset for {tname}.{pk} completed.")
                except Exception as e:
                    print(f"  Sequence reset note for {tname}: {e}")

                print(f"  Table '{tname}': {len(rows)} records processed successfully.")

        if execute:
            pg_conn.commit()
            print("\nMigration committed successfully to Supabase PostgreSQL!")
        else:
            pg_conn.rollback()
            print("\nDry-run complete. PostgreSQL transaction rolled back. 0 rows committed.")

    except Exception as e:
        if execute:
            pg_conn.rollback()
        print(f"\n[ERROR] Migration encountered an error: {e}")
        raise
    finally:
        sqlite_conn.close()
        pg_conn.close()


def main():
    parser = argparse.ArgumentParser(description="NovaMart SQLite to PostgreSQL safe migration")
    parser.add_argument("--execute", action="store_true", help="Actually commit changes to PostgreSQL (default: dry run)")
    parser.add_argument("--inspect-only", action="store_true", help="Only inspect row counts and exit")
    args = parser.parse_args()

    inspect_data()

    if args.inspect_only:
        return

    run_migration(execute=args.execute)


if __name__ == "__main__":
    main()

