'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Cloud, Download, Loader2, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBrowserClient } from '@/lib/supabase/client';
import { describeDbError } from '@/lib/errors';
import { attendanceStanding } from '@/lib/attendance';

export interface AttendanceSnapshot {
  attended: number;
  total: number;
  minPercent: number;
  semesterType: 'Odd' | 'Even';
}

interface Course {
  id: string;
  semester_type: 'Odd' | 'Even';
  session_label: string;
  course_name: string;
  course_code: string | null;
  attended: number;
  total: number;
  min_required_percent: number;
}

interface SavedCoursesProps {
  current: AttendanceSnapshot;
  onLoad: (snapshot: AttendanceSnapshot) => void;
}

const COLUMNS = 'id, semester_type, session_label, course_name, course_code, attended, total, min_required_percent';

/** A student's own attendance numbers, stored privately in their account (Row Level Security: own rows only). */
export function SavedCourses({ current, onLoad }: SavedCoursesProps) {
  const { status, access } = useAuth();
  const userId = access?.userId;
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [session, setSession] = useState('2026-27');

  const load = useCallback(async () => {
    const { data, error: loadErr } = await getBrowserClient()
      .from('attendance_courses')
      .select(COLUMNS)
      .order('session_label', { ascending: false })
      .order('course_name');
    if (loadErr) {
      console.error('[attendance] load failed:', loadErr.message);
      setLoadError(true);
      return;
    }
    setLoadError(false);
    setCourses((data ?? []) as Course[]);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state updates when the promise resolves
    if (userId) void load();
  }, [userId, load]);

  if (status === 'loading') return null;
  if (status !== 'signed_in' || !access) {
    return (
      <Card className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Keep your attendance across devices</h3>
            <p className="text-xs text-slate-500">Sign in to save each course&apos;s numbers privately and pick up where you left off.</p>
          </div>
        </div>
        <Link href="/login?next=/tools/attendance" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
          Sign in with Google
        </Link>
      </Card>
    );
  }

  const canWrite = access.loginAllowed;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Give the course a name.');
      return;
    }
    if (current.attended > current.total) {
      setError('Attended classes cannot be more than the total classes conducted.');
      return;
    }
    setBusyId('new');
    const { error: insertErr } = await getBrowserClient().from('attendance_courses').insert({
      user_id: access.userId,
      semester_type: current.semesterType,
      session_label: session.trim() || '2026-27',
      course_name: name.trim(),
      course_code: code.trim() || null,
      attended: current.attended,
      total: current.total,
      min_required_percent: current.minPercent,
    });
    setBusyId(null);
    if (insertErr) {
      setError(insertErr.code === '23505' ? 'You already saved a course with that name for this session. Update it instead.' : describeDbError(insertErr).message);
      return;
    }
    setName('');
    setCode('');
    await load();
  };

  const update = async (course: Course) => {
    setError(null);
    if (current.attended > current.total) {
      setError('Attended classes cannot be more than the total classes conducted.');
      return;
    }
    setBusyId(course.id);
    const { data, error: updateErr } = await getBrowserClient()
      .from('attendance_courses')
      .update({ attended: current.attended, total: current.total, min_required_percent: current.minPercent })
      .eq('id', course.id)
      .select('id');
    setBusyId(null);
    if (updateErr || !data?.length) {
      setError(updateErr ? describeDbError(updateErr).message : 'That course could not be updated.');
      return;
    }
    await load();
  };

  const remove = async (course: Course) => {
    setError(null);
    setBusyId(course.id);
    const { error: deleteErr } = await getBrowserClient().from('attendance_courses').delete().eq('id', course.id);
    setBusyId(null);
    if (deleteErr) {
      setError(describeDbError(deleteErr).message);
      return;
    }
    await load();
  };

  return (
    <Card className="space-y-5">
      <div className="flex items-start gap-3">
        <Cloud className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">My saved courses</h3>
          <p className="text-xs text-slate-500">
            Private to your account. Load a course into the calculator to see how many classes you can miss or must attend.
          </p>
        </div>
      </div>

      {loadError && <p role="alert" className="text-xs text-rose-600">Your saved courses could not be loaded. Please refresh.</p>}
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-xs text-rose-600">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      {courses === null && !loadError ? (
        <p className="flex items-center gap-2 text-xs text-slate-400"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</p>
      ) : courses && courses.length > 0 ? (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {courses.map((c) => {
            const standing = attendanceStanding(c.attended, c.total, c.min_required_percent);
            return (
              <li key={c.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {c.course_name} {c.course_code && <span className="font-mono text-xs text-slate-400">{c.course_code}</span>}
                  </p>
                  <p className="text-xs text-slate-500">
                    {c.session_label} • {c.semester_type} sem • {c.attended}/{c.total} attended ({standing.percentage.toFixed(1)}% vs {c.min_required_percent}%)
                    {' • '}
                    {c.total === 0
                      ? 'no classes logged yet'
                      : standing.satisfied
                        ? `can miss ${standing.canSkip} more`
                        : `must attend next ${standing.mustAttend} in a row`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onLoad({ attended: c.attended, total: c.total, minPercent: c.min_required_percent, semesterType: c.semester_type })}
                  >
                    <Download className="mr-1 h-3.5 w-3.5" /> Load
                  </Button>
                  <Button size="sm" variant="subtle" onClick={() => void update(c)} isLoading={busyId === c.id} disabled={!canWrite} title="Overwrite with the numbers currently in the calculator">
                    <Save className="mr-1 h-3.5 w-3.5" /> Update
                  </Button>
                  <button
                    type="button"
                    aria-label={`Delete ${c.course_name}`}
                    onClick={() => void remove(c)}
                    disabled={busyId === c.id}
                    className="rounded-lg p-2 text-slate-300 hover:text-rose-500 disabled:opacity-50 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        courses && <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-800/50">No saved courses yet. Enter your numbers above and save them below.</p>
      )}

      <form onSubmit={save} className="grid gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:grid-cols-[1fr_8rem_8rem_auto] sm:items-end">
        <div>
          <label htmlFor="att-name" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Save current numbers as</label>
          <Input id="att-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} placeholder="Course name, e.g. Data Structures" disabled={!canWrite} />
        </div>
        <div>
          <label htmlFor="att-code" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Code</label>
          <Input id="att-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={20} placeholder="CS13101" disabled={!canWrite} />
        </div>
        <div>
          <label htmlFor="att-session" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Session</label>
          <Input id="att-session" value={session} onChange={(e) => setSession(e.target.value)} maxLength={20} disabled={!canWrite} />
        </div>
        <Button type="submit" isLoading={busyId === 'new'} disabled={!canWrite}>Save course</Button>
      </form>
      {!canWrite && <p className="text-xs text-amber-700">Saving is disabled because your account is not currently permitted to write data.</p>}
    </Card>
  );
}
