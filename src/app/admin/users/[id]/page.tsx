import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { Check, Minus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/ui/Avatar';
import { LocalDate } from '@/components/ui/LocalDate';
import { AccessDenied, ErrorState, SetupNotice } from '@/components/ui/PageStates';
import { UserManagement } from '@/components/admin/UserManagement';
import { gate } from '@/lib/auth/session';
import { can } from '@/lib/auth/permissions';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { createClient } from '@/lib/supabase/server';
import { PERMISSION_KEYS, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS, ROLE_LABELS, type PermissionKey, type RoleId } from '@/lib/auth/permissions';
import type { AuditRow } from '@/types/backend';

type Params = Promise<{ id: string }>;

export default function UserDetailPage({ params }: { params: Params }) {
  return <UserDetail params={params} />;
}

interface Row {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  account_status: 'active' | 'suspended';
  suspended_at: string | null;
  suspension_reason: string | null;
  created_at: string;
  user_roles: { role_id: RoleId; assigned_at: string } | { role_id: RoleId; assigned_at: string }[] | null;
  user_permissions: { granted_at: string; permissions: { key: PermissionKey } | null }[] | null;
}

async function UserDetail({ params }: { params: Params }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  if (!isSupabaseConfigured()) return <SetupNotice />;
  const { allowed, access } = await gate(`/admin/users/${id}`, ['users.read']);
  if (!allowed) return <AccessDenied />;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url, account_status, suspended_at, suspension_reason, created_at, user_roles(role_id, assigned_at), user_permissions(granted_at, permissions(key))')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    console.error('[admin] user load failed:', error.message);
    return <ErrorState title="We couldn't load this account" />;
  }
  if (!data) notFound();
  const u = data as unknown as Row;
  const role = (Array.isArray(u.user_roles) ? u.user_roles[0]?.role_id : u.user_roles?.role_id) ?? 'student';
  const extras = (u.user_permissions ?? []).map((p) => p.permissions?.key).filter((k): k is PermissionKey => Boolean(k));
  const effective = new Set<PermissionKey>(role === 'super_admin' ? PERMISSION_KEYS : [...ROLE_DEFAULT_PERMISSIONS[role], ...extras]);

  const [{ count: contributionCount }, audit] = await Promise.all([
    supabase.from('contributions').select('id', { count: 'exact', head: true }).eq('submitted_by', id),
    can(access, 'audit.read')
      ? supabase.from('audit_logs').select('id, actor_id, action, target_type, target_id, metadata, created_at').eq('target_id', id).order('created_at', { ascending: false }).limit(10)
      : Promise.resolve({ data: [] as AuditRow[], error: null }),
  ]);

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">← All accounts</Link>

      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Avatar name={u.full_name} email={u.email} src={u.avatar_url} className="h-14 w-14 text-base" />
          <div className="min-w-0">
            <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">{u.full_name ?? 'Unnamed'}</h2>
            <p className="truncate text-sm text-slate-500">{u.email}</p>
            <p className="text-xs text-slate-400">Joined <LocalDate iso={u.created_at} /> • {contributionCount ?? 0} contributions</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant={role === 'student' ? 'neutral' : 'primary'}>{ROLE_LABELS[role]}</Badge>
          <Badge variant={u.account_status === 'active' ? 'success' : 'danger'}>{u.account_status}</Badge>
        </div>
      </Card>

      {u.account_status === 'suspended' && (
        <p role="note" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
          Suspended {u.suspended_at && <LocalDate iso={u.suspended_at} withTime />}. Reason: {u.suspension_reason ?? 'not recorded'}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">What this account can do</h3>
          <ul className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
            {PERMISSION_KEYS.map((k) => {
              const has = effective.has(k) && u.account_status === 'active';
              const fromRole = ROLE_DEFAULT_PERMISSIONS[role].includes(k) || role === 'super_admin';
              return (
                <li key={k} className="flex items-center justify-between gap-3 py-2">
                  <span className={has ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'}>
                    {PERMISSION_LABELS[k]} <code className="text-[10px] text-slate-400">{k}</code>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-xs">
                    {has ? <Check className="h-4 w-4 text-emerald-500" aria-label="Allowed" /> : <Minus className="h-4 w-4 text-slate-300" aria-label="Not allowed" />}
                    {has && <span className="text-slate-400">{fromRole ? 'role' : 'individual'}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card>
            <UserManagement
              userId={u.id}
              role={role}
              status={u.account_status}
              extras={extras}
              isSelf={u.id === access.userId}
              viewer={{ manageRoles: can(access, 'roles.manage'), suspend: can(access, 'users.suspend'), permissions: access.permissions }}
            />
            {!can(access, 'roles.manage') && !can(access, 'users.suspend') && (
              <p className="text-sm text-slate-500">You can view this account but not change it.</p>
            )}
          </Card>

          {can(access, 'audit.read') && (
            <Card>
              <h3 className="mb-3 text-sm font-bold text-slate-900 dark:text-white">Recent changes to this account</h3>
              {((audit.data ?? []) as AuditRow[]).length === 0 ? (
                <p className="text-sm text-slate-500">Nothing recorded.</p>
              ) : (
                <ul className="space-y-2 text-xs">
                  {((audit.data ?? []) as AuditRow[]).map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 dark:bg-slate-800">{a.action}</code>
                      <LocalDate iso={a.created_at} withTime className="text-slate-400" />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
