import React from 'react';
import { Database, Link, ArrowRight, Table } from 'lucide-react';
import { DatabaseRelationship } from '../../data/mockDatabase';

interface SchemaDiagramProps {
  relationships: DatabaseRelationship[];
  onSelectTable: (tableName: string) => void;
  selectedTable: string;
}

export const SchemaDiagram: React.FC<SchemaDiagramProps> = ({
  relationships,
  onSelectTable,
  selectedTable,
}) => {
  const nodes = [
    { name: 'customers', label: 'customers', count: '24.5k rows' },
    { name: 'customer_segments', label: 'customer_segments', count: '4 rows' },
    { name: 'orders', label: 'orders', count: '182.4k rows' },
    { name: 'order_items', label: 'order_items', count: '495k rows' },
    { name: 'products', label: 'products', count: '3.8k rows' },
    { name: 'payments', label: 'payments', count: '191k rows' },
    { name: 'refunds', label: 'refunds', count: '8.7k rows' },
  ];

  return (
    <div className="rounded-2xl bg-white border border-[#E4EAEA] p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E4EAEA] pb-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#F45B0B]" />
          <h3 className="text-xs font-bold text-[#142337] tracking-tight">Interactive Relational Schema Model</h3>
        </div>
        <span className="text-[11px] text-[#64748B]">Click any entity to inspect columns and sample rows</span>
      </div>

      {/* Nodes visual cluster */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 py-2">
        {nodes.map((node) => {
          const isSelected = selectedTable.toLowerCase() === node.name.toLowerCase();
          return (
            <button
              key={node.name}
              onClick={() => onSelectTable(node.name)}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                isSelected
                  ? 'bg-[#FEECE3] border-[#F45B0B] text-[#F45B0B] shadow-xs'
                  : 'bg-[#EAF3F3] hover:bg-[#DCEDED] border-[#A8C9C8] text-[#142337]'
              }`}
            >
              <div className="flex items-center gap-2">
                <Table className={`w-3.5 h-3.5 ${isSelected ? 'text-[#F45B0B]' : 'text-[#1E5755]'}`} />
                <span className={`text-xs font-bold ${isSelected ? 'text-[#F45B0B]' : 'text-[#142337]'}`}>
                  {node.label}
                </span>
              </div>
              <p className={`text-[10px] font-mono mt-1 ${isSelected ? 'text-[#F45B0B]/80 font-bold' : 'text-[#64748B]'}`}>
                {node.count}
              </p>
            </button>
          );
        })}
      </div>

      {/* Active Foreign Key Relationship Lines */}
      <div className="pt-2 border-t border-[#E4EAEA]">
        <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <Link className="w-3.5 h-3.5 text-[#F45B0B]" />
          <span>Foreign Key Relationships</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {relationships.map((rel, idx) => {
            const isRelevant = 
              rel.fromTable === selectedTable || rel.toTable === selectedTable;
            return (
              <div
                key={idx}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between transition-colors ${
                  isRelevant
                    ? 'bg-[#FEECE3] border-[#FCD2C0] text-[#142337]'
                    : 'bg-[#F5F7F7] border-[#E4EAEA] text-[#64748B]'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                  <span className="font-bold text-[#142337]">{rel.fromTable}</span>
                  <span className="text-[#94A3B8]">.{rel.fromColumn}</span>
                  <ArrowRight className="w-3 h-3 text-[#F45B0B]" />
                  <span className="font-bold text-[#142337]">{rel.toTable}</span>
                </div>
                <span className="text-[9px] font-bold uppercase bg-white border border-[#E4EAEA] px-1.5 py-0.5 rounded text-[#64748B]">
                  {rel.relationship}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
