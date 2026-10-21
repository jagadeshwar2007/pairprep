'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, FileText, Upload } from 'lucide-react';
import { Subject } from '@/types';
import { ResourceCard, ResourceCardSkeleton } from '@/components/resources/ResourceCard';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { api } from '@/lib/api/client';
import { RESOURCE_TYPE_INFO } from '@/lib/resources/constants';
import type { Paginated, PublicResource, ResourceType } from '@/lib/resources/types';

interface SubjectResourceViewProps {
  subject: Subject;
}

/** Published resources for one catalogued subject, matched by subject code. */
export function SubjectResourceView({ subject }: SubjectResourceViewProps) {
  const [items, setItems] = useState<PublicResource[] | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ResourceType | 'all'>('all');

  useEffect(() => {
    const qs = new URLSearchParams({ subject: subject.code, semester: String(subject.semester), pageSize: '48' });
    api<Paginated<PublicResource>>(`/api/resources?${qs}`, { auth: false })
      .then((r) => {
        setItems(r.items);
        setTotal(r.total);
      })
      .catch((e: Error) => setError(e.message));
  }, [subject.code, subject.semester]);

  const types = useMemo(() => {
    const present = new Set((items ?? []).map((r) => r.resourceType));
    return (Object.keys(RESOURCE_TYPE_INFO) as ResourceType[]).filter((t) => present.has(t));
  }, [items]);

  const visible = (items ?? []).filter((r) => selected === 'all' || r.resourceType === selected);
  const libraryLink = `/library?subject=${encodeURIComponent(subject.code)}&semester=${subject.semester}`;

  if (error) {
    return <EmptyState tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Resources could not be loaded" description={error} />;
  }

  if (items === null) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }, (_, i) => <ResourceCardSkeleton key={i} />)}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-6 w-6" />}
        title={`No published resources for ${subject.code} yet`}
        description={`If you have notes or question papers for ${subject.name} in Google Drive, submit them for review.`}
        action={
          <Link href="/submit">
            <Button variant="primary" size="sm"><Upload className="h-3.5 w-3.5" /> Submit a resource</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['all', ...types] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelected(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap border cursor-pointer ${
                selected === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {t === 'all' ? `All (${items.length})` : `${RESOURCE_TYPE_INFO[t].label} (${items.filter((r) => r.resourceType === t).length})`}
            </button>
          ))}
        </div>
        <Link href={libraryLink} className="text-xs font-medium text-indigo-600 hover:underline">
          {total > items.length ? `See all ${total} in the library →` : 'Open in library →'}
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visible.map((r) => <ResourceCard key={r.id} resource={r} />)}
      </div>
    </div>
  );
}
