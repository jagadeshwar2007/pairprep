'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, ExternalLink, XCircle } from 'lucide-react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { ResourceTypeBadge } from '@/components/resources/ResourceCard';
import { api } from '@/lib/api/client';
import { departmentName } from '@/lib/resources/constants';
import type { PublicResource, ReviewAssignment } from '@/lib/resources/types';

type Item = ReviewAssignment & {
  resource: (PublicResource & { fileName: string; contributorNote: string | null }) | null;
};

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '');

function DecisionForm({ item, onDone }: { item: Item; onDone(): void }) {
  const toast = useToast();
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const decide = async (decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !comments.trim()) {
      setError('Add a comment explaining why the resource is rejected.');
      return;
    }
    setBusy(decision);
    setError(null);
    try {
      await api(`/api/reviews/${item.id}/decision`, { body: { decision, comments: comments.trim() || undefined } });
      toast(decision === 'approve' ? 'Approved. An administrator can now publish it.' : 'Rejected with your comments.', 'success');
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the decision');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
      <label htmlFor={`c-${item.id}`} className="block text-sm font-medium text-slate-700 dark:text-slate-300">
        Comments <span className="font-normal text-slate-400">(required to reject)</span>
      </label>
      <Textarea id={`c-${item.id}`} rows={3} value={comments} onChange={(e) => setComments(e.target.value)} maxLength={2000} placeholder="Is it legible, complete and correctly labelled?" />
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" size="sm" isLoading={busy === 'approve'} disabled={busy !== null} onClick={() => decide('approve')}>
          <CheckCircle2 className="h-4 w-4" /> Approve
        </Button>
        <Button variant="outline" size="sm" isLoading={busy === 'reject'} disabled={busy !== null} onClick={() => decide('reject')}>
          <XCircle className="h-4 w-4" /> Reject
        </Button>
      </div>
      <p className="text-xs text-slate-500">Approving does not publish. An administrator publishes approved resources.</p>
    </div>
  );
}

function ReviewCard({ item, onDone }: { item: Item; onDone(): void }) {
  const r = item.resource;
  return (
    <Card className="p-5 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {r && <ResourceTypeBadge type={r.resourceType} />}
            {item.status === 'completed' && (
              <Badge variant={item.decision === 'approve' ? 'success' : 'danger'} size="sm">
                {item.decision === 'approve' ? 'You approved' : 'You rejected'}
              </Badge>
            )}
            {item.status === 'cancelled' && <Badge variant="neutral" size="sm">Withdrawn by admin</Badge>}
          </div>
          <h3 className="font-semibold text-slate-900 dark:text-white break-words">{r?.title ?? item.resourceTitle}</h3>
          {r && (
            <p className="text-xs text-slate-500">
              {r.subject}{r.subjectCode ? ` (${r.subjectCode})` : ''} · {departmentName(r.department)} · Sem {r.semester}
              {r.academicYear ? ` · ${r.academicYear}` : ''}
            </p>
          )}
        </div>
        {r && (
          <a href={r.links.open} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /> Open file</Button>
          </a>
        )}
      </div>
      {r?.description && <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>}
      {r?.contributorNote && (
        <p className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">Contributor note: {r.contributorNote}</p>
      )}
      <p className="text-xs text-slate-400">
        Assigned {fmt(item.createdAt)}
        {item.completedAt ? ` · closed ${fmt(item.completedAt)}` : ''}
        {r?.fileName ? ` · ${r.fileName}` : ''}
      </p>
      {item.status === 'completed' && item.comments && (
        <p className="text-sm text-slate-700 dark:text-slate-300 border-l-2 border-slate-200 dark:border-slate-700 pl-3">{item.comments}</p>
      )}
      {item.status === 'assigned' && r && <DecisionForm item={item} onDone={onDone} />}
      {item.status === 'assigned' && !r && <p className="text-sm text-rose-600">The resource for this review no longer exists.</p>}
    </Card>
  );
}

function Reviews() {
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'assigned' | 'completed'>('assigned');

  const load = useCallback(() => {
    api<{ items: Item[] }>('/api/reviews')
      .then((r) => {
        setItems(r.items);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const assigned = items?.filter((i) => i.status === 'assigned') ?? [];
  const completed = items?.filter((i) => i.status !== 'assigned') ?? [];
  const shown = tab === 'assigned' ? assigned : completed;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">My reviews</h1>
        <p className="mt-1 text-sm text-slate-500">Only reviews an administrator assigned to you appear here.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-slate-500">Pending</p><p className="text-2xl font-bold">{items ? assigned.length : '–'}</p></Card>
        <Card className="p-4"><p className="text-xs text-slate-500">Completed</p><p className="text-2xl font-bold">{items ? completed.filter((c) => c.status === 'completed').length : '–'}</p></Card>
        <Card className="p-4 hidden sm:block"><p className="text-xs text-slate-500">Approved by you</p><p className="text-2xl font-bold">{items ? completed.filter((c) => c.decision === 'approve').length : '–'}</p></Card>
      </div>
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800" role="tablist">
        {(['assigned', 'completed'] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px cursor-pointer ${tab === t ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t === 'assigned' ? `To review (${assigned.length})` : `History (${completed.length})`}
          </button>
        ))}
      </div>
      {error ? (
        <EmptyState tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Reviews could not be loaded" description={error} />
      ) : items === null ? (
        <Skeleton className="h-48 w-full" />
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="h-6 w-6" />}
          title={tab === 'assigned' ? 'Nothing waiting for you' : 'No completed reviews yet'}
          description={tab === 'assigned' ? 'New assignments from administrators will show up here.' : undefined}
        />
      ) : (
        <div className="space-y-4">{shown.map((i) => <ReviewCard key={i.id} item={i} onDone={load} />)}</div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <RequireAuth roles={['reviewer', 'admin']}>
      <Reviews />
    </RequireAuth>
  );
}
