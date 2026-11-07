import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { BrainCircuit, Sparkles } from 'lucide-react';
import { retainMemory } from '../../services/memoryService';
import { useToast } from '../common/ToastContext';
import { RetainedMemory } from '../../types';

interface CorrectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  naturalQuery: string;
  currentSql: string;
  onCorrectionSaved?: (memory: RetainedMemory) => void;
}

export const CorrectionModal: React.FC<CorrectionModalProps> = ({
  isOpen,
  onClose,
  naturalQuery,
  currentSql,
  onCorrectionSaved,
}) => {
  const { showToast } = useToast();
  const [mistake, setMistake] = useState('');
  const [ruleText, setRuleText] = useState('');
  const [category, setCategory] = useState('Finance');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleText.trim()) return;

    setIsSaving(true);
    try {
      const res = await retainMemory({
        title: `Correction: ${naturalQuery.slice(0, 35)}...`,
        type: 'human_correction',
        ruleText: ruleText.trim(),
        description: mistake.trim() || 'Employee provided feedback to correct query formulation.',
        author: 'Current User / GP',
        categoryTag: category,
      });

      showToast(
        'Correction Retained in Hindsight Memory!',
        'TribalSQL will now apply this rule to all future matching queries.',
        'success'
      );

      setMistake('');
      setRuleText('');
      if (onCorrectionSaved) onCorrectionSaved(res.data);
      onClose();
    } catch (err) {
      showToast('Failed to retain memory', 'Please check connection', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Teach TribalSQL — Institutional Learning"
      subtitle="Every correction is stored in Hindsight persistent memory to make future queries smarter."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Context Prompt */}
        <div className="p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs">
          <p className="text-[#64748B] font-semibold">Original Query:</p>
          <p className="text-[#142337] font-bold mt-0.5">{naturalQuery}</p>
        </div>

        {/* What was wrong or needs adjustment */}
        <div>
          <label className="block text-xs font-bold text-[#142337] mb-1">
            What was wrong or missing with the query?
          </label>
          <textarea
            value={mistake}
            onChange={(e) => setMistake(e.target.value)}
            placeholder="e.g., The generated SQL did not subtract refunds or included cancelled transactions."
            rows={2}
            className="w-full p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] placeholder-[#94A3B8] focus:outline-none focus:border-[#F45B0B] font-medium"
          />
        </div>

        {/* Business Rule */}
        <div>
          <label className="block text-xs font-bold text-[#142337] mb-1">
            Business Rule for Hindsight Memory (What should TribalSQL remember?)
          </label>
          <textarea
            value={ruleText}
            onChange={(e) => setRuleText(e.target.value)}
            placeholder="e.g., Always calculate Net Revenue by subtracting refunds from gross amount and excluding CANCELLED orders."
            rows={3}
            required
            className="w-full p-3 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] placeholder-[#94A3B8] focus:outline-none focus:border-[#F45B0B] font-medium"
          />
        </div>

        {/* Category Tag */}
        <div>
          <label className="block text-xs font-bold text-[#142337] mb-1">
            Knowledge Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2.5 rounded-xl bg-[#F5F7F7] border border-[#E4EAEA] text-xs text-[#142337] focus:outline-none focus:border-[#F45B0B] font-medium"
          >
            <option value="Finance">Finance & Revenue Policy</option>
            <option value="Customer Segments">Customer Segmentation & VIP Definitions</option>
            <option value="Product Ops">Product Ops & Inventory Risk</option>
            <option value="SQL Safety">SQL Safety & Performance</option>
            <option value="Schema Deprecation">Schema Governance & Deprecated Tables</option>
          </select>
        </div>

        {/* Footer info & submit */}
        <div className="pt-2 border-t border-[#E4EAEA] flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-[#1E5755] font-semibold">
            <BrainCircuit className="w-4 h-4 text-[#F45B0B]" />
            <span>Retains directly into Hindsight cluster</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isSaving}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              Save to Memory
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
