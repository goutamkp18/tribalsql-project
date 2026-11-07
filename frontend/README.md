# TribalSQL — React + TypeScript Frontend

Modern enterprise dashboard for **TribalSQL — AI Agent That Learns From Database Experience**.

## Features

- **Query Studio:** Natural language prompt input with interactive **Hindsight Memory ON/OFF switch**, live SQL generation, AST safety validation, and query execution.
- **Comparison View:** Side-by-side benchmark studio with **⚡ Run Live Benchmark** executing dual queries against PostgreSQL.
- **Memory Inspector:** Deep observability into Hindsight Cloud memory (Retain, Recall, Reflect, Mental Models).
- **Database Explorer:** Schema inspector distinguishing active Supabase tables (`customers`, `orders`, `orders_legacy`, `refunds`) from catalog specification models.
- **Dashboard:** Real-time KPI metrics, query activity charts, and system status connected to backend health.
- **Learning History:** Complete audit trail of human corrections and self-healing error recoveries.
- **Settings:** Environment telemetry, driver configuration, and masked credentials.

## Design System

Strict enterprise palette:
- **Powder Blue:** `#A8C9C8` (Accents, badges, borders)
- **Pure White:** `#FFFFFF` (Surface cards, modals)
- **Racing Orange:** `#F45B0B` (Primary actions, brand highlights)
- **Dark Navy:** `#142337` (Primary headings, dark text)
- **Soft Grey:** `#F5F7F7` (Background canvas, inputs, tables)

---

## Environment Variables

Copy `.env.example` to `.env` or `.env.local` for local development:

```env
# Backend API Base URL
VITE_API_BASE_URL=http://localhost:8000

# Mock API flag (false = communicate directly with FastAPI backend)
VITE_USE_MOCK_API=false
```

> **Security Note:** Never put database passwords, Groq API keys, or Hindsight API keys into frontend environment variables. All secrets reside exclusively in the backend.

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev

# 3. Production build & type-check
npm run build
```

---

## Deployment on Vercel

Configured for one-click deployment using `vercel.json`:
1. Import repository into Vercel.
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. In **Environment Variables**, set:
   - `VITE_API_BASE_URL`: The deployed Render backend URL (e.g. `https://tribalsql-backend.onrender.com`).
   - `VITE_USE_MOCK_API`: `false`.
5. Deploy!
