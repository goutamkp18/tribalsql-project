# TribalSQL — AI Agent That Learns From Database Experience

TribalSQL is an enterprise Text-to-SQL AI agent that learns company-specific database rules, schema traps, and human corrections over time using **Hindsight Cloud Semantic Memory**, **Groq Cloud LLMs**, **SQLGlot AST validation**, and **Supabase PostgreSQL**.

---

## 🏛️ System Architecture

```
                                  +---------------------------+
                                  |      React Frontend       |
                                  |     (Vercel SPA Client)   |
                                  +-------------+-------------+
                                                |
                                                v  HTTPS / REST
                                  +---------------------------+
                                  |      FastAPI Server       |
                                  |     (Render Web Service)  |
                                  +-------------+-------------+
                                                |
                        +-----------------------+-----------------------+
                        |                                               |
                        v                                               v
          +---------------------------+                   +---------------------------+
          |   AI Agent Orchestrator   |                   |  Hindsight Memory Engine  |
          |       (ai_agent.py)       | <===============> |        (memory.py)        |
          |                           |    Recall/Reflect |                           |
          | • Groq (GPT-OSS-120B)     |    Retain Rules   | • Bank: novamart-prod-db  |
          | • SQLGlot AST Validation  |                   | • Retain Human Correction |
          | • Read-Only Enforcer      |                   | • Retain SQL Error Trap   |
          | • Self-Healing Loop       |                   | • Synthesize Playbook     |
          +-------------+-------------+                   +---------------------------+
                        |
                        v  Read-Only Execution
          +---------------------------+
          |    Database Layer (db.py) |
          |  Supabase PostgreSQL      |
          |  (100% Read-Only Session) |
          +---------------------------+
```

---

## 📁 Project Structure

```text
TribalSQL/
│
├── frontend/                     # React 19 + TypeScript + Vite SPA Client
│   ├── src/                      # Components, Pages, Services, Data
│   ├── public/                   # Static assets & icons
│   ├── index.html                # Entry HTML
│   ├── package.json              # Node dependencies
│   ├── vite.config.ts            # Vite configuration
│   ├── tsconfig.json             # TypeScript configuration
│   ├── tailwind.config.js        # Design system styles
│   ├── postcss.config.js         # PostCSS configuration
│   ├── .env.example              # Frontend environment template
│   ├── vercel.json               # Vercel deployment & SPA routing config
│   └── README.md                 # Frontend documentation
│
├── backend/                      # Production FastAPI Application
│   ├── main.py                   # FastAPI REST API & CORS endpoints
│   ├── ai_agent.py               # Groq LLM inference & SQLGlot validation
│   ├── memory.py                 # Hindsight Cloud SDK integration (Retain, Recall, Reflect)
│   ├── db.py                     # PostgreSQL connection & read-only executor
│   ├── test_db.py                # Database connection check
│   ├── test_flow.py              # End-to-end memory flow test
│   ├── test_sql_safety.py        # SQLGlot AST parser & mutation blocker tests
│   ├── run_learning_experiment.py# Automated NovaMart cold-start vs learned verification
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Backend environment template
│   ├── render.yaml               # Render deployment blueprint
│   └── README.md                 # Backend documentation
│
├── docs/                         # Architecture & Deployment Guides
│   ├── architecture.md           # System architecture & sequence diagrams
│   └── deployment-guide.md       # Step-by-step Render & Vercel deployment guide
│
├── .gitignore                    # Git exclusion rules (protects all secrets)
├── README.md                     # Monorepo documentation & quickstart
└── LICENSE                       # Apache 2.0 Open Source License
```

---

## 🚀 Quickstart: Local Development

### 1. Start Backend (FastAPI)
```bash
# Navigate to backend directory
cd backend

# Create & activate virtual environment
python -m venv .venv
source .venv/bin/activate         # On Windows: .\.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your GROQ_API_KEY, HINDSIGHT_API_KEY, and DATABASE_URL

# Start server
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
Backend will be online at `http://127.0.0.1:8000` (Health check: `http://127.0.0.1:8000/health`).

### 2. Start Frontend (React + Vite)
```bash
# In a separate terminal, navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Ensure VITE_API_BASE_URL=http://localhost:8000

# Start frontend development server
npm run dev
```
Frontend will be available at `http://localhost:5173`.

---

## 🧪 Verified Benchmark Experiment

Both backend scripts and frontend controls were tested against the identical question:  
**`"Calculate net revenue from premium customers"`**

- **Cold Start (Hindsight Memory OFF):** Evaluates naive raw schema DDL; triggers deprecated column trap (`account_type = 'premium'`), includes internal test accounts (`@novamart-test.com`), and includes cancelled orders $\to$ **$78,150.00**.
- **Learned Query (Hindsight Memory ON):** Recalls 32 items from Hindsight Cloud bank `novamart-prod-db`; filters `(loyalty_tier = 'GOLD' OR lifetime_value >= 50000)`, excludes test emails, filters `status = 'COMPLETED'`, and deducts aggregated refunds $\to$ **$5,650.00** (**EXACT MATHEMATICAL MATCH** on live PostgreSQL).

---

## 🌐 Production Deployment

- **Backend on Render:** Fully configured via `backend/render.yaml`. See [docs/deployment-guide.md](file:///docs/deployment-guide.md).
- **Frontend on Vercel:** Fully configured via `frontend/vercel.json`. See [docs/deployment-guide.md](file:///docs/deployment-guide.md).

---

## 📄 License

Licensed under the Apache License, Version 2.0. See [LICENSE](file:///LICENSE) for details.
