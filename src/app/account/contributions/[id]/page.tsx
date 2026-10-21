import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, MessageSquareWarning, PencilLine, XCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { StatusBadge, statusHint } from '@/components/contribute/StatusBadge';
import { WithdrawButton } from '@/components/contribute/WithdrawButton';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { requireUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { describeExternalHost } from '@/lib/files/urls';
import { formatBytes } from '@/lib/files/registry';
import { CONTRIBUTION_SELECT, type ContributionRow, type ReviewRow, type RevisionRow } from '@/types/backend';

type Params = Promise<{ id: string }>;

export default function ContributionDetailPage({ params }: { params: Params }) {
  return <Detail params={params} />;
}

async function Detail({ params }: { params: Params }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!isSupabaseConfigured()) return <SetupNotice />;
  await requireUser(`/account/contributions/${id}`);
  const supabase = await createClient();

  // Row Level Security guarantees this only ever returns the signed-in student's own row.
  const { data, error } = await supabase.from('contributions').select(CONTRIBUTION_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('[account] contribution load failed:', error.message);
    return <ErrorState title="We couldn't load this contribution" />;
  }
  if (!data) notFound();
  const c = data as unknown as ContributionRow;

  const [revisions, reviews] = await Promise.all([
    supabase.from('contribution_revisions').select('id, contribution_id, revision, title, description, resource_type, storage_path, external_url, file_name, file_size, created_at').eq('contribution_id', id).order('revision'),
    supabase.from('contribution_reviews').select('id, contribution_id, revision, reviewer_id, action, feedback, created_at').eq('contribution_id', id).order('created_at'),
  ]);
  if (revisions.error || reviews.error) {
    console.error('[account] history load failed:', revisions.error?.message ?? reviews.error?.message);
    return <ErrorState title="We couldn't load this contribution's history" />;
  }

  type Event = { at: string; kind: 'submitted' | 'outcome'; revision: number; action?: ReviewRow['action']; feedback?: string | null };
  const events: Event[] = [
    ...((revisions.data ?? []) as unknown as RevisionRow[]).map((r) => ({ at: r.created_at, kind: 'submitted' as const, revision: r.revision })),
    ...((reviews.data ?? []) as unknown as ReviewRow[]).map((r) => ({ at: r.created_at, kind: 'outcome' as const, revision: r.revision, action: r.action, feedback: r.feedback })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const external = c.external_url ? describeExternalHost(c.external_url) : null;
  const subjectHref = c.subjects ? `/resources/${c.subjects.academic_year}/${c.subjects.branches.slug}/${c.subjects.semester}/${c.subjects.slug}` : '/resources';
  const canWithdraw = ['pending', 'changes_requested', 'rejected'].includes(c.status);

  return (
    <div className="space-y-6">
      <Link href="/account/contributions" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← All contributions</Link>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{c.title}</h1>
            <p className="text-sm text-slate-500">
              {c.subjects?.code} • {c.subjects?.name} • {c.subjects?.branches.code} Sem {c.subjects?.semester} • {CATEGORY_LABELS[c.resource_type]?.label}
            </p>
          </div>
          <StatusBadge status={c.status} />
        </div>
        <p className="text-sm text-slate-500">{statusHint(c.status)}</p>

        {(c.status === 'changes_requested' || c.status === 'rejected') && c.review_feedback && (
          <div
            role="note"
            className={`flex gap-3 rounded-xl border p-4 text-sm ${
              c.status === 'rejected'
                ? 'border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200'
                : 'border-orange-200 bg-orange-50 text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200'
            }`}
          >
            {c.status === 'rejected' ? <XCircle className="mt-0.5 h-5 w-5 shrink-0" /> : <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0" />}
            <div>
              <p className="font-semibold">{c.status === 'rejected' ? 'Why it was not accepted' : 'What the moderator asked for'}</p>
              <p className="mt-1 whitespace-pre-line">{c.review_feedback}</p>
            </div>
          </div>
        )}

        {c.status === 'approved' && (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>
              Thank you! It&apos;s live in the hub.{' '}
              <Link href={subjectHref} className="font-semibold underline">See it on the subject page</Link>.
            </span>
          </div>
        )}

        {c.description && <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{c.description}</p>}

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-800 dark:bg-slate-900/60">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Attachment</p>
          {c.storage_path ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-indigo-500" /><span className="truncate">{c.file_name} {c.file_size ? `(${formatBytes(c.file_size)})` : ''}</span></span>
              <span className="flex gap-3 text-xs font-semibold">
                <a href={`/api/contributions/${c.id}/file`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">View</a>
                <a href={`/api/contributions/${c.id}/file?download=1`} className="text-indigo-600 hover:underline">Download</a>
              </span>
            </div>
          ) : c.external_url ? (
            <a href={c.external_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="flex items-center gap-2 text-indigo-600 hover:underline">
              <ExternalLink className="h-4 w-4 shrink-0" />
              <span className="truncate">{external?.label}: {c.external_url}</span>
            </a>
          ) : (
            <p className="flex items-center gap-2 text-slate-500"><AlertTriangle className="h-4 w-4 text-amber-500" /> The file was removed after the retention period.</p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">Only you and permitted moderators can open this until it is approved.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
          {c.status === 'changes_requested' && (
            <Link href={`/account/contributions/${c.id}/resubmit`} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              <PencilLine className="h-4 w-4" /> Edit &amp; resubmit
            </Link>
          )}
          {canWithdraw && <WithdrawButton id={c.id} />}
          {c.status === 'rejected' && (
            <Link href="/submit" className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Submit a corrected version as new</Link>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">History</h2>
        <ol className="space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
          {events.map((e, i) => (
            <li key={i} className="relative">
              <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-900 dark:text-white">
                {e.kind === 'submitted'
                  ? e.revision === 1 ? 'Submitted for review' : `Resubmitted (revision ${e.revision})`
                  : e.action === 'approve' ? 'Approved and published'
                  : e.action === 'reject' ? 'Rejected'
                  : e.action === 'request_changes' ? 'Changes requested'
                  : e.action}
              </p>
              <LocalDate iso={e.at} withTime className="text-xs text-slate-400" />
              {e.feedback && <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{e.feedback}</p>}
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
}
