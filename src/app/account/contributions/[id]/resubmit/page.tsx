import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { z } from 'zod';
import { ContributionForm, type ContributionInitial } from '@/components/contribute/ContributionForm';
import { ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { requireUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { CONTRIBUTION_SELECT, type ContributionRow } from '@/types/backend';

type Params = Promise<{ id: string }>;

export default function ResubmitPage({ params }: { params: Params }) {
  return <Resubmit params={params} />;
}

async function Resubmit({ params }: { params: Params }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!isSupabaseConfigured()) return <SetupNotice />;
  await requireUser(`/account/contributions/${id}/resubmit`);
  const supabase = await createClient();

  const { data, error } = await supabase.from('contributions').select(CONTRIBUTION_SELECT).eq('id', id).maybeSingle();
  if (error) {
    console.error('[account] resubmit load failed:', error.message);
    return <ErrorState title="We couldn't load this contribution" />;
  }
  if (!data) notFound();
  const c = data as unknown as ContributionRow;
  if (c.status !== 'changes_requested') redirect(`/account/contributions/${id}`);

  const initial: ContributionInitial = {
    subjectSlug: c.subjects?.slug,
    title: c.title,
    description: c.description ?? '',
    category: c.resource_type,
    credit: c.contributor_credit ?? '',
    current: c.storage_path
      ? { kind: 'file', fileName: c.file_name ?? 'uploaded file' }
      : c.external_url
        ? { kind: 'link', url: c.external_url }
        : { kind: 'removed' },
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href={`/account/contributions/${id}`} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← Back to feedback</Link>
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Edit &amp; resubmit</h1>
        <p className="text-sm text-slate-500">Your earlier version and the moderator&apos;s feedback are kept in the history.</p>
      </div>
      {c.review_feedback && (
        <p role="note" className="whitespace-pre-line rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/30 dark:text-orange-200">
          <strong>Moderator&apos;s feedback:</strong> {c.review_feedback}
        </p>
      )}
      <ContributionForm mode="resubmit" contributionId={id} initial={initial} />
    </div>
  );
}
