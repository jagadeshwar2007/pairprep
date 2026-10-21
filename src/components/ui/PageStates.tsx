import React from 'react';
import Link from 'next/link';
import { AlertTriangle, DatabaseZap, Inbox, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PanelProps {
  title: string;
  children?: React.ReactNode;
  action?: { href: string; label: string };
  className?: string;
}

function Panel({ icon: Icon, tone, title, children, action, className }: PanelProps & { icon: React.ComponentType<{ className?: string }>; tone: string }) {
  return (
    <div
      role="status"
      className={cn('rounded-2xl border border-slate-200 bg-white p-10 text-center space-y-2 dark:border-slate-800 dark:bg-slate-900', className)}
    >
      <Icon className={cn('mx-auto h-8 w-8', tone)} />
      <h2 className="text-base font-bold text-slate-900 dark:text-white">{title}</h2>
      {children && <div className="mx-auto max-w-md text-sm text-slate-500">{children}</div>}
      {action && (
        <Link href={action.href} className="inline-block pt-2 text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
          {action.label}
        </Link>
      )}
    </div>
  );
}

export const EmptyState = (p: PanelProps) => <Panel icon={Inbox} tone="text-slate-300 dark:text-slate-600" {...p} />;
export const ErrorState = (p: Partial<PanelProps>) => (
  <Panel icon={AlertTriangle} tone="text-amber-500" title={p.title ?? 'Something went wrong'} {...p}>
    {p.children ?? 'Please refresh the page. If this keeps happening, tell an admin.'}
  </Panel>
);
export const AccessDenied = (p: Partial<PanelProps>) => (
  <Panel icon={Lock} tone="text-rose-500" title={p.title ?? "You don't have access to this page"} {...p}>
    {p.children ?? 'Your account does not have the permission this page requires.'}
  </Panel>
);
export const SetupNotice = () => (
  <Panel icon={DatabaseZap} tone="text-amber-500" title="Backend not configured">
    Set <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
    <code className="rounded bg-slate-100 px-1 dark:bg-slate-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> (see the README).
  </Panel>
);

export function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-1/3 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/60" />
      ))}
    </div>
  );
}
