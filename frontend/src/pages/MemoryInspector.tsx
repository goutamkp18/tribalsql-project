import React, { useState, useEffect } from 'react';
import { 
  BrainCircuit, 
  Search, 
  Plus, 
  Clock, 
  Layers, 
  Flame, 
  Network,
  CheckCircle2,
  Filter,
  Sparkles,
  RotateCw,
  Database,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  mockRetainedMemories, 
  mockRecalledMemories, 
  mockReflectedKnowledge, 
  mockMentalModels, 
  mockMemoryTimeline 
} from '../data/mockMemories';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import { retainMemory, getRetainedMemories, recallMemory, reflectMemory } from '../services/memoryService';
import { useToast } from '../components/common/ToastContext';
import { MemoryType, RetainedMemory, RecalledMemory, ReflectedKnowledge } from '../types';
import { getApiMode } from '../services/api';

export const MemoryInspector: React.FC = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'retain' | 'recall' | 'reflect' | 'models'>('retain');
  
  // Retained state
  const [retainedList, setRetainedList] = useState<RetainedMemory[]>(mockRetainedMemories);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<RetainedMemory | null>(null);
  const [isRetainLoading, setIsRetainLoading] = useState<boolean>(false);

  // Recall state
  const [recallSearchQuery, setRecallSearchQuery] = useState<string>('Calculate net revenue from premium customers.');
  const [recalledList, setRecalledList] = useState<RecalledMemory[]>(mockRecalledMemories);
  const [isRecalling, setIsRecalling] = useState<boolean>(false);
  const [recallSource, setRecallSource] = useState<string>('mock');

  // Reflect state
  const [reflectedList, setReflectedList] = useState<ReflectedKnowledge[]>(mockReflectedKnowledge);
  const [isReflecting, setIsReflecting] = useState<boolean>(false);
  const [reflectSource, setReflectSource] = useState<string>('mock');

  // New Memory Form State
  const [newTitle, setNewTitle] = useState('');
  const [newRule, setNewRule] = useState('');
  const [newType, setNewType] = useState<MemoryType>('business_rule');
  const [newCategory, setNewCategory] = useState('Finance');
  const [isSaving, setIsSaving] = useState(false);

  // Load live retained memories on mount
  useEffect(() => {
    const fetchRetained = async () => {
      setIsRetainLoading(true);
      try {
        const res = await getRetainedMemories();
        if (res.source === 'fastapi' && res.data && res.data.length > 0) {
          // Merge live backend memories at the top
          const existingIds = new Set(res.data.map(m => m.id));
          const nonDupMocks = mockRetainedMemories.filter(m => !existingIds.has(m.id));
          setRetainedList([...res.data, ...nonDupMocks]);
        }
      } catch (e) {
        console.warn('Could not load live retained memories', e);
      } finally {
        setIsRetainLoading(false);
      }
    };
    fetchRetained();
  }, []);

  // Handler for live recall search against Hindsight Cloud
  const handlePerformRecall = async (q: string) => {
    if (!q.trim()) return;
    setIsRecalling(true);
    try {
      const res = await recallMemory(q.trim());
      setRecalledList(res.data);
      setRecallSource(res.source);
      showToast(
        res.source === 'fastapi' ? 'Recalled from Hindsight Cloud' : 'Simulated Semantic Recall',
        `Retrieved ${res.data.length} relevant items from bank "novamart-prod-db".`,
        'success'
      );
    } catch (err: any) {
      showToast('Recall Error', err?.message || 'Could not recall memories', 'error');
    } finally {
      setIsRecalling(false);
    }
  };

  // Handler for live reflection synthesis
  const handlePerformReflect = async () => {
    setIsReflecting(true);
    try {
      const res = await reflectMemory(recallSearchQuery);
      setReflectedList(res.data);
      setReflectSource(res.source);
      showToast(
        res.source === 'fastapi' ? 'Synthesized by Hindsight Cloud' : 'Curated Playbook Reflected',
        `Synthesized organizational truth across historical analyst interactions.`,
        'success'
      );
    } catch (err: any) {
      showToast('Reflect Error', err?.message || 'Could not run reflection engine', 'error');
    } finally {
      setIsReflecting(false);
    }
  };

  const filteredRetained = retainedList.filter((m) => {
    const matchesFilter = selectedTypeFilter === 'all' || m.type === selectedTypeFilter;
    const matchesSearch = 
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.ruleText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.categoryTag.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRule.trim() || !newTitle.trim()) return;

    setIsSaving(true);
    try {
      const res = await retainMemory({
        title: newTitle.trim(),
        type: newType,
        ruleText: newRule.trim(),
        description: 'Manual memory injection via Hindsight Memory Inspector.',
        author: 'Human Data Analyst',
        categoryTag: newCategory,
      });

      setRetainedList([res.data, ...retainedList]);
      showToast('Memory Successfully Retained!', 'Persisted into Hindsight Cloud bank novamart-prod-db.', 'success');
      setNewTitle('');
      setNewRule('');
      setIsAddModalOpen(false);
    } catch (err: any) {
      showToast('Failed to retain memory', err?.message || 'Please check connection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const getTypeBadge = (type: MemoryType) => {
    switch (type) {
      case 'business_rule':
        return <Badge variant="orange" dot>Business Rule</Badge>;
      case 'human_correction':
        return <Badge variant="powder" dot>Human Correction</Badge>;
      case 'deprecated_table':
        return <Badge variant="rose" dot>Deprecated Table</Badge>;
      case 'sql_error_fix':
        return <Badge variant="amber" dot>SQL Error Fix</Badge>;
      case 'successful_query':
        return <Badge variant="emerald" dot>Success Pattern</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAEA] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#FEECE3] border border-[#FCD2C0] flex items-center justify-center text-[#F45B0B]">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-[#142337] tracking-tight">
              Hindsight Memory Inspector
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Deep observability into TribalSQL&apos;s institutional memory engine (Retain, Recall, Reflect, Mental Models).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getApiMode() === 'live' ? 'emerald' : 'orange'} dot>
            {getApiMode() === 'live' ? 'Bank: novamart-prod-db' : 'Demo Memory'}
          </Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Retain New Memory
          </Button>
        </div>
      </div>

      {/* Memory Engine Architecture Cards: Powder Blue / Orange Identity */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <button
          onClick={() => setActiveTab('retain')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'retain'
              ? 'bg-[#FEECE3] border-[#F45B0B] text-[#F45B0B] shadow-xs'
              : 'bg-white hover:bg-[#F5F7F7] border-[#E4EAEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">1. RETAIN</span>
            <Layers className="w-4 h-4 text-[#F45B0B]" />
          </div>
          <p className="text-2xl font-black text-[#142337] mt-1">{retainedList.length}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Rules & corrections stored</p>
        </button>

        <button
          onClick={() => setActiveTab('recall')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'recall'
              ? 'bg-[#FEECE3] border-[#F45B0B] text-[#F45B0B] shadow-xs'
              : 'bg-white hover:bg-[#F5F7F7] border-[#E4EAEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">2. RECALL</span>
            <Search className="w-4 h-4 text-[#F45B0B]" />
          </div>
          <p className="text-2xl font-black text-[#142337] mt-1">{recalledList.length}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Active recalled items</p>
        </button>

        <button
          onClick={() => setActiveTab('reflect')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'reflect'
              ? 'bg-[#FEECE3] border-[#F45B0B] text-[#F45B0B] shadow-xs'
              : 'bg-white hover:bg-[#F5F7F7] border-[#E4EAEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">3. REFLECT</span>
            <Flame className="w-4 h-4 text-[#F45B0B]" />
          </div>
          <p className="text-2xl font-black text-[#142337] mt-1">{reflectedList.length}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Synthesized company facts</p>
        </button>

        <button
          onClick={() => setActiveTab('models')}
          className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
            activeTab === 'models'
              ? 'bg-[#FEECE3] border-[#F45B0B] text-[#F45B0B] shadow-xs'
              : 'bg-white hover:bg-[#F5F7F7] border-[#E4EAEA]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#64748B]">4. MENTAL MODELS</span>
            <Network className="w-4 h-4 text-[#F45B0B]" />
          </div>
          <p className="text-2xl font-black text-[#142337] mt-1">{mockMentalModels.length}</p>
          <p className="text-[10px] text-[#64748B] mt-0.5">Evolving domain logic</p>
        </button>
      </div>

      {/* TAB CONTENT 1: RETAIN */}
      {activeTab === 'retain' && (
        <div className="space-y-4">
          {/* Filters & Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#E4EAEA] shadow-2xs">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-xs text-[#64748B] flex items-center gap-1 pl-1 font-bold">
                <Filter className="w-3.5 h-3.5 text-[#F45B0B]" />
                <span>Filter:</span>
              </span>
              {[
                { id: 'all', label: 'All Types' },
                { id: 'business_rule', label: 'Business Rules' },
                { id: 'human_correction', label: 'Human Corrections' },
                { id: 'sql_error_fix', label: 'SQL Fixes' },
                { id: 'deprecated_table', label: 'Deprecated Schema' },
                { id: 'successful_query', label: 'Success Patterns' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedTypeFilter(f.id)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap cursor-pointer ${
                    selectedTypeFilter === f.id
                      ? 'bg-[#F45B0B] text-white shadow-xs'
                      : 'bg-[#F5F7F7] text-[#142337] hover:bg-[#EAF3F3]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search retained rules..."
                className="w-full bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] placeholder-[#94A3B8] pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-[#F45B0B] font-medium"
              />
            </div>
          </div>

          {/* Retained Memories Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRetained.map((mem) => (
              <div
                key={mem.id}
                onClick={() => setSelectedMemory(mem)}
                className="p-5 rounded-2xl bg-white border border-[#E4EAEA] hover:border-[#F45B0B] transition-all cursor-pointer shadow-xs group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider">
                          {mem.id} • {mem.categoryTag}
                        </span>
                        {mem.author === 'Human Analyst' && (
                          <span className="text-[9px] font-bold bg-[#EAF3F3] text-[#1E5755] border border-[#A8C9C8] px-1.5 py-0.2 rounded">
                            ⚡ Live Cloud
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-bold text-[#142337] group-hover:text-[#F45B0B] transition-colors mt-0.5">
                        {mem.title}
                      </h3>
                    </div>
                    {getTypeBadge(mem.type)}
                  </div>

                  <p className="text-xs text-[#142337] font-mono bg-[#F5F7F7] p-3 rounded-xl border border-[#E4EAEA] leading-relaxed mt-2.5 max-h-32 overflow-y-auto">
                    {mem.ruleText}
                  </p>

                  <p className="text-xs text-[#64748B] mt-2.5 line-clamp-2">
                    {mem.description}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#E4EAEA] flex items-center justify-between text-[11px] text-[#64748B]">
                  <div className="flex items-center gap-2">
                    <span className="text-[#16A36A] font-bold">✓ Verified</span>
                    <span>•</span>
                    <span>Applied {mem.timesApplied}x</span>
                  </div>
                  <span className="font-mono text-[#F45B0B] font-bold">Conf: {(mem.confidenceScore * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: RECALL */}
      {activeTab === 'recall' && (
        <div className="space-y-4">
          {/* Interactive Recall Query Bar */}
          <div className="p-4 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E4EAEA] pb-3">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-[#F45B0B]" />
                <h3 className="text-xs font-bold text-[#142337] uppercase tracking-wider">
                  Semantic Memory Recall Engine
                </h3>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Badge variant={recallSource === 'fastapi' ? 'emerald' : 'powder'} dot>
                  {recallSource === 'fastapi' ? 'Live Cloud: novamart-prod-db' : 'Semantic Simulator'}
                </Badge>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePerformRecall(recallSearchQuery);
              }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
            >
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={recallSearchQuery}
                  onChange={(e) => setRecallSearchQuery(e.target.value)}
                  placeholder="Enter a prompt to inspect semantic recall from Hindsight Cloud..."
                  className="w-full bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] placeholder-[#94A3B8] pl-9 pr-3 py-2.5 rounded-xl focus:outline-none focus:border-[#F45B0B] font-medium"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isRecalling}
                leftIcon={!isRecalling ? <Search className="w-3.5 h-3.5" /> : undefined}
                className="font-bold shrink-0"
              >
                {isRecalling ? 'Recalling...' : 'Inspect Live Recall'}
              </Button>
            </form>
          </div>

          <div className="space-y-3">
            {recalledList.map((recall, idx) => (
              <div
                key={recall.id || idx}
                className="p-5 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEA] pb-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold text-[#142337]">{recall.title}</span>
                    <span className="text-[10px] font-mono font-bold text-[#F45B0B] bg-[#FEECE3] border border-[#FCD2C0] px-2 py-0.5 rounded">
                      Score: {typeof recall.relevanceScore === 'number' ? recall.relevanceScore.toFixed(2) : recall.relevanceScore}
                    </span>
                    <span className="text-[10px] font-bold text-[#1E5755] bg-[#EAF3F3] border border-[#A8C9C8] px-2 py-0.5 rounded">
                      Rank #{idx + 1}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#64748B]">{recall.timestamp}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
                    <p className="text-[10px] text-[#64748B] uppercase font-bold">Trigger Query Context</p>
                    <p className="text-[#142337] font-semibold mt-1">&quot;{recall.queryText}&quot;</p>
                  </div>
                  <div className="p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
                    <p className="text-[10px] text-[#64748B] uppercase font-bold">Selection Rationale</p>
                    <p className="text-[#F45B0B] font-semibold mt-1">{recall.selectionReason}</p>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#EAF3F3] border border-[#A8C9C8] font-mono text-xs text-[#1E5755] max-h-36 overflow-y-auto">
                  <span className="text-[#64748B] select-none font-sans font-bold">Recalled Memory Content: </span>
                  {recall.appliedRule}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: REFLECT */}
      {activeTab === 'reflect' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#FEECE3] text-[#F45B0B]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#142337] uppercase tracking-wider">
                  Hindsight Reflect Synthesis Engine
                </h3>
                <p className="text-[11px] text-[#64748B]">
                  Synthesizes multi-query observations and human feedback into high-level organizational playbooks.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={handlePerformReflect}
              isLoading={isReflecting}
              leftIcon={!isReflecting ? <Sparkles className="w-3.5 h-3.5" /> : undefined}
              className="font-bold shrink-0"
            >
              {isReflecting ? 'Synthesizing...' : 'Run Live Reflection'}
            </Button>
          </div>

          <div className="space-y-4">
            {reflectedList.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-5 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEA] pb-2.5">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#142337]">{item.theme}</h3>
                    <span className="text-[10px] bg-[#FEECE3] text-[#F45B0B] border border-[#FCD2C0] px-2 py-0.5 rounded font-mono font-bold">
                      {(item.confidence * 100).toFixed(0)}% Confidence
                    </span>
                    {reflectSource === 'fastapi' && (
                      <span className="text-[9px] font-bold bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0] px-1.5 py-0.2 rounded">
                        ⚡ Live Hindsight Cloud
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-[#64748B]">Last reflected {item.lastReflected}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] leading-relaxed whitespace-pre-line font-medium">
                  {item.synthesizedFact}
                </div>

                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    Supporting Institutional Evidence
                  </p>
                  {item.supportingEvidence.map((ev, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-[#142337] bg-[#F5F7F7] p-2.5 rounded-lg border border-[#E4EAEA]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#16A36A] shrink-0" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>

                <div className="text-[11px] text-[#F45B0B] font-bold">
                  Scope of impact: <span className="text-[#64748B] font-normal">{item.impactScope}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: MENTAL MODELS */}
      {activeTab === 'models' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#EAF3F3] border border-[#A8C9C8] text-xs text-[#1E5755] flex items-center gap-2.5">
            <Network className="w-5 h-5 text-[#F45B0B] shrink-0" />
            <p className="font-medium">
              Mental models represent evolving corporate ontology. They group disparate rules into unified representations of company domains (GAAP revenue, customer hierarchy, churn).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {mockMentalModels.map((model) => (
              <div
                key={model.id}
                className="p-5 rounded-2xl bg-white border border-[#E4EAEA] shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] text-[#F45B0B] font-mono font-bold uppercase">
                        {model.domain}
                      </span>
                      <h3 className="text-sm font-bold text-[#142337] mt-0.5">{model.title}</h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0]">
                      {model.refreshStatus}
                    </span>
                  </div>

                  <p className="text-xs text-[#64748B] leading-relaxed mb-3">
                    {model.description}
                  </p>

                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase font-bold text-[#64748B]">Core Principles</p>
                    {model.corePrinciples.map((cp, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] flex items-start gap-2">
                        <span className="text-[#F45B0B] font-bold shrink-0">{idx + 1}.</span>
                        <span>{cp}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#E4EAEA] flex items-center justify-between text-[11px] text-[#64748B]">
                  <span>Synthesizes {model.rulesIncluded} rules</span>
                  <span>Updated {new Date(model.lastUpdatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Memory Evolution Timeline */}
      <div className="mt-8 rounded-2xl bg-white border border-[#E4EAEA] p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 border-b border-[#E4EAEA] pb-3">
          <Clock className="w-5 h-5 text-[#F45B0B]" />
          <div>
            <h3 className="text-sm font-bold text-[#142337]">NovaMart Institutional Memory Evolution Timeline</h3>
            <p className="text-xs text-[#64748B]">How knowledge accumulated and refined across employee query cycles</p>
          </div>
        </div>

        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E4EAEA]">
          {mockMemoryTimeline.map((item, idx) => (
            <div key={idx} className="relative">
              <span
                className="absolute -left-[19px] top-1 w-3 h-3 rounded-full border-2 border-white shadow-2xs"
                style={{ backgroundColor: idx % 2 === 0 ? '#F45B0B' : '#A8C9C8' }}
              />
              <div className="bg-[#F5F7F7] p-3.5 rounded-xl border border-[#E4EAEA]">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-[#142337]">{item.title}</h4>
                  <span className="text-[10px] text-[#64748B] font-mono">{item.date}</span>
                </div>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Retain New Memory Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Retain New Institutional Memory"
        subtitle="Directly inject corporate business rules, schema constraints, or calculation formulas into Hindsight."
        maxWidth="lg"
      >
        <form onSubmit={handleAddMemory} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#142337] mb-1">
              Memory Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g., Q4 Fiscal Year Offset Rule"
              required
              className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] focus:outline-none focus:border-[#F45B0B] font-medium"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#142337] mb-1">
                Memory Type
              </label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as MemoryType)}
                className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] focus:outline-none focus:border-[#F45B0B] font-medium"
              >
                <option value="business_rule">Business Rule</option>
                <option value="human_correction">Human Correction</option>
                <option value="sql_error_fix">SQL Error Fix</option>
                <option value="deprecated_table">Deprecated Schema</option>
                <option value="successful_query">Successful Query Pattern</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#142337] mb-1">
                Category
              </label>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Finance, Marketing, Logistics..."
                required
                className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] focus:outline-none focus:border-[#F45B0B] font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#142337] mb-1">
              Exact Rule Statement or SQL Guardrail
            </label>
            <textarea
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="Define the exact rule TribalSQL must obey when writing SQL queries..."
              rows={4}
              required
              className="w-full p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] focus:outline-none focus:border-[#F45B0B] font-medium"
            />
          </div>

          <div className="pt-2 border-t border-[#E4EAEA] flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setIsAddModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSaving}>
              Retain in Hindsight
            </Button>
          </div>
        </form>
      </Modal>

      {/* Single Memory Details Modal */}
      {selectedMemory && (
        <Modal
          isOpen={!!selectedMemory}
          onClose={() => setSelectedMemory(null)}
          title={selectedMemory.title}
          subtitle={`Hindsight ID: ${selectedMemory.id}`}
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between">
              {getTypeBadge(selectedMemory.type)}
              <span className="font-mono text-[#F45B0B] font-bold">
                Confidence: {(selectedMemory.confidenceScore * 100).toFixed(0)}%
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA]">
              <p className="text-[#64748B] text-[10px] uppercase font-bold">Rule Definition</p>
              <p className="text-[#142337] font-semibold mt-1 leading-relaxed">{selectedMemory.ruleText}</p>
            </div>

            <div>
              <p className="text-[#64748B] text-[10px] uppercase font-bold">Context</p>
              <p className="text-[#64748B] mt-1">{selectedMemory.description}</p>
            </div>

            <div className="pt-3 border-t border-[#E4EAEA] flex items-center justify-between text-[#64748B]">
              <span>Author: {selectedMemory.author}</span>
              <span>Applied {selectedMemory.timesApplied} times</span>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
