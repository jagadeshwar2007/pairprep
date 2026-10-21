'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { grantPermission, revokePermission, setAccountStatus, setUserRole } from '@/actions/users';
import {
  ASSIGNABLE_ROLES, NON_DELEGABLE_PERMISSIONS, PERMISSION_KEYS, PERMISSION_LABELS, ROLE_DEFAULT_PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS,
  type PermissionKey, type RoleId,
} from '@/lib/auth/permissions';

interface Props {
  userId: string;
  role: RoleId;
  status: 'active' | 'suspended';
  extras: PermissionKey[];
  isSelf: boolean;
  /** What the VIEWER may do. These only decide which controls are shown; the database decides what succeeds. */
  viewer: { manageRoles: boolean; suspend: boolean; permissions: PermissionKey[] };
}

export function UserManagement({ userId, role, status, extras, isSelf, viewer }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [nextRole, setNextRole] = useState<RoleId>(role);
  const [reason, setReason] = useState('');
  const isOwner = role === 'super_admin';

  const run = (task: () => Promise<{ ok: boolean; message?: string; error?: string }>) =>
    start(async () => {
      setMessage(null);
      const result = await task();
      setMessage({ ok: result.ok, text: (result.ok ? result.message : result.error) ?? (result.ok ? 'Saved.' : 'Something went wrong.') });
      if (result.ok) router.refresh();
    });

  // Individual grants a viewer may hand out: delegable, not already covered by the role, and held by the viewer.
  const grantable = PERMISSION_KEYS.filter(
    (k) => !NON_DELEGABLE_PERMISSIONS.includes(k) && !ROLE_DEFAULT_PERMISSIONS[role].includes(k) && viewer.permissions.includes(k),
  );
  const canGrantToThisUser = viewer.manageRoles && !isOwner && !isSelf && (role === 'file_moderator' || role === 'content_admin') && status === 'active';

  return (
    <div className="space-y-6">
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`flex items-start gap-2 rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'}`}>
          {message.ok ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}
          {message.text}
        </p>
      )}

      {viewer.manageRoles && (
        <section aria-labelledby="role-heading" className="space-y-3">
          <h3 id="role-heading" className="text-sm font-bold text-slate-900 dark:text-white">Role</h3>
          {isOwner ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
              This is the single super admin. Ownership only moves through <strong>Settings → Transfer ownership</strong>.
            </p>
          ) : isSelf ? (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">You can&apos;t change your own role.</p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-64 max-w-full">
                  <label htmlFor="role-select" className="sr-only">Role</label>
                  <Select id="role-select" value={nextRole} onChange={(e) => setNextRole(e.target.value as RoleId)}>
                    {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </Select>
                </div>
                <Button onClick={() => run(() => setUserRole({ userId, role: nextRole }))} disabled={pending || nextRole === role} isLoading={pending}>Save role</Button>
              </div>
              <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[nextRole]}</p>
              {nextRole === 'student' && role !== 'student' && <p className="text-xs text-amber-700 dark:text-amber-300">Demoting to Student also removes all individual permissions.</p>}
            </div>
          )}
        </section>
      )}

      {viewer.manageRoles && (
        <section aria-labelledby="perm-heading" className="space-y-3">
          <h3 id="perm-heading" className="text-sm font-bold text-slate-900 dark:text-white">Individual permissions</h3>
          {!canGrantToThisUser ? (
            <p className="text-xs text-slate-500">
              {isOwner ? 'The super admin already holds every permission.' : isSelf ? 'You can\'t change your own permissions.' : status !== 'active' ? 'Reactivate this account first.' : 'Assign a Moderator or Content Administrator role first; students don\'t take individual permissions.'}
            </p>
          ) : (
            <>
              <p className="text-xs text-slate-500">
                Extras on top of the role. You can only grant permissions you hold yourself, and never role management or settings.
              </p>
              <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                {extras.map((k) => (
                  <li key={k} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span><code className="text-xs">{k}</code> <span className="text-slate-500">{PERMISSION_LABELS[k]}</span></span>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => revokePermission({ userId, permission: k }))}>Revoke</Button>
                  </li>
                ))}
                {grantable.map((k) => (
                  <li key={k} className="flex items-center justify-between gap-3 p-3 text-sm">
                    <span><code className="text-xs">{k}</code> <span className="text-slate-500">{PERMISSION_LABELS[k]}</span></span>
                    <Button size="sm" variant="subtle" disabled={pending} onClick={() => run(() => grantPermission({ userId, permission: k }))}>Grant</Button>
                  </li>
                ))}
                {extras.length === 0 && grantable.length === 0 && <li className="p-3 text-xs text-slate-500">Nothing further can be granted.</li>}
              </ul>
            </>
          )}
        </section>
      )}

      {viewer.suspend && (
        <section aria-labelledby="status-heading" className="space-y-3">
          <h3 id="status-heading" className="text-sm font-bold text-slate-900 dark:text-white">Account status</h3>
          {isOwner || isSelf ? (
            <p className="text-xs text-slate-500">{isOwner ? 'The super admin account can\'t be suspended.' : 'You can\'t change your own status.'}</p>
          ) : status === 'active' ? (
            <div className="space-y-2">
              <label htmlFor="suspend-reason" className="block text-xs font-semibold text-slate-700 dark:text-slate-300">Reason (required, kept in the audit log)</label>
              <textarea id="suspend-reason" rows={2} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-900" />
              <Button variant="danger" disabled={pending || reason.trim().length < 3} isLoading={pending} onClick={() => run(() => setAccountStatus({ userId, status: 'suspended', reason }))}>
                Suspend account
              </Button>
              <p className="text-xs text-slate-500">Suspended accounts lose all write access immediately and cannot sign in again.</p>
            </div>
          ) : (
            <Button onClick={() => run(() => setAccountStatus({ userId, status: 'active' }))} isLoading={pending}>Reactivate account</Button>
          )}
        </section>
      )}
    </div>
  );
}
