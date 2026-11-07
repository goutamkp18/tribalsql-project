# TribalSQL — System Architecture

TribalSQL is an enterprise AI Text-to-SQL agent that learns from database experience through persistent semantic memory, AST query validation, and human-in-the-loop feedback.

```mermaid
flowchart TD
    User["Data Analyst / User"]
    
    subgraph Frontend["React 19 + TypeScript (Vercel)"]
        UI["Query Studio / Comparison View / Memory Inspector"]
        API_Client["API Service Layer (api.ts, queryService.ts)"]
    end
    
    subgraph Backend["FastAPI Backend (Render)"]
        Router["FastAPI Application (main.py)"]
        Agent["AI Orchestrator (ai_agent.py)"]
        Safety["SQLGlot AST Validator"]
        MemEngine["Hindsight Integration Layer (memory.py)"]
        DBEngine["Database Engine (db.py)"]
    end
    
    subgraph CloudServices["External Cloud Services"]
        Groq["Groq Cloud LLM (openai/gpt-oss-120b)"]
        Hindsight["Hindsight Cloud Memory (novamart-prod-db)"]
        Supabase["Supabase Cloud PostgreSQL"]
    end

    User -->|Natural Language Prompt| UI
    UI --> API_Client
    API_Client -->|REST API (HTTPS)| Router
    Router --> Agent
    
    Agent -->|1. Recall Institutional Knowledge| MemEngine
    MemEngine <-->|Recall / Reflect| Hindsight
    
    Agent -->|2. Generate Candidate SQL| Groq
    Groq --> Agent
    
    Agent -->|3. AST Syntax & Schema Trap Safety| Safety
    
    Agent -->|4. Safe Read-Only Execution| DBEngine
    DBEngine <-->|SELECT Only| Supabase
    
    DBEngine --> Agent
    Agent -->|5. Retain Interaction Log| MemEngine
    MemEngine -->|Retain| Hindsight
    
    Agent --> Router
    Router --> UI
```

---

## Architecture Components

### 1. Frontend Client (`frontend/`)
- **Technology:** React 19, TypeScript, Vite, Tailwind CSS.
- **Role:** Interactive analyst workspace providing Query Studio, side-by-side memory comparison, schema explorer, real-time telemetry dashboard, and human correction ingestion.
- **Decoupling:** Pure stateless client communicating via standard HTTP/JSON with `VITE_API_BASE_URL`.

### 2. Backend Orchestration (`backend/`)
- **Technology:** FastAPI, Uvicorn, Python 3.12.
- **Role:**
  - Manages API contracts and CORS.
  - Formulates system prompts injecting raw PostgreSQL schema DDL and recalled Hindsight tribal memories.
  - Implements multi-tier self-healing retry loops when SQL errors occur.
  - Enforces database session locks (`SET TRANSACTION READ ONLY`) preventing any mutating SQL (INSERT, UPDATE, DELETE, DROP).

### 3. Hindsight Semantic Memory Cloud (`novamart-prod-db`)
- **Role:** Autonomous long-term memory engine across three operations:
  - **Retain:** Stores human analyst feedback, corrected SQL templates, and SQL error experiences.
  - **Recall:** Vector-searches memories against incoming natural language questions to retrieve matching business rules.
  - **Reflect:** Synthesizes multi-query observations into high-level organizational playbooks before SQL generation.

### 4. Database Layer (`db.py` & Supabase PostgreSQL)
- **Active Schema:** `customers` (10 rows), `orders` (10 rows), `orders_legacy` (4 rows), `refunds` (3 rows).
- **Schema Traps:**
  - Outdated `customers.account_type = 'premium'` (superseded by `loyalty_tier = 'GOLD' OR lifetime_value >= 50000`).
  - Internal QA accounts (`@novamart-test.com`) with $75,000 in fake test orders.
  - Cancelled orders ($4,000) that must be filtered out.
  - Deprecated `orders_legacy` table that ceased updates in 2024.

---

## Dual Execution Benchmark (The Proof Point)

```
Cold Start (use_memory=false):
  • LLM queries raw PostgreSQL schema DDL only
  • Falls into deprecated account_type trap
  • Includes fake QA test accounts and CANCELLED orders
  • Output: $78,150.00 (Grossly overstated)

Learned Query (use_memory=true):
  • Recalls 32 items from Hindsight Cloud bank 'novamart-prod-db'
  • Applies Gold/LTV>=50k filter, excludes QA accounts, requires COMPLETED, deducts refunds
  • Output: $5,650.00 (Exact mathematical match on live PostgreSQL)
```

