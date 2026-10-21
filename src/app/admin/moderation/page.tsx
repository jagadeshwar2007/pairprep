import Link from 'next/link';
import { AlertTriangle, ExternalLink, FileText } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, EmptyState, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { StatusBadge } from '@/components/contribute/StatusBadge';
import { FilterTabs, Pagination, SearchBox } from '@/components/admin/ListControls';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { gate } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_PAGE_SIZE, likePattern, oneOf, pageRange, parsePage, sanitizeSearch } from '@/lib/admin/query';
import { CONTRIBUTION_SELECT, type ContributionRow } from '@/types/backend';

const TABS = [
  { id: 'open', label: 'Needs review' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_review', label: 'In review' },
  { id: 'changes_requested', label: 'Changes requested' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
  { id: 'mine', label: 'My reviews' },
  { id: 'all', label: 'All' },
] as const;
const SORTS = ['oldest', 'newest'] as const;

type SearchParams = Promise<{ status?: string; q?: string; sort?: string; page?: string }>;

export default function ModerationQueuePage({ searchParams }: { searchParams: SearchParams }) {
  return <Queue searchParams={searchParams} />;
}

type QueueRow = ContributionRow & {
  submitter: { full_name: string | null; email: string } | null;
  contribution_flags: { reason: string } | { reason: string }[] | null;
};

async function Queue({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const { allowed, access } = await gate('/admin/moderation', ['contributions.read']);
  if (!allowed) return <AccessDenied />;

  const status = oneOf(params.status, TABS.map((t) => t.id), 'open');
  const sort = oneOf(params.sort, SORTS, status === 'open' || status === 'pending' ? 'oldest' : 'newest');
  const page = parsePage(params.page);
  const q = sanitizeSearch(params.q);
  const pattern = likePattern(q);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('contributions')
    .select(`${CONTRIBUTION_SELECT}, submitter:profiles!submitted_by(full_name, email), contribution_flags(reason)`, { count: 'exact' })
    .order('created_at', { ascending: sort === 'oldest' })
    .range(from, to);
  if (status === 'open') query = query.in('status', ['pending', 'in_review']);
  else if (status === 'mine') query = query.eq('reviewed_by', access.userId);
  else if (status !== 'all') query = query.eq('status', status);
  if (pattern) query = query.ilike('title', pattern);

  const { data, count, error } = await query;
  if (error) {
    console.error('[admin] moderation queue failed:', error.message);
    return <ErrorState title="We couldn't load the queue" />;
  }
  const rows = (data ?? []) as unknown as QueueRow[];
  const keep = { status, q, sort };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Moderation queue</h2>
          <p className="text-sm text-slate-500">Open a submission to preview the file and decide.</p>
        </div>
        <SearchBox action="/admin/moderation" value={q} placeholder="Search by title" hidden={{ status, sort }} />
      </div>

      <FilterTabs basePath="/admin/moderation" param="status" current={status} options={[...TABS]} keep={{ q, sort }} />
      <div className="flex items-center gap-2 text-xs text-slate-500">
        Sort:
        {SORTS.map((s) => (
          <Link key={s} href={`/admin/moderation?${new URLSearchParams({ ...keep, sort: s })}`} className={sort === s ? 'font-bold text-indigo-600' : 'hover:underline'}>
            {s === 'oldest' ? 'Oldest first' : 'Newest first'}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={status === 'open' ? 'Queue is empty' : 'No contributions match'}>
          {status === 'open' ? 'Everything submitted so far has been reviewed. Nice work!' : 'Try a different filter or search.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => {
            const flag = Array.isArray(c.contribution_flags) ? c.contribution_flags[0] : c.contribution_flags;
            return (
              <li key={c.id}>
                <Link href={`/admin/moderation/${c.id}`}>
                  <Card hoverEffect className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        {c.storage_path ? <FileText className="h-4 w-4 shrink-0 text-indigo-500" aria-label="Hosted file" /> : <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-label="External link" />}
                        <span className="truncate">{c.title}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {c.subjects?.code} • {c.subjects?.branches.code} Sem {c.subjects?.semester} • {CATEGORY_LABELS[c.resource_type]?.label}
                        {c.revision > 1 ? ` • revision ${c.revision}` : ''}
                      </p>
                      <p className="text-xs text-slate-400">
                        {c.submitter?.full_name ?? 'Unknown'} ({c.submitter?.email}) • submitted <LocalDate iso={c.created_at} withTime />
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {flag && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800 dark:bg-rose-950/60 dark:text-rose-300" title={flag.reason}>
                          <AlertTriangle className="h-3 w-3" /> Flagged
                        </span>
                      )}
                      <StatusBadge status={c.status} />
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination basePath="/admin/moderation" page={page} total={count ?? 0} size={ADMIN_PAGE_SIZE} params={keep} />
    </div>
  );
}
