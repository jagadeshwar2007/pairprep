'use client';

import React, { useEffect, useState } from 'react';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { EmptyState, ErrorState, PageSkeleton } from '@/components/ui/PageStates';
import { useAuth } from '@/components/auth/AuthProvider';
import { getBrowserClient } from '@/lib/supabase/client';
import { RESOURCE_SELECT, toResourceItem } from '@/lib/data/resource-mapper';
import type { ResourceItem } from '@/types';

type State = { status: 'loading' } | { status: 'error' } | { status: 'ready'; items: ResourceItem[] };

export default function BookmarksPage() {
  const { status: authStatus, access } = useAuth();
  const userId = access?.userId;
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    // Row Level Security returns only this student's bookmarks, and only for resources that are still published.
    void getBrowserClient()
      .from('bookmarks')
      .select(`created_at, resources!inner(${RESOURCE_SELECT})`)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('[bookmarks] page load failed:', error.message);
          setState({ status: 'error' });
          return;
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setState({ status: 'ready', items: (data ?? []).map((row: any) => toResourceItem(row.resources)) });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (authStatus === 'loading' || (authStatus === 'signed_in' && state.status === 'loading')) return <PageSkeleton rows={3} />;
  if (authStatus !== 'signed_in') return <ErrorState title="Sign in to see your bookmarks" />;
  if (state.status === 'error') return <ErrorState title="We couldn't load your bookmarks" />;
  if (state.status !== 'ready') return <PageSkeleton rows={3} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Bookmarks</h1>
        <p className="text-sm text-slate-500">Saved to your account, so they follow you to any device.</p>
      </div>
      {state.items.length === 0 ? (
        <EmptyState title="No bookmarks yet" action={{ href: '/resources', label: 'Browse resources' }}>
          Tap the bookmark icon on any resource to save it here.
        </EmptyState>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {state.items.map((item) => (
            <ResourceCard key={item.id} resource={item} />
          ))}
        </div>
      )}
    </div>
  );
}
