import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Database, 
  Cloud, 
  Zap, 
  Save, 
  Server,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useToast } from '../components/common/ToastContext';
import { API_BASE_URL, getApiMode, setApiMode, checkBackendHealth, BackendHealth } from '../services/api';

export const Settings: React.FC = () => {
  const { showToast } = useToast();

  // Settings State
  const [fastApiUrl, setFastApiUrl] = useState(API_BASE_URL);
  const [mockMode, setMockMode] = useState(getApiMode() === 'mock');
  const [healthStatus, setHealthStatus] = useState<BackendHealth | null>(null);

  // DB Settings
  const [dbHost, setDbHost] = useState('db.rfgwsaxedntakfcxrvyw.supabase.co');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('postgres');
  const [dbUser, setDbUser] = useState('postgres');
  const [isTestingDb, setIsTestingDb] = useState(false);

  // Hindsight Settings
  const [hindsightCluster, setHindsightCluster] = useState('https://api.hindsight.vectorize.io');
  const [hindsightNamespace, setHindsightNamespace] = useState('novamart-prod-db');
  const [hindsightApiKey, setHindsightApiKey] = useState('hsk_••••••••••••••••••••••••');
  const [isTestingHindsight, setIsTestingHindsight] = useState(false);

  // LLM Settings
  const [llmModel, setLlmModel] = useState('openai/gpt-oss-120b');
  const [temperature, setTemperature] = useState('0.1');

  useEffect(() => {
    const fetchLiveConfig = async () => {
      try {
        const health = await checkBackendHealth();
        setHealthStatus(health);
        if (health.online) {
          if (health.primaryModel) setLlmModel(health.primaryModel);
          if (health.hindsightBank) setHindsightNamespace(health.hindsightBank);
        }
      } catch (err) {
        console.warn('Could not read backend health for settings:', err);
      }
    };
    fetchLiveConfig();
  }, []);

  const handleTestDatabase = async () => {
    setIsTestingDb(true);
    try {
      const health = await checkBackendHealth();
      setHealthStatus(health);
      if (health.online) {
        showToast(
          `${health.engine.toUpperCase()} Connected`,
          `FastAPI active. Database: ${health.engine} (${health.databaseUrl || 'Supabase'}), Bank: ${health.hindsightBank}`,
          'success'
        );
      } else {
        showToast(
          'Backend Connection Failed',
          health.error || 'FastAPI server is not reachable on port 8000',
          'error'
        );
      }
    } catch (err: any) {
      showToast('Database Test Failed', err.message, 'error');
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleTestHindsight = async () => {
    setIsTestingHindsight(true);
    try {
      const health = await checkBackendHealth();
      setHealthStatus(health);
      if (health.online) {
        showToast(
          'Hindsight Bank Verified',
          `Target bank: ${health.hindsightBank} (Configured: ${health.hindsightConfigured ? 'Hindsight Cloud Active' : 'Local Fallback Engine Active'})`,
          health.hindsightConfigured ? 'success' : 'warning'
        );
      } else {
        showToast('Hindsight Test Blocked', 'FastAPI backend must be online to verify Hindsight SDK status.', 'error');
      }
    } finally {
      setIsTestingHindsight(false);
    }
  };

  const handleSaveAll = () => {
    setApiMode(mockMode ? 'mock' : 'live');
    showToast('Settings Saved Successfully', `Data Provider Mode set to ${mockMode ? 'MOCK SIMULATION' : 'LIVE FASTAPI'}.`, 'success');
  };

  return (
    <div className="space-y-6 pb-12 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAEA] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#142337] tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-6 h-6 text-[#F45B0B]" />
            <span>Platform Configuration</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Configure database drivers, Hindsight persistent memory clusters, Groq LLM inference, and FastAPI routing.
          </p>
        </div>

        <Button variant="primary" size="md" onClick={handleSaveAll} leftIcon={<Save className="w-4 h-4" />}>
          Save Configuration
        </Button>
      </div>

      {/* Backend & Mode Config */}
      <div className="rounded-2xl bg-white border border-[#E4EAEA] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4EAEA] pb-3">
          <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
            <Server className="w-4 h-4 text-[#F45B0B]" />
            <span>FastAPI Backend Target</span>
          </div>
          <Badge variant={!mockMode ? 'emerald' : 'orange'} dot>
            {!mockMode ? 'Connected to Live Server' : 'Simulated Demo Mode'}
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#142337] font-bold mb-1">
              API Base URL (FastAPI Endpoint)
            </label>
            <input
              type="text"
              value={fastApiUrl}
              onChange={(e) => setFastApiUrl(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B] font-medium"
            />
            <p className="text-[10px] text-[#64748B] mt-1">Configurable via VITE_API_BASE_URL env variable.</p>
          </div>

          <div className="flex flex-col justify-center">
            <label className="block text-[#142337] font-bold mb-1">
              Data Provider Mode
            </label>
            <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
              <input
                type="checkbox"
                id="mockToggle"
                checked={!mockMode}
                onChange={(e) => setMockMode(!e.target.checked)}
                className="w-4 h-4 accent-[#16A36A] rounded cursor-pointer"
              />
              <label htmlFor="mockToggle" className="text-xs text-[#142337] font-medium cursor-pointer">
                <strong>LIVE FastAPI Mode Active</strong> (Real Supabase PostgreSQL & Hindsight Cloud)
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* PostgreSQL Database Connection */}
      <div className="rounded-2xl bg-white border border-[#E4EAEA] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4EAEA] pb-3">
          <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
            <Database className="w-4 h-4 text-[#F45B0B]" />
            <span>PostgreSQL Database Connection</span>
          </div>
          <Button
            variant="subtle"
            size="sm"
            onClick={handleTestDatabase}
            isLoading={isTestingDb}
          >
            Test Connection
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block text-[#64748B] font-bold mb-1">Host</label>
            <input
              type="text"
              value={dbHost}
              onChange={(e) => setDbHost(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B]"
            />
          </div>
          <div>
            <label className="block text-[#64748B] font-bold mb-1">Port</label>
            <input
              type="text"
              value={dbPort}
              onChange={(e) => setDbPort(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B]"
            />
          </div>
          <div>
            <label className="block text-[#64748B] font-bold mb-1">Database Name</label>
            <input
              type="text"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B]"
            />
          </div>
          <div>
            <label className="block text-[#64748B] font-bold mb-1">Username</label>
            <input
              type="text"
              value={dbUser}
              onChange={(e) => setDbUser(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B]"
            />
          </div>
        </div>
      </div>

      {/* Hindsight Cloud Memory Engine Settings */}
      <div className="rounded-2xl bg-white border border-[#A8C9C8] p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-[#E4EAEA] pb-3">
          <div className="flex items-center gap-2 text-[#142337] font-bold text-sm">
            <Cloud className="w-4 h-4 text-[#F45B0B]" />
            <span>Hindsight Persistent Memory Cloud</span>
          </div>
          <Button
            variant="powder"
            size="sm"
            onClick={handleTestHindsight}
            isLoading={isTestingHindsight}
          >
            Verify Memory Handshake
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-[#64748B] font-bold mb-1">Cluster Endpoint</label>
            <input
              type="text"
              value={hindsightCluster}
              onChange={(e) => setHindsightCluster(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B]"
            />
          </div>
          <div>
            <label className="block text-[#64748B] font-bold mb-1">Bank ID</label>
            <input
              type="text"
              value={hindsightNamespace}
              onChange={(e) => setHindsightNamespace(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B]"
            />
          </div>
          <div>
            <label className="block text-[#64748B] font-bold mb-1">API Key (Protected)</label>
            <input
              type="password"
              value={hindsightApiKey}
              readOnly
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#64748B] text-xs focus:outline-none cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Groq LLM Inference */}
      <div className="rounded-2xl bg-white border border-[#E4EAEA] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-[#142337] font-bold text-sm border-b border-[#E4EAEA] pb-3">
          <Zap className="w-4 h-4 text-[#F45B0B] fill-[#F45B0B]" />
          <span>Groq High-Speed Inference Engine</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block text-[#142337] font-bold mb-1">Target Model</label>
            <select
              value={llmModel}
              onChange={(e) => setLlmModel(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B] font-medium"
            >
              <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Primary Configured Model)</option>
              <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Complex Reasoning)</option>
              <option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (High Token Context)</option>
            </select>
          </div>

          <div>
            <label className="block text-[#142337] font-bold mb-1">Sampling Temperature</label>
            <input
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] font-mono text-[#142337] text-xs focus:outline-none focus:border-[#F45B0B] font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
