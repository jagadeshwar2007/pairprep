import Link from 'next/link';
import { Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { EmptyState, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { StatusBadge, statusHint } from '@/components/contribute/StatusBadge';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { requireUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { CONTRIBUTION_SELECT, type ContributionRow, type ContributionStatus } from '@/types/backend';

const PAGE_SIZE = 15;
const FILTERS: { id: 'all' | ContributionStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'in_review', label: 'In review' },
  { id: 'changes_requested', label: 'Changes requested' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

type SearchParams = Promise<{ status?: string; page?: string }>;

export default function MyContributionsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Contributions searchParams={searchParams} />;
}

async function Contributions({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const status = FILTERS.find((f) => f.id === params.status)?.id ?? 'all';
  const page = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1);
  await requireUser('/account/contributions');
  const supabase = await createClient();

  let query = supabase
    .from('contributions')
    .select(CONTRIBUTION_SELECT, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (status !== 'all') query = query.eq('status', status);

  const { data, count, error } = await query;
  if (error) {
    console.error('[account] contributions load failed:', error.message);
    return <ErrorState title="We couldn't load your contributions" />;
  }
  const rows = (data ?? []) as unknown as ContributionRow[];
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));
  const href = (s: string, p = 1) => `/account/contributions?${new URLSearchParams({ ...(s !== 'all' ? { status: s } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">My contributions</h1>
          <p className="text-sm text-slate-500">Everything you&apos;ve shared, and where it is in review.</p>
        </div>
        <Link href="/submit" className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          <Upload className="h-4 w-4" /> New contribution
        </Link>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter by status">
        {FILTERS.map((f) => (
          <Link
            key={f.id}
            href={href(f.id)}
            aria-current={status === f.id ? 'true' : undefined}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-colors ${
              status === f.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title={status === 'all' ? 'No contributions yet' : 'Nothing in this state'} action={{ href: '/submit', label: 'Contribute a resource' }}>
          {status === 'all' ? 'Share notes or papers to help your batch. Moderators review every submission.' : 'Try another filter.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((c) => (
            <li key={c.id}>
              <Link href={`/account/contributions/${c.id}`}>
                <Card hoverEffect className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{c.title}</p>
                    <p className="text-xs text-slate-500">
                      {c.subjects?.code} • {c.subjects?.branches.code} Sem {c.subjects?.semester} • {CATEGORY_LABELS[c.resource_type]?.label}
                      {c.revision > 1 ? ` • revision ${c.revision}` : ''} • <LocalDate iso={c.created_at} />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{statusHint(c.status)}</p>
                  </div>
                  <StatusBadge status={c.status} className="self-start sm:self-center" />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
          {page > 1 ? <Link href={href(status, page - 1)} className="font-semibold text-indigo-600 hover:underline">← Newer</Link> : <span />}
          <span className="text-slate-500">Page {page} of {totalPages}</span>
          {page < totalPages ? <Link href={href(status, page + 1)} className="font-semibold text-indigo-600 hover:underline">Older →</Link> : <span />}
        </nav>
      )}
    </div>
  );
}
