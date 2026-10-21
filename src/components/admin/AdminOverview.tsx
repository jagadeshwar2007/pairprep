'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import type { AdminStats } from '@/lib/resources/types';

export function AdminOverview({ onOpen }: { onOpen(filter: { verificationStatus?: string; publicationStatus?: string }): void }) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<AdminStats>('/api/admin/stats').then(setStats).catch((e: Error) => setError(e.message));
  }, []);

  if (error) return <EmptyState tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Statistics could not be loaded" description={error} />;

  const cards: Array<{ label: string; value?: number; hint: string; filter: { verificationStatus?: string; publicationStatus?: string } }> = [
    { label: 'Registered resources', value: stats?.total, hint: 'All records', filter: {} },
    { label: 'Published', value: stats?.published, hint: 'Visible in the library', filter: { publicationStatus: 'published' } },
    { label: 'Pending', value: stats?.pending, hint: 'Need a reviewer', filter: { verificationStatus: 'pending' } },
    { label: 'Under review', value: stats?.underReview, hint: 'Assigned to a reviewer', filter: { verificationStatus: 'under_review' } },
    { label: 'Approved, not published', value: stats?.approvedAwaitingPublication, hint: 'Ready for you to publish', filter: { verificationStatus: 'approved' } },
    { label: 'Rejected', value: stats?.rejected, hint: 'Closed', filter: { verificationStatus: 'rejected' } },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((c) => (
        <button key={c.label} onClick={() => onOpen(c.filter)} className="text-left cursor-pointer rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
          <Card className="p-4 h-full hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors">
            <p className="text-xs font-medium text-slate-500">{c.label}</p>
            {stats ? (
              <p className="mt-1 text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{c.value}</p>
            ) : (
              <Skeleton className="mt-2 h-8 w-12" />
            )}
            <p className="mt-1 text-xs text-slate-400">{c.hint}</p>
          </Card>
        </button>
      ))}
    </div>
  );
}
