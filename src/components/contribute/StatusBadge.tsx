import React from 'react';
import { CheckCircle2, Clock, Eye, MessageSquareWarning, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ContributionStatus } from '@/types/backend';

const CONFIG: Record<ContributionStatus, { label: string; className: string; icon: React.ComponentType<{ className?: string }>; hint: string }> = {
  pending: {
    label: 'Pending review',
    className: 'bg-amber-100 text-amber-800 border-amber-200/70 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
    icon: Clock,
    hint: 'Waiting for a moderator to pick it up.',
  },
  in_review: {
    label: 'In review',
    className: 'bg-indigo-100 text-indigo-800 border-indigo-200/70 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60',
    icon: Eye,
    hint: 'A moderator is checking it now.',
  },
  approved: {
    label: 'Approved',
    className: 'bg-emerald-100 text-emerald-800 border-emerald-200/70 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
    icon: CheckCircle2,
    hint: 'Published in the resource hub.',
  },
  changes_requested: {
    label: 'Changes requested',
    className: 'bg-orange-100 text-orange-800 border-orange-200/70 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
    icon: MessageSquareWarning,
    hint: 'A moderator asked for edits. Update and resubmit.',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-rose-100 text-rose-800 border-rose-200/70 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
    icon: XCircle,
    hint: 'Not accepted. See the feedback for why.',
  },
};

export function statusHint(status: ContributionStatus) {
  return CONFIG[status].hint;
}

export function StatusBadge({ status, className }: { status: ContributionStatus; className?: string }) {
  const { label, className: color, icon: Icon } = CONFIG[status];
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium', color, className)}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {label}
    </span>
  );
}
