'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2, Flag, MessageSquareWarning, PlayCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { approveContribution, claimContribution, reviewContribution } from '@/actions/moderation';

type Action = 'claim' | 'approve' | 'request_changes' | 'reject' | 'flag' | 'unflag';

const COPY: Record<Exclude<Action, 'claim' | 'unflag'>, { title: string; description: string; confirm: string; label: string; required: boolean; variant: 'primary' | 'danger' | 'outline' }> = {
  approve: {
    title: 'Approve and publish?',
    description: 'The file becomes public in the resource hub immediately. The student is notified.',
    confirm: 'Approve & publish',
    label: 'Note for the student (optional)',
    required: false,
    variant: 'primary',
  },
  request_changes: {
    title: 'Request changes',
    description: 'The student sees your feedback, can edit, and resubmit. Be specific about what to fix.',
    confirm: 'Send feedback',
    label: 'What needs to change?',
    required: true,
    variant: 'primary',
  },
  reject: {
    title: 'Reject this contribution?',
    description: 'It will never be published. The student sees your reason and can submit a new version.',
    confirm: 'Reject',
    label: 'Reason for rejection',
    required: true,
    variant: 'danger',
  },
  flag: {
    title: 'Flag for follow-up',
    description: 'Flagged items cannot be approved until the flag is cleared. The student does not see flag notes.',
    confirm: 'Flag',
    label: 'Why is it suspicious or a duplicate?',
    required: true,
    variant: 'outline',
  },
};

interface ReviewActionsProps {
  id: string;
  status: string;
  flagged: boolean;
  isOwn: boolean;
  can: { review: boolean; approve: boolean; reject: boolean };
}

export function ReviewActions({ id, status, flagged, isOwn, can }: ReviewActionsProps) {
  const router = useRouter();
  const [active, setActive] = useState<Exclude<Action, 'claim' | 'unflag'> | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const open = status === 'pending' || status === 'in_review';
  const copy = active ? COPY[active] : null;

  const run = (action: Action, feedback?: string) =>
    start(async () => {
      setError(null);
      const result =
        action === 'claim'
          ? await claimContribution({ id })
          : action === 'approve'
            ? await approveContribution({ id, feedback })
            : await reviewContribution({ contributionId: id, action, feedback });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNotice(result.message ?? 'Done.');
      setActive(null);
      setText('');
      router.refresh();
    });

  if (isOwn) {
    return (
      <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
        You submitted this yourself, so another moderator has to review it.
      </p>
    );
  }
  if (!open) {
    return <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">This contribution has already been decided. Decisions are final.</p>;
  }

  return (
    <div className="space-y-3">
      {notice && <p role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"><CheckCircle2 className="h-4 w-4" />{notice}</p>}
      {error && !active && <p role="alert" className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-rose-800 dark:bg-rose-950/40 dark:text-rose-200"><AlertCircle className="h-4 w-4" />{error}</p>}
      {flagged && <p className="rounded-xl bg-rose-50 p-3 text-xs text-rose-900 dark:bg-rose-950/40 dark:text-rose-200">Flagged: clear the flag before approving.</p>}

      <div className="grid gap-2 sm:grid-cols-2">
        {status === 'pending' && can.review && (
          <Button variant="outline" onClick={() => run('claim')} isLoading={pending}>
            <PlayCircle className="mr-1.5 h-4 w-4" /> Start review
          </Button>
        )}
        {can.approve && (
          <Button onClick={() => setActive('approve')} disabled={flagged} className="bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500">
            <CheckCircle2 className="mr-1.5 h-4 w-4" /> Approve
          </Button>
        )}
        {can.review && (
          <Button variant="outline" onClick={() => setActive('request_changes')}>
            <MessageSquareWarning className="mr-1.5 h-4 w-4" /> Request changes
          </Button>
        )}
        {can.reject && (
          <Button variant="danger" onClick={() => setActive('reject')}>
            <XCircle className="mr-1.5 h-4 w-4" /> Reject
          </Button>
        )}
        {can.review &&
          (flagged ? (
            <Button variant="outline" onClick={() => run('unflag')} isLoading={pending}>
              <Flag className="mr-1.5 h-4 w-4" /> Clear flag
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setActive('flag')}>
              <Flag className="mr-1.5 h-4 w-4" /> Flag
            </Button>
          ))}
      </div>

      <Modal isOpen={active !== null} onClose={() => !pending && setActive(null)} title={copy?.title} description={copy?.description} maxWidth="lg">
        {copy && active && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (copy.required && text.trim().length < 3) {
                setError('Please write at least a few words.');
                return;
              }
              run(active, text.trim() || undefined);
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="review-text" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                {copy.label}
              </label>
              <textarea
                id="review-text"
                rows={4}
                value={text}
                maxLength={2000}
                onChange={(e) => setText(e.target.value)}
                required={copy.required}
                autoFocus
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900"
              />
            </div>
            {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setActive(null)} disabled={pending}>Cancel</Button>
              <Button type="submit" variant={copy.variant === 'outline' ? 'primary' : copy.variant} isLoading={pending}>{copy.confirm}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
