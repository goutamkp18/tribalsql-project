import React, { useState, useEffect } from 'react';
import { 
  ShoppingCart, 
  ChevronDown, 
  Database, 
  Cloud, 
  Zap, 
  Bell, 
  Menu,
  Check,
  Server
} from 'lucide-react';
import { SystemStatus } from '../../types';
import { checkBackendHealth, getApiMode, setApiMode, BackendHealth, ApiMode } from '../../services/api';

interface TopNavProps {
  systemStatus: SystemStatus;
  onOpenMobileMenu: () => void;
  onOpenNotifications: () => void;
  unreadCount?: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  systemStatus,
  onOpenMobileMenu,
  onOpenNotifications,
  unreadCount = 1,
}) => {
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState('NovaMart');
  const [apiMode, setMode] = useState<ApiMode>(getApiMode());
  const [health, setHealth] = useState<BackendHealth | null>(null);

  const workspaces = [
    { name: 'NovaMart', subtitle: 'E-commerce Analytics', active: true },
    { name: 'NovaFinance', subtitle: 'Ledger & Treasury', active: false },
    { name: 'NovaLogistics', subtitle: 'Fulfillment & Fleet', active: false },
  ];

  useEffect(() => {
    let mounted = true;
    const pollHealth = async () => {
      const res = await checkBackendHealth();
      if (mounted) setHealth(res);
    };

    pollHealth();
    const interval = setInterval(pollHealth, 10000);

    const handleModeChange = (e: any) => {
      setMode(e.detail || getApiMode());
      pollHealth();
    };

    window.addEventListener('tribalsql_api_mode_change', handleModeChange);
    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('tribalsql_api_mode_change', handleModeChange);
    };
  }, []);

  const toggleApiMode = () => {
    const nextMode: ApiMode = apiMode === 'live' ? 'mock' : 'live';
    setApiMode(nextMode);
    setMode(nextMode);
  };

  const isLive = apiMode === 'live';
  const isOnline = health?.online ?? false;
  const dbEngine = health?.engine?.toUpperCase() || (systemStatus.postgresql.status === 'connected' ? 'POSTGRESQL' : 'SQLITE');

  return (
    <header className="sticky top-0 z-30 h-18 bg-white border-b border-[#E4EAEA] px-4 sm:px-8 flex items-center justify-between">
      {/* Left side: Mobile Toggle + Workspace Switcher */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-lg text-[#142337] hover:bg-[#F5F7F7] transition-colors"
          aria-label="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Workspace Dropdown */}
        <div className="relative">
          <button
            onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
            className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-[#F5F7F7] transition-all cursor-pointer group text-left"
          >
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[#F45B0B]">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-[#142337] flex items-center gap-1.5">
                {selectedWorkspace}
                <ChevronDown className={`w-3.5 h-3.5 text-[#64748B] transition-transform duration-200 ${workspaceMenuOpen ? 'rotate-180' : ''}`} />
              </div>
              <p className="text-xs text-[#64748B] font-medium">E-commerce Analytics</p>
            </div>
          </button>

          {workspaceMenuOpen && (
            <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-[#E4EAEA] rounded-xl shadow-lg p-2 z-50 animate-in fade-in zoom-in-95">
              {workspaces.map((ws) => (
                <button
                  key={ws.name}
                  onClick={() => {
                    setSelectedWorkspace(ws.name);
                    setWorkspaceMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs hover:bg-[#F5F7F7] transition-colors text-left"
                >
                  <div>
                    <p className="font-semibold text-[#142337]">{ws.name}</p>
                    <p className="text-[10px] text-[#64748B]">{ws.subtitle}</p>
                  </div>
                  {ws.name === selectedWorkspace && <Check className="w-4 h-4 text-[#F45B0B]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Status Badges & User Profile */}
      <div className="flex items-center gap-3 sm:gap-5">
        {/* API Mode Toggle Button */}
        <button
          onClick={toggleApiMode}
          title={`Click to switch to ${isLive ? 'Mock' : 'Live'} Mode`}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer border ${
            isLive 
              ? (isOnline ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100')
              : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
          }`}
        >
          <Server className="w-3 h-3" />
          <span>{isLive ? (isOnline ? 'LIVE MODE (FastAPI)' : 'LIVE MODE (Offline)') : 'MOCK MODE'}</span>
          <span className={`w-2 h-2 rounded-full ${isLive ? (isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500') : 'bg-amber-500'}`} />
        </button>

        {/* Database Status */}
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#F45B0B]">
            <Database className="w-4 h-4" />
          </div>
          <div className="text-left text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#142337]">{dbEngine}</span>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#16A36A]' : 'bg-gray-400'}`} />
            </div>
            <p className="text-[10px] text-[#64748B]">
              {isOnline ? 'Connected' : (isLive ? 'Unreachable' : 'Simulated')}
            </p>
          </div>
        </div>

        {/* Memory Engine Status */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#F45B0B]">
            <Cloud className="w-4 h-4" />
          </div>
          <div className="text-left text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#142337]">Memory</span>
            </div>
            <p className={`text-[10px] font-semibold flex items-center gap-1 ${
              health?.hindsightConfigured ? 'text-[#16A36A]' : 'text-amber-700'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${health?.hindsightConfigured ? 'bg-[#16A36A]' : 'bg-amber-500'}`} />
              {health?.hindsightConfigured ? 'Cloud Active' : (isOnline ? 'Local Fallback' : 'Simulated')}
            </p>
          </div>
        </div>

        {/* Groq LLM Status */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[#F45B0B]">
            <Zap className="w-4 h-4 fill-[#F45B0B]" />
          </div>
          <div className="text-left text-xs">
            <div className="flex items-center gap-1">
              <span className="font-bold text-[#142337]">Groq LLM</span>
            </div>
            <p className="text-[10px] text-[#64748B] font-mono">
              {health?.primaryModel || systemStatus.groq.model}
            </p>
          </div>
        </div>

        {/* Notification Bell */}
        <button
          onClick={onOpenNotifications}
          className="relative p-2 rounded-xl text-[#142337] hover:bg-[#F5F7F7] transition-colors cursor-pointer"
          aria-label="View notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#F45B0B] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>

        {/* User Profile Avatar */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-[#F45B0B] flex items-center justify-center text-xs font-bold text-white shadow-sm cursor-pointer hover:opacity-95 transition-opacity">
            GP
          </div>
        </div>
      </div>
    </header>
  );
};
