'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Avatar } from '@/components/ui/Avatar';
import { ErrorState, PageSkeleton } from '@/components/ui/PageStates';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBrowserClient } from '@/lib/supabase/client';
import { ACADEMIC_YEARS, BRANCHES } from '@/data/academicData';
import { describeDbError } from '@/lib/errors';

const label = 'block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5';

interface Prefs {
  exists: boolean;
  branchSlug: string;
  year: string;
  semester: string;
}

export default function SettingsPage() {
  const { status, access, refresh } = useAuth();
  const userId = access?.userId;
  const [name, setName] = useState('');
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [branchIds, setBranchIds] = useState<Record<string, string>>({});
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState<'profile' | 'prefs' | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    const supabase = getBrowserClient();
    void Promise.all([
      supabase.from('profiles').select('full_name').eq('id', userId).maybeSingle(),
      supabase.from('user_preferences').select('default_branch_id, default_academic_year, default_semester').eq('user_id', userId).maybeSingle(),
      supabase.from('branches').select('id, slug'),
    ]).then(([profile, preferences, branches]) => {
      if (cancelled) return;
      if (profile.error || preferences.error || branches.error) {
        console.error('[settings] load failed:', profile.error?.message ?? preferences.error?.message ?? branches.error?.message);
        setLoadError(true);
        return;
      }
      const idBySlug = Object.fromEntries((branches.data ?? []).map((b) => [b.slug as string, b.id as string]));
      const slugById = Object.fromEntries((branches.data ?? []).map((b) => [b.id as string, b.slug as string]));
      setBranchIds(idBySlug);
      setName((profile.data?.full_name as string | null) ?? '');
      const p = preferences.data;
      setPrefs({
        exists: Boolean(p),
        branchSlug: p?.default_branch_id ? (slugById[p.default_branch_id as string] ?? '') : '',
        year: (p?.default_academic_year as string | null) ?? '',
        semester: p?.default_semester ? String(p.default_semester) : '',
      });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (status === 'loading' || (status === 'signed_in' && !prefs && !loadError)) return <PageSkeleton rows={2} />;
  if (status !== 'signed_in' || !access) return <ErrorState title="Sign in to manage your profile" />;
  if (loadError || !prefs) return <ErrorState title="We couldn't load your settings" />;

  const canWrite = access.loginAllowed;
  const yearSemesters = ACADEMIC_YEARS.find((y) => y.id === prefs.year)?.semesters ?? [1, 2, 3, 4, 5, 6, 7, 8];

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('profile');
    setMessage(null);
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 120) {
      setMessage({ kind: 'error', text: 'Your name must be between 1 and 120 characters.' });
      setSaving(null);
      return;
    }
    // Only full_name is writable: the database grants no UPDATE on email, avatar or status.
    const { data, error } = await getBrowserClient().from('profiles').update({ full_name: trimmed }).eq('id', access.userId).select('id');
    setSaving(null);
    if (error || !data?.length) {
      setMessage({ kind: 'error', text: error ? describeDbError(error).message : 'Your account cannot be edited right now.' });
      return;
    }
    setMessage({ kind: 'ok', text: 'Profile saved.' });
    void refresh();
  };

  const savePrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving('prefs');
    setMessage(null);
    const row = {
      default_branch_id: prefs.branchSlug ? (branchIds[prefs.branchSlug] ?? null) : null,
      default_academic_year: prefs.year || null,
      default_semester: prefs.semester ? Number(prefs.semester) : null,
    };
    const supabase = getBrowserClient();
    // Explicit insert-or-update (an upsert would also try to rewrite user_id, which is not writable).
    const { error } = prefs.exists
      ? await supabase.from('user_preferences').update(row).eq('user_id', access.userId)
      : await supabase.from('user_preferences').insert({ ...row, user_id: access.userId });
    setSaving(null);
    if (error) {
      setMessage({ kind: 'error', text: describeDbError(error).message });
      return;
    }
    setPrefs({ ...prefs, exists: true });
    setMessage({ kind: 'ok', text: 'Preferences saved.' });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Profile &amp; preferences</h1>

      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`flex items-center gap-2 rounded-xl p-3 text-sm ${
            message.kind === 'ok'
              ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
              : 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
          }`}
        >
          {message.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {message.text}
        </p>
      )}

      <Card>
        <form onSubmit={saveProfile} className="space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Profile</h2>
          <div className="flex items-center gap-4">
            <Avatar name={name} email={access.email} src={access.avatarUrl} className="h-16 w-16 text-lg" />
            <p className="text-xs text-slate-500">Your picture and email come from your Google account and can&apos;t be edited here.</p>
          </div>
          <div>
            <label htmlFor="s-name" className={label}>Display name</label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required disabled={!canWrite} />
          </div>
          <div>
            <label htmlFor="s-email" className={label}>Email</label>
            <Input id="s-email" value={access.email} readOnly disabled />
          </div>
          <Button type="submit" isLoading={saving === 'profile'} disabled={!canWrite}>Save profile</Button>
        </form>
      </Card>

      <Card>
        <form onSubmit={savePrefs} className="space-y-5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Study preferences</h2>
          <p className="text-xs text-slate-500">Used to pre-fill forms such as Contribute. Stored in your account, not this browser.</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="p-branch" className={label}>Branch</label>
              <Select id="p-branch" value={prefs.branchSlug} onChange={(e) => setPrefs({ ...prefs, branchSlug: e.target.value })} disabled={!canWrite}>
                <option value="">Not set</option>
                {BRANCHES.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} - {b.name}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="p-year" className={label}>Year</label>
              <Select id="p-year" value={prefs.year} onChange={(e) => setPrefs({ ...prefs, year: e.target.value, semester: '' })} disabled={!canWrite}>
                <option value="">Not set</option>
                {ACADEMIC_YEARS.map((y) => (
                  <option key={y.id} value={y.id}>{y.title}</option>
                ))}
              </Select>
            </div>
            <div>
              <label htmlFor="p-sem" className={label}>Semester</label>
              <Select id="p-sem" value={prefs.semester} onChange={(e) => setPrefs({ ...prefs, semester: e.target.value })} disabled={!canWrite}>
                <option value="">Not set</option>
                {yearSemesters.map((n) => (
                  <option key={n} value={n}>Semester {n}</option>
                ))}
              </Select>
            </div>
          </div>
          <Button type="submit" isLoading={saving === 'prefs'} disabled={!canWrite}>Save preferences</Button>
        </form>
      </Card>

      <Card className="text-sm text-slate-600 dark:text-slate-300">
        <h2 className="mb-1 text-base font-bold text-slate-900 dark:text-white">Your data</h2>
        Your bookmarks, notifications, contributions and <Link href="/tools/attendance" className="font-semibold text-indigo-600 hover:underline">saved attendance</Link>{' '}
        are private to your account. Only you (and, for contributions awaiting review, permitted moderators) can read them.
      </Card>
    </div>
  );
}
