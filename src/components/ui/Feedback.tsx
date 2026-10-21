import React from 'react';
import { AlertTriangle, Info, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ Notice */

type NoticeTone = 'info' | 'warning' | 'demo';

const NOTICE_STYLES: Record<NoticeTone, { box: string; icon: React.ElementType; iconClass: string }> = {
  info: { box: 'border-slate-200 bg-slate-50 text-slate-700', icon: Info, iconClass: 'text-slate-500' },
  warning: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: AlertTriangle, iconClass: 'text-amber-600' },
  demo: { box: 'border-amber-200 bg-amber-50 text-amber-950', icon: FlaskConical, iconClass: 'text-amber-600' },
};

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: NoticeTone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const { box, icon: Icon, iconClass } = NOTICE_STYLES[tone];
  return (
    <div className={cn('flex gap-3 rounded-lg border px-4 py-3 text-sm leading-relaxed', box, className)} role="note">
      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', iconClass)} aria-hidden="true" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? 'mt-0.5' : undefined}>{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------- EmptyState */

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ElementType;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center',
        className
      )}
    >
      {Icon && (
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- Skeleton */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-md bg-slate-200/70', className)} aria-hidden="true" />;
}

export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-white p-5">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}
