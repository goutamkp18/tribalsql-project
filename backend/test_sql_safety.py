from ai_agent import validate_sql_syntax, validate_sql_with_sqlglot

test_queries = [
    ("DROP TABLE customers;", "DROP table"),
    ("DELETE FROM customers;", "DELETE"),
    ("UPDATE customers SET city = 'Test';", "UPDATE"),
    ("INSERT INTO customers VALUES (1);", "INSERT"),
    ("TRUNCATE TABLE orders;", "TRUNCATE"),
    ("SELECT 1; DROP TABLE customers;", "Multiple statements"),
    ("SELCT * FORM cust;", "Invalid SQL syntax"),
    ("ALTER TABLE customers ADD COLUMN foo INT;", "ALTER TABLE"),
    ("SELECT * FROM orders_legacy;", "Deprecated orders_legacy table"),
    ("SELECT id, name FROM customers;", "Valid SELECT")
]

for sql, desc in test_queries:
    valid, err = validate_sql_syntax(sql)
    glot_raised = None
    try:
        validate_sql_with_sqlglot(sql)
        glot_pass = True
    except ValueError as ve:
        glot_pass = False
        glot_raised = str(ve)
    print(f"[{desc}]")
    print(f"  SQL: {sql}")
    print(f"  validate_sql_syntax: valid={valid}, err={err}")
    print(f"  validate_sql_with_sqlglot: pass={glot_pass}, err={glot_raised}")

print("\n[Database-Level Read-Only Transaction Enforcement Test]")
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
conn.set_session(readonly=True, autocommit=True)
cur = conn.cursor()
try:
    cur.execute("UPDATE customers SET name = 'Hacked' WHERE id = 1;")
    print("  MUTATION SUCCEEDED (UNSAFE!)")
except Exception as e:
    print("  DATABASE INDEPENDENTLY ENFORCED READ-ONLY ACCESS!")
    print(f"  Exact PG Error: {e}".strip())
conn.close()
