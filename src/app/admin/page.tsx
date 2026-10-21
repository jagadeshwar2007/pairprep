'use client';

import React, { useState } from 'react';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { AdminOverview } from '@/components/admin/AdminOverview';
import { AdminResources, type ResourceFilters } from '@/components/admin/AdminResources';
import { RegisterResource } from '@/components/admin/RegisterResource';
import { ImportPanel } from '@/components/admin/ImportPanel';
import { UsersPanel } from '@/components/admin/UsersPanel';
import { CalendarAdminInfo } from '@/components/admin/CalendarAdminInfo';
import { cn } from '@/lib/utils';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'queue', label: 'Review queue' },
  { id: 'resources', label: 'All resources' },
  { id: 'register', label: 'Register file' },
  { id: 'import', label: 'Import folder' },
  { id: 'users', label: 'Users & roles' },
  { id: 'calendar', label: 'Calendar' },
] as const;
type Tab = (typeof TABS)[number]['id'];

function AdminDashboard() {
  const [tab, setTab] = useState<Tab>('overview');
  const [filters, setFilters] = useState<ResourceFilters>({});
  const [filterKey, setFilterKey] = useState(0);

  const openResources = (f: ResourceFilters) => {
    setFilters(f);
    setFilterKey((k) => k + 1);
    setTab('resources');
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Admin dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Register Drive resources, route them to reviewers and publish approved material.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'px-3 py-2 text-sm font-medium whitespace-nowrap border-b-2 -mb-px cursor-pointer',
              tab === t.id
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && <AdminOverview onOpen={openResources} />}
      {tab === 'queue' && (
        <div className="space-y-10">
          <AdminResources key="pending" title="Waiting for a reviewer" initialFilters={{ verificationStatus: 'pending' }} />
          <AdminResources key="review" title="Under review" initialFilters={{ verificationStatus: 'under_review' }} />
          <AdminResources key="approved" title="Approved, ready to publish" initialFilters={{ verificationStatus: 'approved', publicationStatus: 'draft' }} />
        </div>
      )}
      {tab === 'resources' && <AdminResources key={filterKey} initialFilters={filters} />}
      {tab === 'register' && <RegisterResource onRegistered={(r) => openResources({ q: r.title })} />}
      {tab === 'import' && <ImportPanel />}
      {tab === 'users' && <UsersPanel />}
      {tab === 'calendar' && <CalendarAdminInfo />}
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth roles={['admin']}>
      <AdminDashboard />
    </RequireAuth>
  );
}
