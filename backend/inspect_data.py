import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv("DATABASE_URL"))
cur = conn.cursor(cursor_factory=RealDictCursor)

print("--- CUSTOMERS ---")
cur.execute("SELECT id, name, email, account_type, loyalty_tier, lifetime_value FROM customers ORDER BY id;")
customers = cur.fetchall()
for c in customers:
    print(dict(c))

print("\n--- ORDERS ---")
cur.execute("SELECT id, customer_id, total_amount, status FROM orders ORDER BY id;")
orders = cur.fetchall()
for o in orders:
    print(dict(o))

print("\n--- REFUNDS ---")
cur.execute("SELECT id, order_id, refund_amount, reason FROM refunds ORDER BY id;")
refunds = cur.fetchall()
for r in refunds:
    print(dict(r))

conn.close()

