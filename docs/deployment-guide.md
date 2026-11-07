# TribalSQL — Deployment Guide (Render + Vercel)

Step-by-step production deployment guide for TribalSQL using **Render** for the FastAPI backend and **Vercel** for the React frontend.

---

## Part 1: Deploy Backend to Render

### 1. Prerequisites
- A GitHub repository containing the restructured `TribalSQL` codebase.
- A Render account ([render.com](https://render.com)).
- Supabase PostgreSQL credentials.
- Groq Cloud API Key ([console.groq.com](https://console.groq.com)).
- Vectorize Hindsight API Key ([hindsight.vectorize.io](https://hindsight.vectorize.io)).

### 2. Deployment Steps on Render
1. Navigate to the **Render Dashboard** and select **New +** $\to$ **Web Service** (or use the Blueprint from `backend/render.yaml`).
2. Connect your GitHub repository.
3. Configure settings:
   - **Name:** `tribalsql-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Python 3`
   - **Region:** `Oregon (US West)` or preferred
   - **Branch:** `main`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
4. Add the following **Environment Variables**:

| Variable Key | Value / Instructions |
| :--- | :--- |
| `GROQ_API_KEY` | Your Groq Cloud API Key (`gsk_...`) |
| `GROQ_PRIMARY_MODEL` | `openai/gpt-oss-120b` |
| `GROQ_FALLBACK_MODEL` | `openai/gpt-oss-120b` |
| `HINDSIGHT_API_KEY` | Your Vectorize Hindsight API Key (`hsk_...`) |
| `HINDSIGHT_BASE_URL` | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_BANK_ID` | `novamart-prod-db` |
| `DATABASE_URL` | Your Supabase connection string (`postgresql://postgres:...`) |
| `FRONTEND_URL` | Your Vercel frontend URL (e.g. `https://tribalsql.vercel.app`) |
| `PYTHON_VERSION` | `3.12.0` |

5. Click **Create Web Service**.
6. Once deployed, note your service URL (e.g. `https://tribalsql-backend.onrender.com`).
7. Test the health endpoint in your browser or terminal:
   ```bash
   curl https://tribalsql-backend.onrender.com/health
   ```
   Expected response:
   ```json
   {
     "status": "healthy",
     "database": { "engine": "postgresql", "url": "postgresql:****@..." },
     "hindsight": { "configured": true, "bank_id": "novamart-prod-db" },
     "llm": { "groq_configured": true, "primary_model": "openai/gpt-oss-120b" }
   }
   ```

---

## Part 2: Deploy Frontend to Vercel

### 1. Prerequisites
- A Vercel account ([vercel.com](https://vercel.com)).
- The live Render backend URL from Part 1.

### 2. Deployment Steps on Vercel
1. In the Vercel Dashboard, click **Add New...** $\to$ **Project**.
2. Select your GitHub repository.
3. Configure the Project:
   - **Framework Preset:** `Vite`
   - **Root Directory:** Edit and select `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
4. In **Environment Variables**, add:

| Variable Key | Value |
| :--- | :--- |
| `VITE_API_BASE_URL` | `https://tribalsql-backend.onrender.com` (Your Render URL) |
| `VITE_USE_MOCK_API` | `false` |

5. Click **Deploy**.
6. Vercel automatically deploys the single-page application with SPA routing rules defined in `frontend/vercel.json`.

---

## Part 3: Post-Deployment Verification

1. **CORS Handshake:** Ensure your Render backend has `FRONTEND_URL` set to the Vercel URL.
2. **Health Check:** Open the frontend and inspect the Dashboard System Status card; confirm all three green indicators:
   - PostgreSQL (Supabase): Connected
   - Hindsight Cloud (`novamart-prod-db`): Active
   - Groq LLM (`openai/gpt-oss-120b`): Ready
3. **Run Query Studio:**
   - Execute with Hindsight Memory **OFF**: Verify cold-start baseline result ($78,150.00).
   - Execute with Hindsight Memory **ON**: Verify learned result ($5,650.00).
4. **Run Live Benchmark in Comparison View:**
   - Click **⚡ Run Live Benchmark**; confirm dual execution succeeds against the deployed backend.

