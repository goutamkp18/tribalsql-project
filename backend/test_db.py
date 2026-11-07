import os
import re
import psycopg2
from dotenv import load_dotenv

load_dotenv()
url = os.getenv("DATABASE_URL")

if url:
    masked_url = re.sub(r':([^@]+)@', ':****@', url)
    print(f"Trying to connect to: {masked_url}")
else:
    print("DATABASE_URL is not set.")

try:
    conn = psycopg2.connect(url, connect_timeout=5)
    print("SUCCESS! Connected to Supabase PostgreSQL successfully!")
    conn.close()
except Exception as e:
    print("\nCONNECTION FAILED! Here is the exact error:")
    print(e)
