import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, EmptyState, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { FilterTabs, Pagination, SearchBox } from '@/components/admin/ListControls';
import { gate } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { ADMIN_PAGE_SIZE, likePattern, oneOf, pageRange, parsePage, sanitizeSearch } from '@/lib/admin/query';
import { ROLE_DEFAULT_PERMISSIONS, ROLE_IDS, ROLE_LABELS, summarizeCapabilities, type PermissionKey, type RoleId } from '@/lib/auth/permissions';

const SORTS = [
  { id: 'newest', label: 'Newest', column: 'created_at', ascending: false },
  { id: 'oldest', label: 'Oldest', column: 'created_at', ascending: true },
  { id: 'name', label: 'Name A–Z', column: 'full_name', ascending: true },
] as const;

type SearchParams = Promise<{ role?: string; status?: string; q?: string; sort?: string; page?: string }>;

export default function UsersPage({ searchParams }: { searchParams: SearchParams }) {
  return <Users searchParams={searchParams} />;
}

interface Row {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  account_status: 'active' | 'suspended';
  created_at: string;
  user_roles: { role_id: RoleId } | { role_id: RoleId }[] | null;
  user_permissions: { permissions: { key: PermissionKey } | null }[] | null;
}

async function Users({ searchParams }: { searchParams: SearchParams }) {
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const params = await searchParams;
  const { allowed } = await gate('/admin/users', ['users.read']);
  if (!allowed) return <AccessDenied />;

  const role = oneOf(params.role, ['all', ...ROLE_IDS] as const, 'all');
  const status = oneOf(params.status, ['all', 'active', 'suspended'] as const, 'all');
  const sort = SORTS.find((s) => s.id === params.sort) ?? SORTS[0];
  const q = sanitizeSearch(params.q);
  const pattern = likePattern(q);
  const page = parsePage(params.page);
  const [from, to] = pageRange(page);

  const supabase = await createClient();
  let query = supabase
    .from('profiles')
    .select(`id, full_name, email, avatar_url, account_status, created_at, user_roles${role !== 'all' ? '!inner' : ''}(role_id), user_permissions(permissions(key))`, { count: 'exact' })
    .order(sort.column, { ascending: sort.ascending })
    .range(from, to);
  if (role !== 'all') query = query.eq('user_roles.role_id', role);
  if (status !== 'all') query = query.eq('account_status', status);
  // q is sanitized to a small alphabet, so it cannot add extra PostgREST filter operators.
  if (pattern) query = query.or(`email.ilike.${pattern},full_name.ilike.${pattern}`);

  const { data, count, error } = await query;
  if (error) {
    console.error('[admin] users list failed:', error.message);
    return <ErrorState title="We couldn't load accounts" />;
  }
  const rows = (data ?? []) as unknown as Row[];
  const keep = { role, status, q, sort: sort.id };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Accounts</h2>
          <p className="text-sm text-slate-500">Roles, status and what each account is permitted to do.</p>
        </div>
        <SearchBox action="/admin/users" value={q} placeholder="Search name or email" hidden={{ role, status, sort: sort.id }} />
      </div>

      <FilterTabs basePath="/admin/users" param="role" current={role} options={[{ id: 'all', label: 'All roles' }, ...ROLE_IDS.map((r) => ({ id: r, label: ROLE_LABELS[r] }))]} keep={{ status, q, sort: sort.id }} />
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-slate-500">
        <FilterTabs basePath="/admin/users" param="status" current={status} options={[{ id: 'all', label: 'Any status' }, { id: 'active', label: 'Active' }, { id: 'suspended', label: 'Suspended' }]} keep={{ role, q, sort: sort.id }} />
        <span className="flex items-center gap-3">
          Sort:
          {SORTS.map((s) => (
            <Link key={s.id} href={`/admin/users?${new URLSearchParams({ ...keep, sort: s.id })}`} className={sort.id === s.id ? 'font-bold text-indigo-600' : 'hover:underline'}>{s.label}</Link>
          ))}
        </span>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No accounts match">Try a different filter or search.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => {
            const roleId = (Array.isArray(u.user_roles) ? u.user_roles[0]?.role_id : u.user_roles?.role_id) ?? 'student';
            const extras = (u.user_permissions ?? []).map((p) => p.permissions?.key).filter((k): k is PermissionKey => Boolean(k));
            const effective: PermissionKey[] = roleId === 'super_admin' ? ROLE_DEFAULT_PERMISSIONS.super_admin : [...ROLE_DEFAULT_PERMISSIONS[roleId], ...extras];
            const can = summarizeCapabilities(effective);
            return (
              <li key={u.id}>
                <Link href={`/admin/users/${u.id}`}>
                  <Card hoverEffect className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={u.full_name} email={u.email} src={u.avatar_url} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{u.full_name ?? 'Unnamed'}</p>
                        <p className="truncate text-xs text-slate-500">{u.email} • joined <LocalDate iso={u.created_at} /></p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {can.length ? `Can: ${can.join(' · ')}` : 'Can: browse and contribute'}
                          {extras.length > 0 && ` (+${extras.length} individual)`}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge variant={roleId === 'student' ? 'neutral' : 'primary'}>{ROLE_LABELS[roleId]}</Badge>
                      <Badge variant={u.account_status === 'active' ? 'success' : 'danger'}>{u.account_status}</Badge>
                    </div>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination basePath="/admin/users" page={page} total={count ?? 0} size={ADMIN_PAGE_SIZE} params={keep} />
    </div>
  );
}
