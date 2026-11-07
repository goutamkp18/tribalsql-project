"""
Migration 001: Create query_logs and learning_events tables
===========================================================
Safe, non-destructive migration that adds:
- query_logs: Logs every query execution (NL query, generated SQL, status, latency, rows, errors)
- learning_events: Logs human corrections and institutional learning events
Works for both Supabase PostgreSQL and SQLite.
"""

import os
import sys
import psycopg2
import sqlite3
from dotenv import dotenv_values

backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, ".env")
env_vals = dotenv_values(env_path)
DATABASE_URL = env_vals.get("DATABASE_URL") or os.getenv("DATABASE_URL")
SQLITE_PATH = os.path.join(backend_dir, "novamart.db")


def migrate_pg():
    if not DATABASE_URL:
        print("[ERROR] DATABASE_URL not found for PostgreSQL migration.")
        return False

    print(f"Applying migration to PostgreSQL at: {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else '...'}")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            # 1. query_logs table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS query_logs (
                    id BIGSERIAL PRIMARY KEY,
                    natural_language_query TEXT NOT NULL,
                    generated_sql TEXT,
                    execution_status VARCHAR(20) NOT NULL,
                    execution_time_ms NUMERIC(10, 2),
                    rows_returned INTEGER DEFAULT 0,
                    error_message TEXT,
                    used_hindsight_memory BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_query_logs_status ON query_logs(execution_status);
            """)

            # 2. learning_events table
            cur.execute("""
                CREATE TABLE IF NOT EXISTS learning_events (
                    id BIGSERIAL PRIMARY KEY,
                    correction_text TEXT NOT NULL,
                    category VARCHAR(50) DEFAULT 'business_rule',
                    verification_status VARCHAR(20) DEFAULT 'verified',
                    related_query_id BIGINT REFERENCES query_logs(id) ON DELETE SET NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at DESC);
            """)
            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_learning_events_status ON learning_events(verification_status);
            """)

            print("[SUCCESS] PostgreSQL tables query_logs and learning_events are ready.")
        return True
    except Exception as e:
        print(f"[ERROR] PostgreSQL migration failed: {e}")
        return False
    finally:
        conn.close()


def migrate_sqlite():
    if not os.path.exists(SQLITE_PATH):
        print(f"[WARN] SQLite file not found at {SQLITE_PATH}, skipping.")
        return True

    print(f"Applying migration to SQLite at: {SQLITE_PATH}")
    conn = sqlite3.connect(SQLITE_PATH)
    try:
        cur = conn.cursor()
        cur.execute("""
            CREATE TABLE IF NOT EXISTS query_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                natural_language_query TEXT NOT NULL,
                generated_sql TEXT,
                execution_status TEXT NOT NULL,
                execution_time_ms REAL,
                rows_returned INTEGER DEFAULT 0,
                error_message TEXT,
                used_hindsight_memory INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_query_logs_created_at ON query_logs(created_at DESC);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_query_logs_status ON query_logs(execution_status);")

        cur.execute("""
            CREATE TABLE IF NOT EXISTS learning_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                correction_text TEXT NOT NULL,
                category TEXT DEFAULT 'business_rule',
                verification_status TEXT DEFAULT 'verified',
                related_query_id INTEGER REFERENCES query_logs(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        cur.execute("CREATE INDEX IF NOT EXISTS idx_learning_events_created_at ON learning_events(created_at DESC);")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_learning_events_status ON learning_events(verification_status);")

        conn.commit()
        print("[SUCCESS] SQLite tables query_logs and learning_events are ready.")
        return True
    except Exception as e:
        print(f"[ERROR] SQLite migration failed: {e}")
        return False
    finally:
        conn.close()


def run_migration():
    pg_ok = migrate_pg()
    sqlite_ok = migrate_sqlite()
    return pg_ok and sqlite_ok


if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)

