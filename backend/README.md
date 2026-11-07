# TribalSQL — Backend API Service

FastAPI backend service powering **TribalSQL — AI Agent That Learns From Database Experience**.

## Overview

The backend is responsible for:
- **Text-to-SQL Translation:** Orchestrates Groq LLM inference using model `openai/gpt-oss-120b`.
- **Hindsight Cloud Memory Integration:** Connects to bank `novamart-prod-db` to Retain, Recall, and Reflect institutional knowledge.
- **Database Engine:** Executes safe, read-only SQL queries on Supabase PostgreSQL (with automatic SQLite fallback).
- **SQLGlot AST Safety Validation:** Enforces read-only statements and blocks mutating SQL (DROP, DELETE, UPDATE) and deprecated schema access.

---

## Environment Variables

Copy `.env.example` to `.env` before running locally:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `GROQ_API_KEY` | Groq Cloud API key for LLM inference | `gsk_...` |
| `GROQ_PRIMARY_MODEL` | Primary text-to-SQL generation model | `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODEL` | Backup model if primary fails | `openai/gpt-oss-120b` |
| `HINDSIGHT_API_KEY` | Vectorize Hindsight Cloud API key | `hsk_...` |
| `HINDSIGHT_BASE_URL` | Hindsight Cloud API base URL | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_BANK_ID` | Active Hindsight memory bank | `novamart-prod-db` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:pwd@host:5432/postgres` |
| `FRONTEND_URL` | Allowed origin(s) for CORS (comma-separated) | `http://localhost:5173,https://tribalsql.vercel.app` |
| `PORT` | HTTP port for server | `8000` |

---

## Local Development

```bash
# 1. Create and activate virtual environment
python -m venv .venv
source .venv/bin/activate       # On Windows: .\.venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run FastAPI server locally
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

---

## Key Endpoints

- `GET /health` — Service health and telemetry (PostgreSQL, Hindsight Cloud, Groq).
- `GET /api/schema` — Active database schema DDL.
- `POST /api/query` — End-to-end question translation, AST validation, and database execution.
- `POST /api/execute-sql` — Safe, read-only SQL execution.
- `POST /api/feedback` — Ingest human analyst corrections into Hindsight Cloud memory.
- `GET /api/memory/inspect?q=...` — Semantic recall and reflection playbook inspection.
- `GET /api/memory/retained` — List stored retained memories.

---

## Deployment on Render

This service is configured for zero-friction deployment to Render using `render.yaml`:
1. Push repository to GitHub.
2. In Render Dashboard, click **New +** $\to$ **Blueprint** (or **Web Service**).
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `pip install -r requirements.txt`.
5. Set **Start Command** to `uvicorn main:app --host 0.0.0.0 --port $PORT`.
6. Add the secret environment variables (`GROQ_API_KEY`, `HINDSIGHT_API_KEY`, `DATABASE_URL`, `FRONTEND_URL`).

