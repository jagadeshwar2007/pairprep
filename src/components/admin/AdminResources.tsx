'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Inbox, Search } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, Td, Th } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { PublicationBadge, VerificationBadge } from '@/components/ui/StatusBadge';
import { ResourceManageModal } from './ResourceManageModal';
import { api } from '@/lib/api/client';
import {
  DEPARTMENTS,
  PUBLICATION_STATUS_INFO,
  RESOURCE_TYPE_INFO,
  VERIFICATION_STATUS_INFO,
  departmentLabel,
} from '@/lib/resources/constants';
import type { Paginated, Resource } from '@/lib/resources/types';

export interface ResourceFilters {
  q?: string;
  verificationStatus?: string;
  publicationStatus?: string;
  department?: string;
}

export function AdminResources({ initialFilters = {}, title }: { initialFilters?: ResourceFilters; title?: string }) {
  const [filters, setFilters] = useState<ResourceFilters>(initialFilters);
  const [q, setQ] = useState(initialFilters.q ?? '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Paginated<Resource> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), pageSize: '20' });
    for (const [k, v] of Object.entries(filters)) if (v) qs.set(k, v);
    api<Paginated<Resource>>(`/api/admin/resources?${qs}`)
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [filters, page]);

  useEffect(load, [load]);

  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === (q.trim() || undefined) ? f : { ...f, q: q.trim() || undefined }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const setFilter = (k: keyof ResourceFilters, v: string) => {
    setFilters((f) => ({ ...f, [k]: v || undefined }));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {title && <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, subject, file name" aria-label="Search resources" icon={<Search className="h-4 w-4" />} />
        <Select aria-label="Verification status" value={filters.verificationStatus ?? ''} onChange={(e) => setFilter('verificationStatus', e.target.value)}>
          <option value="">Any review status</option>
          {Object.entries(VERIFICATION_STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select aria-label="Publication status" value={filters.publicationStatus ?? ''} onChange={(e) => setFilter('publicationStatus', e.target.value)}>
          <option value="">Any publication status</option>
          {Object.entries(PUBLICATION_STATUS_INFO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </Select>
        <Select aria-label="Department" value={filters.department ?? ''} onChange={(e) => setFilter('department', e.target.value)}>
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </div>

      {error ? (
        <EmptyState tone="error" icon={<AlertTriangle className="h-6 w-6" />} title="Resources could not be loaded" description={error} />
      ) : !data ? (
        <Skeleton className="h-64 w-full" />
      ) : data.items.length === 0 ? (
        <EmptyState icon={<Inbox className="h-6 w-6" />} title="No resources match" description="Register a Drive file or import a folder to get started." />
      ) : (
        <>
          <Table>
            <thead>
              <tr>
                <Th>Resource</Th>
                <Th className="hidden md:table-cell">Type</Th>
                <Th>Review</Th>
                <Th className="hidden sm:table-cell">Library</Th>
                <Th className="hidden lg:table-cell">Source</Th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer" onClick={() => setOpenId(r.id)}>
                  <Td>
                    <button className="text-left font-medium text-slate-900 dark:text-white hover:text-indigo-600 cursor-pointer" onClick={() => setOpenId(r.id)}>
                      {r.title}
                    </button>
                    <p className="text-xs text-slate-500">
                      {r.subject} · {departmentLabel(r.department)} · Sem {r.semester}
                    </p>
                  </Td>
                  <Td className="hidden md:table-cell text-xs">{RESOURCE_TYPE_INFO[r.resourceType].shortLabel}</Td>
                  <Td><VerificationBadge status={r.verificationStatus} /></Td>
                  <Td className="hidden sm:table-cell"><PublicationBadge status={r.publicationStatus} /></Td>
                  <Td className="hidden lg:table-cell text-xs text-slate-500">
                    {r.source === 'contribution' ? `Submitted by ${r.uploaderName}` : r.source === 'import' ? 'Folder import' : `Registered by ${r.uploaderName}`}
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
          <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onChange={setPage} />
        </>
      )}

      {openId && (
        <ResourceManageModal
          resourceId={openId}
          onClose={() => setOpenId(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}
