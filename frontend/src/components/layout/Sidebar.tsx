import React from 'react';
import { 
  Home, 
  Code2, 
  Database, 
  BrainCircuit, 
  Clock, 
  Columns2, 
  Settings, 
  Layers
} from 'lucide-react';
import { PageView } from '../../types';

interface SidebarProps {
  currentPage: PageView;
  onNavigate: (page: PageView) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems: { id: PageView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Home className="w-4 h-4" /> },
    { id: 'query-studio', label: 'Query Studio', icon: <Code2 className="w-4 h-4" /> },
    { id: 'database-explorer', label: 'Database Explorer', icon: <Database className="w-4 h-4" /> },
    { id: 'memory-inspector', label: 'Memory Inspector', icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 'learning-history', label: 'Learning History', icon: <Clock className="w-4 h-4" /> },
    { id: 'comparison-view', label: 'Comparison View', icon: <Columns2 className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div 
          className="fixed inset-0 bg-[#142337]/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-[#A8C9C8] border-r border-[#96BCBB] flex flex-col justify-between transition-transform duration-300 lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div>
          <div className="h-20 px-6 flex items-center gap-3 border-b border-[#96BCBB]/50">
            {/* Orange Stacked Database Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="12" cy="6" rx="8" ry="2.5" fill="#F45B0B" />
                <path d="M4 6V10C4 11.38 7.58 12.5 12 12.5C16.42 12.5 20 11.38 20 10V6" stroke="#F45B0B" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 11V15C4 16.38 7.58 17.5 12 17.5C16.42 17.5 20 16.38 20 15V11" stroke="#F45B0B" strokeWidth="2" strokeLinecap="round" />
                <path d="M4 16V19C4 20.38 7.58 21.5 12 21.5C16.42 21.5 20 20.38 20 19V16" stroke="#F45B0B" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-[#142337] text-lg tracking-tight">TribalSQL</span>
              </div>
              <p className="text-[11px] text-[#142337]/70 font-medium">Database Intelligence Platform</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#F45B0B] text-white shadow-sm'
                      : 'text-[#142337] hover:bg-white/40'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-[#142337]'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Hindsight Cloud Card */}
        <div className="p-4">
          <div className="relative overflow-hidden p-4 rounded-2xl bg-white shadow-sm border border-white">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-7 h-7 rounded-lg bg-[#FEECE3] flex items-center justify-center text-[#F45B0B]">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#142337] flex items-center gap-1.5">
                  <span>Hindsight Cloud</span>
                  <span className="inline-flex items-center gap-1 text-[10px] text-[#16A36A] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A36A]" />
                    Active
                  </span>
                </h4>
              </div>
            </div>
            <p className="text-[11px] text-[#64748B] leading-relaxed relative z-10 pr-6">
              Persistent memory for institutional learning
            </p>

            {/* Decorative Orange Wave / Corner Accent */}
            <div 
              className="absolute -bottom-5 -right-5 w-16 h-16 rounded-full bg-[#F45B0B] opacity-90 pointer-events-none"
            />
          </div>
        </div>
      </aside>
    </>
  );
};
