import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
}

interface ToastContextValue {
  showToast: (title: string, description?: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((title: string, description?: string, type: ToastType = 'success') => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-[#16A36A] shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-[#E5484D] shrink-0" />,
    warning: <AlertCircle className="w-5 h-5 text-[#D97706] shrink-0" />,
    info: <Info className="w-5 h-5 text-[#F45B0B] shrink-0" />,
  };

  const borderStyles = {
    success: 'border-[#A7F3D0]',
    error: 'border-[#FECDD3]',
    warning: 'border-[#FDE68A]',
    info: 'border-[#FCD2C0]',
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl bg-white border ${borderStyles[toast.type || 'info']} shadow-lg shadow-[#142337]/5`}
            >
              {icons[toast.type || 'info']}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#142337]">{toast.title}</p>
                {toast.description && (
                  <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-[#94A3B8] hover:text-[#142337] p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
};
