'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Table, Td, Th } from '@/components/ui/Table';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { Field } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { api } from '@/lib/api/client';
import { DEPARTMENTS, ROLE_LABELS, departmentLabel } from '@/lib/resources/constants';
import type { UserProfile } from '@/lib/resources/types';

function RoleEditor({ user, onClose, onSaved }: { user: UserProfile; onClose(): void; onSaved(): void }) {
  const toast = useToast();
  const [role, setRole] = useState<'student' | 'reviewer'>(user.role === 'reviewer' ? 'reviewer' : 'student');
  const [departments, setDepartments] = useState<string[]>(user.reviewerScope.departments);
  const [subjects, setSubjects] = useState(user.reviewerScope.subjects.join(', '));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/admin/users/${user.uid}`, {
        method: 'PATCH',
        body: {
          role,
          reviewerScope:
            role === 'reviewer'
              ? { departments, subjects: subjects.split(',').map((s) => s.trim()).filter(Boolean) }
              : undefined,
        },
      });
      toast(role === 'reviewer' ? `${user.displayName} can now review` : `Reviewer access removed for ${user.displayName}`, 'success');
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Permissions for ${user.displayName}`} description={user.email ?? undefined} maxWidth="lg">
      <div className="space-y-4">
        <Field label="Role" htmlFor="role">
          <Select id="role" value={role} onChange={(e) => setRole(e.target.value as 'student' | 'reviewer')}>
            <option value="student">Student (can submit)</option>
            <option value="reviewer">Reviewer (can review assigned resources)</option>
          </Select>
        </Field>
        {role === 'reviewer' && (
          <>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700 dark:text-slate-300">Departments they may review</legend>
              <p className="text-xs text-slate-500">Leave all unticked to allow every department.</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {DEPARTMENTS.map((d) => (
                  <label key={d.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300"
                      checked={departments.includes(d.id)}
                      onChange={(e) => setDepartments((p) => (e.target.checked ? [...p, d.id] : p.filter((x) => x !== d.id)))}
                    />
                    {d.code}
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label="Subjects they may review" htmlFor="subjects" hint="Comma-separated names or codes. Leave empty to allow every subject.">
              <Input id="subjects" value={subjects} onChange={(e) => setSubjects(e.target.value)} placeholder="e.g. CS13101, Engineering Physics" />
            </Field>
          </>
        )}
        <p className="text-xs text-slate-500">
          Administrator access cannot be granted here. It is assigned with the server-side <code>npm run set-admin</code> script.
        </p>
        {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
        <div className="flex gap-2">
          <Button variant="primary" isLoading={busy} onClick={save}>Save</Button>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </Modal>
  );
}

export function UsersPanel() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<UserProfile[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<UserProfile | null>(null);

  const load = useCallback(() => {
    api<{ items: UserProfile[] }>('/api/admin/users')
      .then((d) => setUsers(d.items))
      .catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);

  if (error) return <EmptyState tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Users could not be loaded" description={error} />;
  if (!users) return <Skeleton className="h-64 w-full" />;

  const needle = q.trim().toLowerCase();
  const shown = needle ? users.filter((u) => `${u.displayName} ${u.email}`.toLowerCase().includes(needle)) : users;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-slate-500">{users.length} registered users. Users appear here after they sign in for the first time.</p>
        <div className="sm:w-72">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users" icon={<Search className="h-4 w-4" />} />
        </div>
      </div>
      <Table>
        <thead>
          <tr>
            <Th>User</Th>
            <Th>Role</Th>
            <Th className="hidden md:table-cell">Review scope</Th>
            <Th className="hidden sm:table-cell">Joined</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {shown.map((u) => (
            <tr key={u.uid}>
              <Td>
                <p className="font-medium text-slate-900 dark:text-white">{u.displayName}{u.uid === me?.uid ? ' (you)' : ''}</p>
                <p className="text-xs text-slate-500 break-all">{u.email}</p>
              </Td>
              <Td>
                <Badge size="sm" variant={u.role === 'admin' ? 'primary' : u.role === 'reviewer' ? 'success' : 'neutral'}>{ROLE_LABELS[u.role]}</Badge>
              </Td>
              <Td className="hidden md:table-cell text-xs text-slate-500">
                {u.role === 'reviewer'
                  ? [
                      u.reviewerScope.departments.length ? u.reviewerScope.departments.map(departmentLabel).join(', ') : 'All departments',
                      u.reviewerScope.subjects.length ? u.reviewerScope.subjects.join(', ') : 'all subjects',
                    ].join(' · ')
                  : u.role === 'admin'
                    ? 'Everything'
                    : '–'}
              </Td>
              <Td className="hidden sm:table-cell text-xs text-slate-500 whitespace-nowrap">{new Date(u.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</Td>
              <Td className="text-right">
                {u.role !== 'admin' && u.uid !== me?.uid && (
                  <Button variant="outline" size="sm" onClick={() => setEditing(u)}>Permissions</Button>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {editing && <RoleEditor user={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
