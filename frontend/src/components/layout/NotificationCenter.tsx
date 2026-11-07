import React from 'react';
import { Modal } from '../common/Modal';
import { Brain, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { PageView } from '../../types';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (page: PageView) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const notifications = [
    {
      id: 'notif-1',
      title: 'New Business Rule Retained',
      desc: 'Net revenue rule updated to deduct refunds and exclude CANCELLED orders.',
      time: '5 min ago',
      type: 'memory',
      target: 'memory-inspector' as PageView,
    },
    {
      id: 'notif-2',
      title: 'Mental Model Synced',
      desc: 'Revenue & GAAP Net Realized Revenue model refreshed with 14 query validations.',
      time: '18 min ago',
      type: 'brain',
      target: 'memory-inspector' as PageView,
    },
    {
      id: 'notif-3',
      title: 'PostgreSQL Catalog Indexed',
      desc: 'All 7 NovaMart tables and 6 foreign key constraints verified active.',
      time: '42 min ago',
      type: 'db',
      target: 'database-explorer' as PageView,
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Activity & Alerts"
      subtitle="Institutional learning stream and agent memory events"
      maxWidth="md"
    >
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => {
              onNavigate(n.target);
              onClose();
            }}
            className="p-3.5 rounded-xl bg-[#F5F7F7] hover:bg-[#EAF3F3] border border-[#E4EAEA] transition-all cursor-pointer group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-white border border-[#E4EAEA] text-[#F45B0B] shrink-0 shadow-xs">
                {n.type === 'memory' ? (
                  <CheckCircle2 className="w-4 h-4 text-[#16A36A]" />
                ) : n.type === 'brain' ? (
                  <Brain className="w-4 h-4 text-[#F45B0B]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#F45B0B]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#142337] group-hover:text-[#F45B0B] transition-colors">
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-[#64748B]">{n.time}</span>
                </div>
                <p className="text-xs text-[#64748B] mt-1 leading-relaxed">{n.desc}</p>
                <div className="flex items-center gap-1 text-[11px] text-[#F45B0B] font-semibold mt-2">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};
