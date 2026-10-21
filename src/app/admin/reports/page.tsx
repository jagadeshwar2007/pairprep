import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, EmptyState, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { FilterTabs, Pagination } from '@/components/admin/ListControls';
import { ReportActions } from '@/components/admin/ReportActions';
import { FeedbackActions } from '@/components/admin/FeedbackActions';
import { gate } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_PAGE_SIZE, oneOf, pageRange, parsePage } from '@/lib/admin/query';

const STATUSES = ['open', 'resolved', 'dismissed', 'all'] as const;
type SearchParams = Promise<{ status?: string; page?: string }>;

export default function ReportsPage({ searchParams }: { searchParams: SearchParams }) {
  return <Reports searchParams={searchParams} />;
}

interface Row {
  id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
  resource_id: string;
  resources: { title: string } | null;
}

async function Reports({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const { allowed } = await gate('/admin/reports', ['resources.edit']);
  if (!allowed) return <AccessDenied />;

  const status = oneOf(params.status, STATUSES, 'open');
  const page = parsePage(params.page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('resource_reports')
    .select('id, reason, details, status, created_at, resource_id, resources(title)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);
  if (status !== 'all') query = query.eq('status', status);

  const [{ data, count, error }, feedback] = await Promise.all([
    query,
    supabase.from('feedback').select('id, message, contact_email, status, created_at').eq('status', 'new').order('created_at', { ascending: false }).limit(20),
  ]);
  if (error || feedback.error) {
    console.error('[admin] reports failed:', error?.message ?? feedback.error?.message);
    return <ErrorState title="We couldn't load reports" />;
  }
  const rows = (data ?? []) as unknown as Row[];
  const feedbackRows = (feedback.data ?? []) as { id: string; message: string; contact_email: string | null; created_at: string }[];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Reports</h2>
        <p className="text-sm text-slate-500">Problems students flagged on published resources.</p>
      </div>
      <FilterTabs basePath="/admin/reports" param="status" current={status} options={STATUSES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))} />

      {rows.length === 0 ? (
        <EmptyState title={status === 'open' ? 'No open reports' : 'Nothing here'}>
          {status === 'open' ? 'All reported problems have been handled.' : 'Try another filter.'}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 space-y-1 text-sm">
                  <Link href={`/admin/resources/${r.resource_id}`} className="font-semibold text-slate-900 hover:text-indigo-600 dark:text-white">
                    {r.resources?.title ?? 'Resource'}
                  </Link>
                  <p className="text-slate-600 dark:text-slate-300">
                    {r.reason.replace(/-/g, ' ')} <Badge size="sm" variant={r.status === 'open' ? 'warning' : 'neutral'}>{r.status}</Badge>
                  </p>
                  {r.details && <p className="whitespace-pre-line text-xs text-slate-500">{r.details}</p>}
                  <LocalDate iso={r.created_at} withTime className="text-xs text-slate-400" />
                </div>
                {r.status === 'open' && <ReportActions id={r.id} />}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <Pagination basePath="/admin/reports" page={page} total={count ?? 0} size={ADMIN_PAGE_SIZE} params={{ status }} />

      <section aria-labelledby="feedback-heading" className="space-y-3 pt-4">
        <h3 id="feedback-heading" className="text-lg font-bold text-slate-900 dark:text-white">Student feedback</h3>
        {feedbackRows.length === 0 ? (
          <p className="text-sm text-slate-500">No new feedback.</p>
        ) : (
          <ul className="space-y-3">
            {feedbackRows.map((f) => (
              <li key={f.id}>
                <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="whitespace-pre-line text-slate-800 dark:text-slate-100">{f.message}</p>
                    <p className="text-xs text-slate-400">
                      <LocalDate iso={f.created_at} withTime />
                      {f.contact_email && <> • reply to {f.contact_email}</>}
                    </p>
                  </div>
                  <FeedbackActions id={f.id} />
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
