import React, { useState } from 'react';
import { 
  History, 
  CheckCircle2, 
  User, 
  FileCode, 
  Filter,
  Search,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertOctagon
} from 'lucide-react';
import { mockLearningEvents } from '../data/mockLearning';
import { LearningEvent, VerificationStatus } from '../types';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';

export const LearningHistory: React.FC = () => {
  const [activeFilter, setActiveFilter] = useState<'all' | VerificationStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<LearningEvent | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>('lrn-001');

  const filteredEvents = mockLearningEvents.filter((ev) => {
    const matchesFilter = activeFilter === 'all' || ev.verificationStatus === activeFilter;
    const matchesSearch = 
      ev.originalQuery.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.resultingBusinessRule.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.employeeExplanation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ev.author.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getVerificationBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified':
        return <Badge variant="emerald" dot>Verified</Badge>;
      case 'pending':
        return <Badge variant="amber" dot>Pending Review</Badge>;
      case 'superseded':
        return <Badge variant="slate" dot>Superseded</Badge>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4EAEA] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#142337] tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-[#F45B0B]" />
            <span>Learning History & Human Feedback</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Audit trail of how employee corrections and SQL error recoveries became verified institutional knowledge.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#F45B0B] font-bold px-3 py-1 rounded-full bg-[#FEECE3] border border-[#FCD2C0]">
            {mockLearningEvents.length} Total Learned Events
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-white border border-[#E4EAEA] shadow-2xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-[#64748B] flex items-center gap-1 pl-1 font-bold">
            <Filter className="w-3.5 h-3.5 text-[#F45B0B]" />
            <span>Filter:</span>
          </span>
          {(['all', 'verified', 'pending', 'superseded'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition-colors uppercase tracking-wider cursor-pointer ${
                activeFilter === f
                  ? 'bg-[#F45B0B] text-white shadow-xs'
                  : 'bg-[#F5F7F7] text-[#142337] hover:bg-[#EAF3F3]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search queries, rules, or authors..."
            className="w-full bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] placeholder-[#94A3B8] pl-9 pr-3 py-2 rounded-xl focus:outline-none focus:border-[#F45B0B] font-medium"
          />
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.map((ev) => {
          const isExpanded = expandedEventId === ev.id;
          return (
            <div
              key={ev.id}
              className="rounded-2xl bg-white border border-[#E4EAEA] shadow-xs overflow-hidden transition-all duration-200"
            >
              {/* Event Summary Bar */}
              <div
                onClick={() => setExpandedEventId(isExpanded ? null : ev.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-[#F5F7F7] transition-colors"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-[#FEECE3] border border-[#FCD2C0] text-[#F45B0B] shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getVerificationBadge(ev.verificationStatus)}
                      <span className="text-[11px] text-[#64748B] font-mono">{ev.timestamp}</span>
                      <span className="text-[11px] text-[#CBD5E1]">•</span>
                      <span className="text-[11px] text-[#F45B0B] font-semibold">Affects {ev.tableAffected}</span>
                    </div>
                    <h3 className="text-sm font-bold text-[#142337] tracking-tight">
                      &quot;{ev.originalQuery}&quot;
                    </h3>
                    <p className="text-xs text-[#64748B] mt-1 line-clamp-1">
                      {ev.resultingBusinessRule}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
                  <div className="text-left md:text-right">
                    <p className="text-xs font-bold text-[#142337]">{ev.author.name}</p>
                    <p className="text-[10px] text-[#64748B]">{ev.author.role}</p>
                  </div>
                  <div className="p-1 rounded-lg bg-[#F5F7F7] text-[#64748B]">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 border-t border-[#E4EAEA] bg-[#F5F7F7]/60 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
                    {/* The Mistake */}
                    <div className="p-4 rounded-xl bg-white border border-[#FECDD3] space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-[#E5484D] font-bold uppercase text-[10px] tracking-wider">
                        <AlertOctagon className="w-3.5 h-3.5" />
                        <span>Previous Model Mistake or Ambiguity</span>
                      </div>
                      <p className="text-[#142337] leading-relaxed font-normal">
                        {ev.mistakeOrCorrection}
                      </p>
                    </div>

                    {/* Employee Explanation */}
                    <div className="p-4 rounded-xl bg-white border border-[#A8C9C8] space-y-1.5 shadow-2xs">
                      <div className="flex items-center gap-2 text-[#1E5755] font-bold uppercase text-[10px] tracking-wider">
                        <User className="w-3.5 h-3.5" />
                        <span>Employee Explanation & Corporate Policy</span>
                      </div>
                      <p className="text-[#142337] leading-relaxed font-normal">
                        {ev.employeeExplanation}
                      </p>
                    </div>
                  </div>

                  {/* Learned Business Rule Statement */}
                  <div className="p-4 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1">
                    <div className="flex items-center gap-2 text-[#16A36A] font-bold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Retained Hindsight Business Rule</span>
                    </div>
                    <p className="text-xs text-[#142337] font-semibold leading-relaxed">
                      {ev.resultingBusinessRule}
                    </p>
                  </div>

                  {/* Corrected SQL */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-[#64748B] font-mono">
                      <span className="flex items-center gap-1.5 font-bold text-[#142337]">
                        <FileCode className="w-3.5 h-3.5 text-[#F45B0B]" />
                        <span>Learned SQL Template:</span>
                      </span>
                      <button
                        onClick={() => setSelectedEvent(ev)}
                        className="text-[#F45B0B] hover:text-[#DE4E04] text-xs font-bold cursor-pointer"
                      >
                        Open Full SQL Viewer →
                      </button>
                    </div>
                    <pre className="p-4 rounded-xl bg-white border border-[#E4EAEA] text-[#142337] font-mono text-xs overflow-x-auto leading-relaxed shadow-2xs">
                      {ev.correctedSql}
                    </pre>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-[#64748B] font-bold uppercase">Tags:</span>
                    {ev.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] bg-white text-[#142337] px-2.5 py-0.5 rounded-md border border-[#E4EAEA] font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* SQL Modal */}
      {selectedEvent && (
        <Modal
          isOpen={!!selectedEvent}
          onClose={() => setSelectedEvent(null)}
          title={`Corrected SQL for: "${selectedEvent.originalQuery}"`}
          subtitle={`Verified by ${selectedEvent.author.name} (${selectedEvent.author.role})`}
          maxWidth="2xl"
        >
          <div className="space-y-3">
            <pre className="p-4 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-[#142337] font-mono text-xs overflow-x-auto leading-relaxed">
              {selectedEvent.correctedSql}
            </pre>
            <div className="p-3 rounded-xl bg-[#EAF3F3] border border-[#A8C9C8] text-xs text-[#1E5755]">
              <span className="font-bold">Permanent Memory Status:</span> Verified and synced to Hindsight Cloud. Any employee asking this query or semantic variants receives this exact audited structure.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
