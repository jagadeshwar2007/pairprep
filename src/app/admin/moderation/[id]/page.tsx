import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { AlertTriangle, ExternalLink, FileText, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { StatusBadge } from '@/components/contribute/StatusBadge';
import { ReviewActions } from '@/components/admin/ReviewActions';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { describeExternalHost } from '@/lib/files/urls';
import { formatBytes, kindFromMime } from '@/lib/files/registry';
import { CONTRIBUTION_SELECT, type ContributionRow, type ReviewRow, type RevisionRow } from '@/types/backend';

type Params = Promise<{ id: string }>;

export default function ReviewPage({ params }: { params: Params }) {
  return <Review params={params} />;
}

type FullRow = ContributionRow & { submitter: { full_name: string | null; email: string; created_at: string } | null };

async function Review({ params }: { params: Params }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { allowed, access } = await gate(`/admin/moderation/${id}`, ['contributions.read']);
  if (!allowed) return <AccessDenied />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('contributions')
    .select(`${CONTRIBUTION_SELECT}, submitter:profiles!submitted_by(full_name, email, created_at)`)
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[admin] review load failed:', error.message);
    return <ErrorState title="We couldn't load this contribution" />;
  }
  if (!data) notFound();
  const c = data as unknown as FullRow;

  const [flag, revisions, reviews, existing, otherFromUser] = await Promise.all([
    supabase.from('contribution_flags').select('reason').eq('contribution_id', id).maybeSingle(),
    supabase.from('contribution_revisions').select('id, contribution_id, revision, title, description, resource_type, storage_path, external_url, file_name, file_size, created_at').eq('contribution_id', id).order('revision'),
    supabase.from('contribution_reviews').select('id, contribution_id, revision, reviewer_id, action, feedback, created_at').eq('contribution_id', id).order('created_at'),
    supabase.from('resources').select('id, title').eq('subject_id', c.subject_id).eq('status', 'published').order('published_at', { ascending: false }).limit(8),
    supabase.from('contributions').select('id', { count: 'exact', head: true }).eq('submitted_by', c.submitted_by).eq('status', 'approved'),
  ]);
  const failure = [flag, revisions, reviews, existing, otherFromUser].find((r) => r.error);
  if (failure?.error) {
    console.error('[admin] review details failed:', failure.error.message);
    return <ErrorState title="We couldn't load the review details" />;
  }

  const reviewRows = (reviews.data ?? []) as unknown as ReviewRow[];
  const revisionRows = (revisions.data ?? []) as unknown as RevisionRow[];
  const events = [
    ...revisionRows.map((r) => ({ at: r.created_at, label: r.revision === 1 ? 'Submitted' : `Resubmitted (revision ${r.revision})`, by: null as string | null, feedback: null as string | null })),
    ...reviewRows.map((r) => ({
      at: r.created_at,
      label: { start_review: 'Review started', approve: 'Approved', reject: 'Rejected', request_changes: 'Changes requested', flag: 'Flagged', unflag: 'Flag cleared' }[r.action],
      by: r.reviewer_id === access.userId ? 'You' : 'Moderator',
      feedback: r.feedback,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at));

  const kind = kindFromMime(c.mime_type);
  const previewable = kind === 'pdf' || kind === 'png' || kind === 'jpg';
  const external = c.external_url ? describeExternalHost(c.external_url) : null;
  const flagged = Boolean(flag.data);
  const canApprove = can(access, 'contributions.approve');

  return (
    <div className="space-y-6">
      <Link href="/admin/moderation" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Back to queue</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card className="space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{c.title}</h2>
                <p className="text-sm text-slate-500">
                  {c.subjects?.code} • {c.subjects?.name} • {c.subjects?.branches.code} Sem {c.subjects?.semester} • {CATEGORY_LABELS[c.resource_type]?.label}
                </p>
              </div>
              <StatusBadge status={c.status} />
            </div>
            {c.description && <p className="whitespace-pre-line text-sm text-slate-700 dark:text-slate-300">{c.description}</p>}
            {c.contributor_credit && <p className="text-xs text-slate-500">Requested public credit: <strong>{c.contributor_credit}</strong></p>}
            {flag.data && (
              <p role="note" className="flex gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span><strong>Flagged:</strong> {flag.data.reason as string}</span>
              </p>
            )}
          </Card>

          <Card className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Attachment</h3>
              {c.storage_path && (
                <span className="flex gap-3 text-xs font-semibold">
                  <a href={`/api/contributions/${c.id}/file`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">Open in new tab</a>
                  <a href={`/api/contributions/${c.id}/file?download=1`} className="text-indigo-600 hover:underline">Download</a>
                </span>
              )}
            </div>

            {c.storage_path ? (
              <>
                <p className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <FileText className="h-4 w-4 text-indigo-500" /> {c.file_name} {c.file_size ? `• ${formatBytes(c.file_size)}` : ''}
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">content verified by the server</span>
                </p>
                {previewable ? (
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
                    {kind === 'pdf' ? (
                      <iframe src={`/api/contributions/${c.id}/file`} title={`Preview of ${c.title}`} className="h-[70vh] w-full" referrerPolicy="no-referrer" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={`/api/contributions/${c.id}/file`} alt={`Preview of ${c.title}`} className="mx-auto max-h-[70vh] object-contain" />
                    )}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500 dark:bg-slate-800/50">
                    This file type has no in-browser preview. Download it to review.
                  </p>
                )}
              </>
            ) : c.external_url ? (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50/60 p-4 text-sm dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="font-semibold text-slate-900 dark:text-white">External link on {external?.label}</p>
                <p className="break-all font-mono text-xs text-slate-600 dark:text-slate-300">{c.external_url}</p>
                <p className="text-xs text-amber-900 dark:text-amber-200">
                  This is a third-party site Pairprep does not control or preview. Open it yourself, confirm the content matches the title,
                  and check it is viewable without a login.
                </p>
                <a href={c.external_url} target="_blank" rel="noopener noreferrer nofollow ugc" className="inline-flex items-center gap-1.5 font-semibold text-indigo-600 hover:underline">
                  <ExternalLink className="h-4 w-4" /> Open link
                </a>
              </div>
            ) : (
              <p className="text-sm text-slate-500">The file was removed after the retention period.</p>
            )}
          </Card>

          <Card>
            <h3 className="mb-4 text-sm font-bold text-slate-900 dark:text-white">History</h3>
            <ol className="space-y-4 border-l border-slate-200 pl-5 dark:border-slate-800">
              {events.map((e, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 dark:border-slate-900" aria-hidden="true" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{e.label}{e.by ? <span className="font-normal text-slate-500"> by {e.by}</span> : null}</p>
                  <LocalDate iso={e.at} withTime className="text-xs text-slate-400" />
                  {e.feedback && <p className="mt-1 whitespace-pre-line rounded-lg bg-slate-50 p-2.5 text-xs text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">{e.feedback}</p>}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Decision</h3>
            <ReviewActions
              id={c.id}
              status={c.status}
              flagged={flagged}
              isOwn={c.submitted_by === access.userId}
              can={{ review: can(access, 'contributions.review'), approve: canApprove, reject: can(access, 'contributions.reject') }}
            />
          </Card>

          <Card className="space-y-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white"><User className="h-4 w-4 text-indigo-500" /> Uploader</h3>
            <p className="text-sm text-slate-800 dark:text-slate-100">{c.submitter?.full_name ?? 'Unknown'}</p>
            <p className="break-all text-xs text-slate-500">{c.submitter?.email}</p>
            {c.submitter?.created_at && <p className="text-xs text-slate-400">Member since <LocalDate iso={c.submitter.created_at} /></p>}
            <p className="text-xs text-slate-400">{otherFromUser.count ?? 0} previously approved contributions</p>
            <p className="text-[11px] text-slate-400">Visible to moderators for review purposes only. Never shown publicly.</p>
          </Card>

          <Card className="space-y-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Already published for this subject</h3>
            {(existing.data ?? []).length === 0 ? (
              <p className="text-xs text-slate-500">Nothing published yet.</p>
            ) : (
              <ul className="list-disc space-y-1 pl-4 text-xs text-slate-600 dark:text-slate-300">
                {(existing.data ?? []).map((r) => <li key={r.id as string}>{r.title as string}</li>)}
              </ul>
            )}
            <p className="text-[11px] text-slate-400">Skim for duplicates before approving; flag suspected ones.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
