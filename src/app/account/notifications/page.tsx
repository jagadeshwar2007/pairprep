'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell, CheckCheck, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LocalDate } from '@/components/ui/LocalDate';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/PageStates';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBrowserClient } from '@/lib/supabase/client';
import type { NotificationRow } from '@/types/backend';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: NotificationRow[] };

export default function NotificationsPage() {
  const { status: authStatus, access, refresh } = useAuth();
  const userId = access?.userId;
  const [state, setState] = useState<State>({ status: 'loading' });
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await getBrowserClient()
      .from('notifications')
      .select('id, type, title, message, link, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      console.error('[notifications] load failed:', error.message);
      setState({ status: 'error' });
      return;
    }
    setState({ status: 'ready', items: (data ?? []) as NotificationRow[] });
  }, []);

  useEffect(() => {
    if (!userId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch on mount; state updates when the promise resolves
    void load();
  }, [userId, load]);

  const markRead = async (ids?: string[]) => {
    setActionError(null);
    const { error } = await getBrowserClient().rpc('mark_notifications_read', { p_ids: ids ?? null });
    if (error) {
      setActionError('Could not update your notifications. Please try again.');
      return;
    }
    await load();
    void refresh();
  };

  const remove = async (id: string) => {
    setActionError(null);
    const { error } = await getBrowserClient().from('notifications').delete().eq('id', id);
    if (error) {
      setActionError('Could not delete that notification.');
      return;
    }
    await load();
    void refresh();
  };

  if (authStatus === 'loading' || (authStatus === 'signed_in' && state.status === 'loading')) return <PageSkeleton rows={3} />;
  if (authStatus !== 'signed_in') return <ErrorState title="Sign in to see your notifications" />;
  if (state.status === 'error') return <ErrorState title="We couldn't load your notifications" />;
  if (state.status !== 'ready') return <PageSkeleton rows={3} />;

  const unread = state.items.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          <p className="text-sm text-slate-500">{unread > 0 ? `${unread} unread` : 'You are all caught up'}</p>
        </div>
        {unread > 0 && (
          <Button variant="outline" size="sm" onClick={() => void markRead()}>
            <CheckCheck className="mr-1.5 h-4 w-4" /> Mark all as read
          </Button>
        )}
      </div>

      {actionError && <p role="alert" className="text-sm text-rose-600">{actionError}</p>}

      {state.items.length === 0 ? (
        <EmptyState title="No notifications">We&apos;ll tell you here when a moderator reviews your contributions.</EmptyState>
      ) : (
        <ul className="space-y-3">
          {state.items.map((n) => (
            <li key={n.id}>
              <Card className={`flex items-start gap-3 p-4 ${n.read_at ? '' : 'border-indigo-200 bg-indigo-50/40 dark:border-indigo-900/60 dark:bg-indigo-950/20'}`}>
                <Bell className={`mt-0.5 h-4 w-4 shrink-0 ${n.read_at ? 'text-slate-300' : 'text-indigo-500'}`} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read_at ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'}`}>{n.title}</p>
                  <p className="mt-0.5 whitespace-pre-line text-sm text-slate-500">{n.message}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                    <LocalDate iso={n.created_at} withTime className="text-slate-400" />
                    {n.link && (
                      <Link href={n.link} onClick={() => !n.read_at && void markRead([n.id])} className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400">
                        Open
                      </Link>
                    )}
                    {!n.read_at && (
                      <button type="button" onClick={() => void markRead([n.id])} className="font-semibold text-slate-500 hover:underline cursor-pointer">
                        Mark as read
                      </button>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Delete notification"
                  onClick={() => void remove(n.id)}
                  className="rounded-lg p-1.5 text-slate-300 hover:text-rose-500 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
