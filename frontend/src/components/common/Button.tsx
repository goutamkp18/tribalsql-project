import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'subtle' | 'ghost' | 'danger' | 'emerald' | 'powder';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'subtle',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#F45B0B]/30 disabled:opacity-50 disabled:cursor-not-allowed select-none active:scale-[0.98] cursor-pointer';

  const variantStyles = {
    primary: 'bg-[#F45B0B] hover:bg-[#DE4E04] text-white font-semibold shadow-sm hover:shadow',
    secondary: 'bg-[#142337] hover:bg-[#1E334F] text-white font-semibold shadow-sm',
    powder: 'bg-[#A8C9C8] hover:bg-[#96BCBB] text-[#142337] font-semibold border border-[#96BCBB]/50',
    emerald: 'bg-[#16A36A] hover:bg-[#138A5A] text-white font-semibold shadow-sm',
    subtle: 'bg-white hover:bg-[#F5F7F7] text-[#142337] border border-[#E4EAEA] shadow-sm',
    ghost: 'bg-transparent hover:bg-[#E4EAEA]/50 text-[#475569] hover:text-[#142337]',
    danger: 'bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#E5484D] border border-[#FECDD3]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
    lg: 'text-base px-5 py-2.5 gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon
      )}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
};
