import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

/** Class names shared by <Button> and link-styled buttons. */
export function buttonClass(
  variant: NonNullable<ButtonProps['variant']> = 'primary',
  size: NonNullable<ButtonProps['size']> = 'md',
  className?: string
) {
  const base =
    'inline-flex items-center justify-center font-medium transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none cursor-pointer rounded-lg select-none whitespace-nowrap';

  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
    outline:
      'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100',
    ghost: 'text-slate-700 hover:bg-slate-100 active:bg-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800',
    subtle: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200',
  };

  const sizes = {
    sm: 'text-xs px-3 h-8 gap-1.5',
    md: 'text-sm px-4 h-10 gap-2',
    lg: 'text-base px-5 h-12 gap-2.5',
  };

  return cn(base, variants[variant], sizes[size], className);
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={buttonClass(variant, size, className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-0.5 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
