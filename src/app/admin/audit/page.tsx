import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, EmptyState, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { FilterTabs, Pagination, SearchBox } from '@/components/admin/ListControls';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { oneOf, pageRange, parsePage, sanitizeSearch } from '@/lib/admin/query';
import type { AuditRow } from '@/types/backend';

const PAGE_SIZE = 25;
const GROUPS = [
  { id: 'all', label: 'Everything', prefix: '' },
  { id: 'contribution', label: 'Moderation', prefix: 'contribution.' },
  { id: 'resource', label: 'Resources', prefix: 'resource.' },
  { id: 'user', label: 'Accounts', prefix: 'user.' },
  { id: 'role', label: 'Roles', prefix: 'role.' },
  { id: 'permission', label: 'Permissions', prefix: 'permission.' },
  { id: 'super_admin', label: 'Ownership', prefix: 'super_admin.' },
  { id: 'setting', label: 'Settings', prefix: 'setting.' },
  { id: 'storage', label: 'Storage', prefix: 'storage.' },
] as const;

type SearchParams = Promise<{ group?: string; q?: string; page?: string }>;

export default function AuditPage({ searchParams }: { searchParams: SearchParams }) {
  return <Audit searchParams={searchParams} />;
}

async function Audit({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const { allowed, access } = await gate('/admin/audit', ['audit.read']);
  if (!allowed) return <AccessDenied />;

  const group = GROUPS.find((g) => g.id === oneOf(params.group, GROUPS.map((g) => g.id), 'all')) ?? GROUPS[0];
  const q = sanitizeSearch(params.q);
  const page = parsePage(params.page);
  const [from, to] = pageRange(page, PAGE_SIZE);

  const supabase = await createClient();
  let query = supabase
    .from('audit_logs')
    .select('id, actor_id, action, target_type, target_id, metadata, created_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(from, to);
  if (group.prefix) query = query.like('action', `${group.prefix}%`);
  // Search by the full id of the target or actor (uuid); anything else is ignored.
  if (/^[0-9a-f-]{36}$/i.test(q)) query = query.or(`target_id.eq.${q},actor_id.eq.${q}`);

  const { data, count, error } = await query;
  if (error) {
    console.error('[admin] audit failed:', error.message);
    return <ErrorState title="We couldn't load the audit log" />;
  }
  const rows = (data ?? []) as AuditRow[];

  // Resolve actor names where this viewer is allowed to read profiles.
  const names = new Map<string, string>();
  const actorIds = [...new Set(rows.map((r) => r.actor_id).filter((x): x is string => Boolean(x)))];
  if (actorIds.length && can(access, 'users.read')) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', actorIds);
    for (const p of profiles ?? []) names.set(p.id as string, (p.full_name as string | null) || (p.email as string));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Audit log</h2>
          <p className="text-sm text-slate-500">Append-only record of privileged actions. Entries cannot be edited or deleted.</p>
        </div>
        <SearchBox action="/admin/audit" value={q} placeholder="Filter by user or target id" hidden={{ group: group.id }} />
      </div>

      <FilterTabs basePath="/admin/audit" param="group" current={group.id} options={GROUPS.map((g) => ({ id: g.id, label: g.label }))} keep={{ q }} />

      {rows.length === 0 ? (
        <EmptyState title="No matching entries" />
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400 dark:border-slate-800">
              <tr>
                <th scope="col" className="px-4 py-3 font-semibold">When</th>
                <th scope="col" className="px-4 py-3 font-semibold">Action</th>
                <th scope="col" className="px-4 py-3 font-semibold">By</th>
                <th scope="col" className="px-4 py-3 font-semibold">Target</th>
                <th scope="col" className="px-4 py-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500"><LocalDate iso={r.created_at} withTime /></td>
                  <td className="px-4 py-3"><code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">{r.action}</code></td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    {r.actor_id ? (names.get(r.actor_id) ?? `${r.actor_id.slice(0, 8)}…`) : <span className="text-slate-400">system</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                    {r.target_type}
                    {r.target_id && <span className="block font-mono text-[11px] text-slate-400">{r.target_id.length > 12 ? `${r.target_id.slice(0, 8)}…` : r.target_id}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {Object.keys(r.metadata ?? {}).length > 0 ? (
                      <details>
                        <summary className="cursor-pointer text-indigo-600 dark:text-indigo-400">View</summary>
                        <pre className="mt-1 max-w-xs overflow-x-auto whitespace-pre-wrap rounded bg-slate-50 p-2 text-[11px] dark:bg-slate-800/60">{JSON.stringify(r.metadata, null, 2)}</pre>
                      </details>
                    ) : (
                      <span className="text-slate-300">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination basePath="/admin/audit" page={page} total={count ?? 0} size={PAGE_SIZE} params={{ group: group.id, q }} />
    </div>
  );
}
