'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------- SearchField */

export interface SearchFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'size'> {
  value: string;
  onValueChange: (value: string) => void;
  size?: 'md' | 'lg';
}

export function SearchField({ value, onValueChange, size = 'md', className, ...props }: SearchFieldProps) {
  return (
    <div className={cn('relative w-full', className)}>
      <Search
        className={cn(
          'pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400',
          size === 'lg' ? 'h-5 w-5' : 'h-4 w-4'
        )}
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={cn(
          'w-full rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 transition-colors focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 [&::-webkit-search-cancel-button]:hidden',
          size === 'lg' ? 'h-12 pl-11 pr-10 text-base' : 'h-10 pl-10 pr-9 text-sm'
        )}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- FilterChip */

export function FilterChip({
  active,
  count,
  children,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; count?: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors cursor-pointer',
        active
          ? 'border-indigo-600 bg-indigo-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50',
        className
      )}
      {...props}
    >
      {children}
      {count !== undefined && (
        <span className={cn('tabular-nums', active ? 'text-indigo-100' : 'text-slate-400')}>{count}</span>
      )}
    </button>
  );
}

/* ----------------------------------------------------------------- Field */

export function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
