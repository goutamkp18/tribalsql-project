import json
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_endpoint(method, url, json_body=None, params=None):
    print(f"\nTesting {method} {url}...")
    if method == "GET":
        resp = client.get(url, params=params)
    elif method == "POST":
        resp = client.post(url, json=json_body)
    else:
        raise ValueError("Unsupported method")
    
    print(f"  Status: {resp.status_code}")
    try:
        data = resp.json()
        print(f"  Response (truncated): {str(data)[:250]}")
        return resp.status_code, data
    except Exception:
        print(f"  Response text (non-JSON): {resp.text[:250]}")
        return resp.status_code, resp.text

print("========================================")
print("PHASE 8: FASTAPI ENDPOINT VERIFICATION")
print("========================================")

# 1. GET /
test_endpoint("GET", "/")

# 2. GET /health
test_endpoint("GET", "/health")

# 3. GET /api/schema
test_endpoint("GET", "/api/schema")

# 4. POST /api/query
test_endpoint("POST", "/api/query", json_body={
    "question": "Calculate net revenue from premium customers",
    "use_memory": True
})

# 5. POST /api/execute-sql
test_endpoint("POST", "/api/execute-sql", json_body={
    "sql": "SELECT id, name, loyalty_tier FROM customers WHERE loyalty_tier = 'GOLD';"
})

# 6. POST /api/correct
test_endpoint("POST", "/api/correct", json_body={
    "question": "Calculate net revenue from premium customers",
    "wrong_sql": "SELECT SUM(total_amount) FROM orders;",
    "corrected_sql": "SELECT SUM(total_amount - refund_amount) FROM orders...",
    "business_rule": "Always subtract refunds and exclude cancelled orders."
})

# 7. GET /api/memory/inspect
test_endpoint("GET", "/api/memory/inspect", params={"q": "premium customer revenue"})

# 8. GET /api/memory/retained
test_endpoint("GET", "/api/memory/retained")

print("\nAPI test script completed.")

