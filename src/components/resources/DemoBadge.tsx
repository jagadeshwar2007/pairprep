import React from 'react';
import { FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Marks placeholder content. Shown on every demo resource so it is never mistaken for a real document. */
export function DemoBadge({ className, label = 'Demo' }: { className?: string; label?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-900',
        className
      )}
      title="Placeholder entry. No real document is attached."
    >
      <FlaskConical className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
