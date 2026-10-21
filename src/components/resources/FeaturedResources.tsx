'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Upload } from 'lucide-react';
import type { ResourceItem } from '@/types';
import { BRANCHES } from '@/data/academicData';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getBrowserClient } from '@/lib/supabase/client';
import { fetchLatestResources } from '@/lib/data/resource-mapper';
import { ResourceCard } from './ResourceCard';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; items: ResourceItem[] }
  | { status: 'error' }
  | { status: 'unconfigured' };

/** Latest approved resources, fetched from the database with the public (RLS-limited) client. */
export function FeaturedResources() {
  const [state, setState] = useState<LoadState>(isSupabaseConfigured() ? { status: 'loading' } : { status: 'unconfigured' });
  const [branch, setBranch] = useState('all');

  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    let cancelled = false;
    fetchLatestResources(getBrowserClient(), 30)
      .then((items) => !cancelled && setState({ status: 'ready', items }))
      .catch((error: Error) => {
        console.error('[resources] featured load failed:', error.message);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => (state.status === 'ready' ? state.items : []), [state]);
  const visible = useMemo(
    () => (branch === 'all' ? items : items.filter((r) => r.branchId === branch)).slice(0, 6),
    [items, branch],
  );
  const pills = useMemo(() => BRANCHES.filter((b) => items.some((r) => r.branchId === b.id)), [items]);

  return (
    <>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full" role="group" aria-label="Filter by branch">
        {[{ id: 'all', label: `All (${items.length})` }, ...pills.map((b) => ({ id: b.id, label: b.code }))].map((pill) => (
          <button
            key={pill.id}
            onClick={() => setBranch(pill.id)}
            aria-pressed={branch === pill.id}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
              branch === pill.id
                ? pill.id === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>

      {state.status === 'loading' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5" aria-busy="true" aria-label="Loading resources">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          ))}
        </div>
      ) : state.status === 'error' || state.status === 'unconfigured' ? (
        <div role="status" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
          <AlertTriangle className="mx-auto h-7 w-7 text-amber-500" />
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {state.status === 'unconfigured' ? 'Resources are not available yet' : "We couldn't load resources right now"}
          </p>
          <p className="text-xs text-slate-500">
            {state.status === 'unconfigured'
              ? 'The backend is not configured for this deployment.'
              : 'Please refresh in a moment. Browsing by year and branch still works.'}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Nothing published here yet</p>
          <p className="text-xs text-slate-500">Be the first to share notes or papers. Moderators review every submission.</p>
          <Link href="/submit" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:underline">
            <Upload className="h-3.5 w-3.5" /> Contribute a resource
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((res) => (
            <ResourceCard key={res.id} resource={res} showSubjectBadge />
          ))}
        </div>
      )}
    </>
  );
}
