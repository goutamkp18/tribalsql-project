import React, { useState } from 'react';
import { 
  Database, 
  Key, 
  Link, 
  Table, 
  FileSpreadsheet, 
  Search, 
  Layers,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert
} from 'lucide-react';
import { mockTables, mockDatabaseRelationships } from '../data/mockDatabase';
import { SchemaDiagram } from '../components/database/SchemaDiagram';
import { Badge } from '../components/common/Badge';
import { getApiMode } from '../services/api';

export const DatabaseExplorer: React.FC = () => {
  const [selectedTableName, setSelectedTableName] = useState<string>('orders');
  const [activeTab, setActiveTab] = useState<'columns' | 'sample'>('columns');
  const [tableFilter, setTableFilter] = useState<'all' | 'live' | 'expanded'>('all');
  const [columnSearch, setColumnSearch] = useState('');

  const displayedTables = mockTables.filter((t) => {
    if (tableFilter === 'live') return t.isLiveDatabaseTable;
    if (tableFilter === 'expanded') return !t.isLiveDatabaseTable;
    return true;
  });

  const currentTable = mockTables.find(
    (t) => t.name.toLowerCase() === selectedTableName.toLowerCase()
  ) || mockTables[0];

  const filteredColumns = currentTable.columns.filter((c) =>
    c.name.toLowerCase().includes(columnSearch.toLowerCase()) ||
    c.type.toLowerCase().includes(columnSearch.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(columnSearch.toLowerCase()))
  );

  const relatedForeignKeys = mockDatabaseRelationships.filter(
    (r) => r.fromTable === currentTable.name || r.toTable === currentTable.name
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E4EAEA] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#142337] tracking-tight flex items-center gap-2">
            <Database className="w-6 h-6 text-[#F45B0B]" />
            <span>Database Explorer</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#64748B] mt-1 font-normal">
            Inspect live Supabase PostgreSQL schema, relational constraints, and catalog models.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={getApiMode() === 'live' ? 'emerald' : 'powder'} dot>
            {getApiMode() === 'live' ? 'Supabase PostgreSQL (Live)' : 'PostgreSQL 16 Demo'}
          </Badge>
          <div className="hidden sm:flex items-center gap-1 text-xs font-mono text-[#64748B] bg-white px-2.5 py-1 rounded-full border border-[#E4EAEA]">
            <span>DB:</span>
            <span className="font-bold text-[#142337]">postgres.public</span>
          </div>
        </div>
      </div>

      {/* Relational Schema Overview Panel */}
      <SchemaDiagram
        relationships={mockDatabaseRelationships}
        onSelectTable={setSelectedTableName}
        selectedTable={selectedTableName}
      />

      {/* Main Split View: Left Tables List, Right Table Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Table Selector Column */}
        <div className="lg:col-span-4 space-y-3">
          {/* Table Category Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#F5F7F7] rounded-xl border border-[#E4EAEA] text-[11px] font-bold">
            <button
              onClick={() => setTableFilter('all')}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                tableFilter === 'all' ? 'bg-white text-[#142337] shadow-2xs font-black' : 'text-[#64748B] hover:text-[#142337]'
              }`}
            >
              All ({mockTables.length})
            </button>
            <button
              onClick={() => setTableFilter('live')}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                tableFilter === 'live' ? 'bg-[#ECFDF5] text-[#16A36A] shadow-2xs font-black border border-[#A7F3D0]' : 'text-[#64748B] hover:text-[#142337]'
              }`}
            >
              ⚡ Live DB (4)
            </button>
            <button
              onClick={() => setTableFilter('expanded')}
              className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer text-center ${
                tableFilter === 'expanded' ? 'bg-white text-[#142337] shadow-2xs font-black' : 'text-[#64748B] hover:text-[#142337]'
              }`}
            >
              Catalog (4)
            </button>
          </div>

          <div className="space-y-2">
            {displayedTables.map((t) => {
              const isSelected = t.name === currentTable.name;
              return (
                <button
                  key={t.name}
                  onClick={() => setSelectedTableName(t.name)}
                  className={`w-full p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                    isSelected
                      ? 'bg-white border-[#F45B0B] shadow-xs ring-1 ring-[#F45B0B]/30'
                      : 'bg-white hover:bg-[#F5F7F7] border-[#E4EAEA]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      t.isDeprecatedTrap 
                        ? 'bg-[#FEF2F2] text-[#E5484D]' 
                        : isSelected 
                        ? 'bg-[#FEECE3] text-[#F45B0B]' 
                        : 'bg-[#EAF3F3] text-[#1E5755]'
                    }`}>
                      {t.isDeprecatedTrap ? <AlertTriangle className="w-4 h-4" /> : <Table className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-xs font-bold ${
                          t.isDeprecatedTrap ? 'text-[#E5484D]' : isSelected ? 'text-[#F45B0B]' : 'text-[#142337]'
                        }`}>
                          {t.name}
                        </p>
                        {t.isLiveDatabaseTable ? (
                          <span className="text-[9px] font-bold bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0] px-1.5 py-0.2 rounded">
                            {t.isDeprecatedTrap ? 'TRAP' : 'LIVE'}
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold bg-[#F5F7F7] text-[#64748B] border border-[#E4EAEA] px-1.5 py-0.2 rounded">
                            SPEC
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-mono font-bold text-[#142337]">
                      {t.rowCount.toLocaleString()}
                    </p>
                    <p className="text-[9px] text-[#94A3B8] font-mono">{t.sizeBytes}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Table Inspection Column */}
        <div className="lg:col-span-8 space-y-4">
          {/* Deprecated Schema Trap Alert Banner */}
          {currentTable.isDeprecatedTrap && (
            <div className="p-4 rounded-2xl bg-[#FEF2F2] border-2 border-[#FECDD3] text-xs text-[#E5484D] space-y-2 shadow-xs">
              <div className="flex items-center gap-2 font-bold text-sm">
                <ShieldAlert className="w-5 h-5 text-[#E5484D]" />
                <span>Schema Trap Table: orders_legacy (Ceased 2024)</span>
              </div>
              <p className="leading-relaxed">
                This table exists in the live database as a historic artifact. Naive LLMs that read the database schema without institutional memory frequently query this table, hallucinating stale figures. 
                <strong> TribalSQL&apos;s Hindsight memory intercepts this query and enforces routing to the active &apos;orders&apos; table.</strong>
              </p>
            </div>
          )}

          <div className="rounded-2xl bg-white border border-[#E4EAEA] shadow-xs overflow-hidden">
            {/* Table Header Details */}
            <div className="p-5 border-b border-[#E4EAEA] bg-[#F5F7F7] flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-[#142337] font-mono">{currentTable.name}</h2>
                  <span className="text-[10px] bg-white text-[#64748B] border border-[#E4EAEA] px-2 py-0.5 rounded font-mono font-bold">
                    {currentTable.columns.length} columns
                  </span>
                  {currentTable.isLiveDatabaseTable && (
                    <span className="text-[10px] bg-[#ECFDF5] text-[#16A36A] border border-[#A7F3D0] px-2 py-0.5 rounded font-bold">
                      ⚡ Supabase PostgreSQL Live
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] mt-1">{currentTable.description}</p>
              </div>

              {/* Tab Switcher */}
              <div className="flex items-center bg-white p-1 rounded-xl border border-[#E4EAEA]">
                <button
                  onClick={() => setActiveTab('columns')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'columns'
                      ? 'bg-[#F45B0B] text-white shadow-2xs'
                      : 'text-[#64748B] hover:text-[#142337]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Columns & Schema</span>
                </button>
                <button
                  onClick={() => setActiveTab('sample')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    activeTab === 'sample'
                      ? 'bg-[#F45B0B] text-white shadow-2xs'
                      : 'text-[#64748B] hover:text-[#142337]'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Sample Data ({currentTable.sampleRows.length})</span>
                </button>
              </div>
            </div>

            {/* TAB 1: Columns & Schema */}
            {activeTab === 'columns' && (
              <div>
                {/* Search columns input */}
                <div className="p-3 bg-white border-b border-[#E4EAEA] flex items-center gap-2">
                  <Search className="w-4 h-4 text-[#94A3B8] ml-2" />
                  <input
                    type="text"
                    value={columnSearch}
                    onChange={(e) => setColumnSearch(e.target.value)}
                    placeholder="Search columns or data types..."
                    className="w-full bg-transparent text-xs text-[#142337] placeholder-[#94A3B8] focus:outline-none font-medium"
                  />
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#F5F7F7] border-b border-[#E4EAEA] text-[#64748B] font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-2.5 px-4">Column</th>
                        <th className="py-2.5 px-4">Data Type</th>
                        <th className="py-2.5 px-4">Key / Constraint</th>
                        <th className="py-2.5 px-4">Nullable</th>
                        <th className="py-2.5 px-4">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E4EAEA] font-mono text-[#142337]">
                      {filteredColumns.map((col) => (
                        <tr key={col.name} className="hover:bg-[#F5F7F7]">
                          <td className="py-3 px-4 font-bold text-[#142337]">{col.name}</td>
                          <td className="py-3 px-4 text-[#F45B0B] font-semibold">{col.type}</td>
                          <td className="py-3 px-4">
                            {col.isPrimaryKey ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#F45B0B] bg-[#FEECE3] border border-[#FCD2C0] px-2 py-0.5 rounded">
                                <Key className="w-3 h-3" />
                                <span>PRIMARY KEY</span>
                              </span>
                            ) : col.isForeignKey ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#1E5755] bg-[#EAF3F3] border border-[#A8C9C8] px-2 py-0.5 rounded">
                                <Link className="w-3 h-3" />
                                <span>FK → {col.references?.table}</span>
                              </span>
                            ) : (
                              <span className="text-[#94A3B8] text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-[11px] font-sans">
                            {col.nullable ? (
                              <span className="text-[#64748B]">YES</span>
                            ) : (
                              <span className="text-[#E5484D] font-bold">NOT NULL</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-sans text-[#64748B] text-[11px]">
                            {col.description || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: Sample Rows */}
            {activeTab === 'sample' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-mono">
                  <thead>
                    <tr className="bg-[#F5F7F7] border-b border-[#E4EAEA] text-[#64748B] uppercase text-[10px] tracking-wider font-bold">
                      {currentTable.columns.map((c) => (
                        <th key={c.name} className="py-2.5 px-4 whitespace-nowrap">
                          {c.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4EAEA] text-[#142337]">
                    {currentTable.sampleRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#F5F7F7]">
                        {currentTable.columns.map((c) => (
                          <td key={c.name} className="py-3 px-4 whitespace-nowrap">
                            {typeof row[c.name] === 'number'
                              ? row[c.name].toLocaleString()
                              : String(row[c.name] ?? 'null')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Relational Foreign Key Summary Box */}
          {relatedForeignKeys.length > 0 && (
            <div className="p-4 rounded-2xl bg-white border border-[#E4EAEA] space-y-2">
              <h4 className="text-xs font-bold text-[#142337] flex items-center gap-1.5">
                <Link className="w-3.5 h-3.5 text-[#F45B0B]" />
                <span>Relationship Constraints for {currentTable.name}</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {relatedForeignKeys.map((rf, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs flex items-center gap-2"
                  >
                    <span className="font-mono text-[#F45B0B] font-bold">{rf.fromTable}.{rf.fromColumn}</span>
                    <ArrowRight className="w-3 h-3 text-[#94A3B8]" />
                    <span className="font-mono text-[#1E5755] font-bold">{rf.toTable}.{rf.toColumn}</span>
                    <span className="text-[10px] bg-white border border-[#E4EAEA] px-1.5 py-0.2 rounded text-[#64748B] font-bold">
                      {rf.relationship}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
