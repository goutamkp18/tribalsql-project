// API Client Configuration for TribalSQL
// Provides explicit MOCK mode and LIVE FastAPI mode with real health checking.

export const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:8000'
).replace(/\/+$/, '');

export type ApiMode = 'live' | 'mock';

export function getApiMode(): ApiMode {
  const stored = localStorage.getItem('tribalsql_api_mode');
  if (stored === 'live' || stored === 'mock') {
    return stored;
  }
  return import.meta.env.VITE_USE_MOCK_API === 'true' ? 'mock' : 'live';
}

export function setApiMode(mode: ApiMode) {
  localStorage.setItem('tribalsql_api_mode', mode);
  window.dispatchEvent(new CustomEvent('tribalsql_api_mode_change', { detail: mode }));
}

export const IS_MOCK_MODE = getApiMode() === 'mock';

export interface ApiResponse<T> {
  data: T;
  source: 'mock' | 'fastapi';
  status: number;
  message?: string;
  error?: string;
}

export interface BackendHealth {
  online: boolean;
  engine: string;
  databaseUrl?: string;
  hindsightBank: string;
  hindsightConfigured: boolean;
  groqConfigured: boolean;
  primaryModel: string;
  error?: string;
}

/**
 * Checks connectivity to the root FastAPI backend (/health).
 */
export async function checkBackendHealth(): Promise<BackendHealth> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${API_BASE_URL}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      online: true,
      engine: data.database?.engine || 'postgresql',
      databaseUrl: data.database?.url,
      hindsightBank: data.hindsight?.bank_id || 'novamart-prod-db',
      hindsightConfigured: !!data.hindsight?.configured,
      groqConfigured: !!data.llm?.groq_configured,
      primaryModel: data.llm?.primary_model || 'openai/gpt-oss-120b',
    };
  } catch (err: any) {
    return {
      online: false,
      engine: 'offline',
      hindsightBank: 'unavailable',
      hindsightConfigured: false,
      groqConfigured: false,
      primaryModel: 'unavailable',
      error: err.name === 'AbortError' ? 'Connection timeout' : (err.message || 'FastAPI server unreachable'),
    };
  }
}

/**
 * Standard HTTP fetcher designed to route to FastAPI in LIVE mode or local mock in MOCK mode.
 * In LIVE mode, network and backend errors are THROWN and NEVER silently masked with mock data.
 */
export async function apiFetch<T>(
  endpoint: string, 
  options: RequestInit = {}, 
  mockFallback: () => Promise<T>
): Promise<ApiResponse<T>> {
  const currentMode = getApiMode();

  if (currentMode === 'mock') {
    // Artificial latency (100ms - 250ms) for realistic UX and loading states
    await new Promise((resolve) => setTimeout(resolve, Math.floor(Math.random() * 150) + 100));
    const mockData = await mockFallback();
    return {
      data: mockData,
      source: 'mock',
      status: 200,
      message: 'Simulated response (Explicit Mock Mode Active)',
    };
  }

  // LIVE MODE: Execute actual request against FastAPI
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!res.ok) {
      let errorDetail = `HTTP ${res.status}: ${res.statusText}`;
      try {
        const errorJson = await res.json();
        if (errorJson.detail) {
          errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail);
        }
      } catch {
        // use status text
      }
      throw new Error(`[FastAPI Error] ${errorDetail}`);
    }

    const json = await res.json();
    return {
      data: json,
      source: 'fastapi',
      status: res.status,
    };
  } catch (err: any) {
    console.error(`[TribalSQL LIVE API Failure] Request to ${endpoint} failed:`, err);
    // Explicitly throw the error in LIVE mode so the UI and caller know the real backend status!
    // Never silently replace a failed live request with mock results.
    throw new Error(err.message || `Failed to connect to backend at ${API_BASE_URL}`);
  }
}
