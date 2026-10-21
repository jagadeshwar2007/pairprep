import Link from 'next/link';
import { ExternalLink, FileText, Plus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, EmptyState, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { FilterTabs, Pagination, SearchBox } from '@/components/admin/ListControls';
import { ResourceRowActions } from '@/components/admin/ResourceRowActions';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_PAGE_SIZE, likePattern, oneOf, pageRange, parsePage, sanitizeSearch } from '@/lib/admin/query';
import { RESOURCE_SELECT } from '@/lib/data/resource-mapper';

const STATUSES = ['all', 'published', 'draft', 'archived'] as const;
const SORTS = [
  { id: 'newest', label: 'Newest', column: 'created_at', ascending: false },
  { id: 'updated', label: 'Recently edited', column: 'updated_at', ascending: false },
  { id: 'downloads', label: 'Most downloaded', column: 'downloads_count', ascending: false },
  { id: 'title', label: 'Title A–Z', column: 'title', ascending: true },
] as const;

type SearchParams = Promise<{ status?: string; type?: string; q?: string; sort?: string; page?: string }>;

export default function AdminResourcesPage({ searchParams }: { searchParams: SearchParams }) {
  return <ResourceList searchParams={searchParams} />;
}

interface Row {
  id: string;
  title: string;
  resource_type: keyof typeof CATEGORY_LABELS;
  status: 'draft' | 'published' | 'archived';
  external_url: string | null;
  downloads_count: number;
  verified: boolean;
  updated_at: string;
  subjects: { code: string; name: string; semester: number; branches: { code: string } };
}

async function ResourceList({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const { allowed, access } = await gate('/admin/resources', ['resources.create', 'resources.edit', 'resources.publish', 'resources.archive']);
  if (!allowed) return <AccessDenied />;

  const status = oneOf(params.status, STATUSES, 'all');
  const sort = SORTS.find((s) => s.id === params.sort) ?? SORTS[0];
  const type = oneOf(params.type, ['all', ...Object.keys(CATEGORY_LABELS)] as const, 'all');
  const q = sanitizeSearch(params.q);
  const pattern = likePattern(q);
  const page = parsePage(params.page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('resources')
    .select(`${RESOURCE_SELECT}, status, updated_at`, { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending })
    .range(from, to);
  if (status !== 'all') query = query.eq('status', status);
  if (type !== 'all') query = query.eq('resource_type', type);
  if (pattern) query = query.ilike('title', pattern);

  const { data, count, error } = await query;
  if (error) {
    console.error('[admin] resources list failed:', error.message);
    return <ErrorState title="We couldn't load resources" />;
  }
  const rows = (data ?? []) as unknown as Row[];
  const keep = { status, type, q, sort: sort.id };
  const rowCan = { publish: can(access, 'resources.publish'), archive: can(access, 'resources.archive'), delete: can(access, 'resources.delete') };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Resources</h2>
          <p className="text-sm text-slate-500">Official materials and approved contributions.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SearchBox action="/admin/resources" value={q} placeholder="Search by title" hidden={{ status, type, sort: sort.id }} />
          {can(access, 'resources.create') && (
            <Link href="/admin/resources/new" className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700">
              <Plus className="h-4 w-4" /> New resource
            </Link>
          )}
        </div>
      </div>

      <FilterTabs basePath="/admin/resources" param="status" current={status} options={STATUSES.map((s) => ({ id: s, label: s[0].toUpperCase() + s.slice(1) }))} keep={{ type, q, sort: sort.id }} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
        <span>Sort:</span>
        {SORTS.map((s) => (
          <Link key={s.id} href={`/admin/resources?${new URLSearchParams({ ...keep, sort: s.id })}`} className={sort.id === s.id ? 'font-bold text-indigo-600' : 'hover:underline'}>{s.label}</Link>
        ))}
        <span className="ml-auto flex items-center gap-2">
          Type:
          <FilterTabs basePath="/admin/resources" param="type" current={type} options={[{ id: 'all', label: 'All' }, ...Object.entries(CATEGORY_LABELS).slice(0, 4).map(([id, v]) => ({ id, label: v.label }))]} keep={{ status, q, sort: sort.id }} />
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No resources match" action={can(access, 'resources.create') ? { href: '/admin/resources/new', label: 'Create the first one' } : undefined}>
          Try a different filter, or create a resource.
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 space-y-1">
                  <Link href={`/admin/resources/${r.id}`} className="flex items-center gap-2 text-sm font-semibold text-slate-900 hover:text-indigo-600 dark:text-white">
                    {r.external_url ? <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" aria-label="External link" /> : <FileText className="h-4 w-4 shrink-0 text-indigo-500" aria-label="Hosted file" />}
                    <span className="truncate">{r.title}</span>
                  </Link>
                  <p className="text-xs text-slate-500">
                    {r.subjects.code} • {r.subjects.branches.code} Sem {r.subjects.semester} • {CATEGORY_LABELS[r.resource_type]?.label} • {r.downloads_count} downloads • edited <LocalDate iso={r.updated_at} />
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={r.status === 'published' ? 'success' : r.status === 'draft' ? 'warning' : 'neutral'}>{r.status}</Badge>
                  <ResourceRowActions id={r.id} status={r.status} can={rowCan} />
                  <Link href={`/admin/resources/${r.id}`} className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Edit</Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Pagination basePath="/admin/resources" page={page} total={count ?? 0} size={ADMIN_PAGE_SIZE} params={keep} />
    </div>
  );
}
