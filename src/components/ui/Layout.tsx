import React from 'react';
import { cn } from '@/lib/utils';
import { Breadcrumbs, type BreadcrumbItem } from '@/components/academic/Breadcrumbs';

/** Standard page width + vertical rhythm. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10', className)}>
      {children}
    </div>
  );
}

/** Breadcrumbs, eyebrow, serif title, lede and optional actions. */
export function PageHeader({
  title,
  eyebrow,
  description,
  breadcrumbs,
  actions,
  meta,
}: {
  title: React.ReactNode;
  eyebrow?: string;
  description?: React.ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <header className="space-y-4">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2 min-w-0">
          {eyebrow && (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-indigo-700">{eyebrow}</p>
          )}
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-slate-900 text-balance">{title}</h1>
          {description && <p className="max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600">{description}</p>}
          {meta && <div className="flex flex-wrap items-center gap-2 pt-1">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold text-slate-900">{title}</h2>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
