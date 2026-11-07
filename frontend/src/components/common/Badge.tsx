import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'orange' | 'powder' | 'emerald' | 'amber' | 'rose' | 'slate' | 'cyan' | 'violet';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'slate',
  size = 'md',
  dot = false,
  className = '',
}) => {
  // Normalize backwards compatibility (cyan -> powder, violet -> orange/powder)
  const normalizedVariant = 
    variant === 'cyan' ? 'powder' : 
    variant === 'violet' ? 'orange' : 
    variant;

  const variantStyles = {
    orange: 'bg-[#FEECE3] text-[#F45B0B] border-[#FCD2C0]',
    powder: 'bg-[#EAF3F3] text-[#1E5755] border-[#A8C9C8]',
    emerald: 'bg-[#ECFDF5] text-[#16A36A] border-[#A7F3D0]',
    amber: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    rose: 'bg-[#FEF2F2] text-[#E5484D] border-[#FECDD3]',
    slate: 'bg-[#F1F5F9] text-[#475569] border-[#E2E8F0]',
  };

  const dotColors = {
    orange: 'bg-[#F45B0B]',
    powder: 'bg-[#439694]',
    emerald: 'bg-[#16A36A]',
    amber: 'bg-[#D97706]',
    rose: 'bg-[#E5484D]',
    slate: 'bg-[#64748B]',
  };

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 font-medium',
    md: 'text-xs px-2.5 py-0.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border transition-colors ${variantStyles[normalizedVariant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[normalizedVariant]}`} />}
      {children}
    </span>
  );
};
