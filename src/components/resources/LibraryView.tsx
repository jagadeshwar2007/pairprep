'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Search, SearchX, AlertTriangle, BookOpen, X } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Pagination } from '@/components/ui/Pagination';
import { ResourceCard, ResourceCardSkeleton } from './ResourceCard';
import { api } from '@/lib/api/client';
import { RESOURCE_TYPE_INFO, departmentLabel } from '@/lib/resources/constants';
import type { Paginated, PublicResource, ResourceFacets } from '@/lib/resources/types';

const FILTER_KEYS = ['department', 'semester', 'subject', 'type', 'year'] as const;
const PAGE_SIZE = 12;

export function LibraryView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramString = params.toString();

  const [query, setQuery] = useState(params.get('q') ?? '');
  const [facets, setFacets] = useState<ResourceFacets | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const requestKey = `${paramString}#${reloadKey}`;
  const [response, setResponse] = useState<{ key: string; result: Paginated<PublicResource> | null; error: string | null }>({
    key: '',
    result: null,
    error: null,
  });
  // The previous result stays visible (dimmed) while the next request is in flight.
  const loading = response.key !== requestKey;
  const result = response.result;
  const error = loading ? null : response.error;

  const updateParams = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(paramString);
      for (const [k, v] of Object.entries(changes)) {
        if (v) next.set(k, v);
        else next.delete(k);
      }
      if (!('page' in changes)) next.delete('page');
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [paramString, pathname, router]
  );

  // Debounce the free-text search into the URL.
  useEffect(() => {
    const current = new URLSearchParams(paramString).get('q') ?? '';
    if (query.trim() === current) return;
    const t = setTimeout(() => updateParams({ q: query.trim() || null }), 300);
    return () => clearTimeout(t);
  }, [query, paramString, updateParams]);

  useEffect(() => {
    api<ResourceFacets>('/api/resources/facets', { auth: false })
      .then(setFacets)
      .catch(() => setFacets({ departments: [], semesters: [], subjects: [], resourceTypes: [], academicYears: [] }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const qs = new URLSearchParams(paramString);
    qs.set('pageSize', String(PAGE_SIZE));
    api<Paginated<PublicResource>>(`/api/resources?${qs.toString()}`, { auth: false })
      .then((r) => !cancelled && setResponse({ key: requestKey, result: r, error: null }))
      .catch((e: Error) => !cancelled && setResponse((prev) => ({ key: requestKey, result: prev.result, error: e.message })));
    return () => {
      cancelled = true;
    };
  }, [paramString, requestKey]);

  const active = FILTER_KEYS.filter((k) => params.get(k));
  const hasCriteria = active.length > 0 || Boolean(params.get('q'));

  const subjectOptions = useMemo(() => facets?.subjects ?? [], [facets]);
  const libraryEmpty = facets !== null && facets.resourceTypes.length === 0;

  if (libraryEmpty && !loading && result?.total === 0) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="No resources have been published yet"
        description="Resources appear here once a reviewer has checked them and an administrator has published them."
        action={
          <Link href="/submit">
            <Button variant="primary" size="sm">Submit a resource</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by subject, title, code or topic, e.g. “thermodynamics endsem”"
          aria-label="Search resources"
          icon={<Search className="h-4 w-4" />}
        />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          <Select aria-label="Resource type" value={params.get('type') ?? ''} onChange={(e) => updateParams({ type: e.target.value || null })}>
            <option value="">All types</option>
            {facets?.resourceTypes.map((t) => (
              <option key={t} value={t}>{RESOURCE_TYPE_INFO[t].label}</option>
            ))}
          </Select>
          <Select aria-label="Department" value={params.get('department') ?? ''} onChange={(e) => updateParams({ department: e.target.value || null })}>
            <option value="">All departments</option>
            {facets?.departments.map((d) => (
              <option key={d} value={d}>{departmentLabel(d)}</option>
            ))}
          </Select>
          <Select aria-label="Semester" value={params.get('semester') ?? ''} onChange={(e) => updateParams({ semester: e.target.value || null })}>
            <option value="">All semesters</option>
            {facets?.semesters.map((s) => (
              <option key={s} value={s}>Semester {s}</option>
            ))}
          </Select>
          <Select aria-label="Subject" value={params.get('subject') ?? ''} onChange={(e) => updateParams({ subject: e.target.value || null })}>
            <option value="">All subjects</option>
            {subjectOptions.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
            {params.get('subject') && !subjectOptions.includes(params.get('subject')!) && (
              <option value={params.get('subject')!}>{params.get('subject')}</option>
            )}
          </Select>
          <Select aria-label="Academic year" value={params.get('year') ?? ''} onChange={(e) => updateParams({ year: e.target.value || null })}>
            <option value="">All years</option>
            {facets?.academicYears.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </Select>
          <Select aria-label="Sort" value={params.get('sort') ?? 'newest'} onChange={(e) => updateParams({ sort: e.target.value === 'newest' ? null : e.target.value })}>
            <option value="newest">Newest first</option>
            <option value="title">Title A–Z</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 min-h-8">
        <p className="text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
          {loading ? 'Searching…' : result ? `${result.total} ${result.total === 1 ? 'resource' : 'resources'}` : ''}
        </p>
        {hasCriteria && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery('');
              router.replace(pathname, { scroll: false });
            }}
          >
            <X className="h-3.5 w-3.5" /> Clear filters
          </Button>
        )}
      </div>

      {error ? (
        <EmptyState
          tone="error"
          icon={<AlertTriangle className="h-6 w-6" />}
          title="Resources could not be loaded"
          description={error}
          action={
            <Button variant="outline" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          }
        />
      ) : loading && !result ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, i) => <ResourceCardSkeleton key={i} />)}
        </div>
      ) : result && result.items.length === 0 ? (
        <EmptyState
          icon={<SearchX className="h-6 w-6" />}
          title="No matching resources"
          description="Try fewer words, a subject code, or remove a filter."
        />
      ) : result ? (
        <>
          <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {result.items.map((r) => <ResourceCard key={r.id} resource={r} />)}
          </div>
          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            total={result.total}
            onChange={(p) => {
              updateParams({ page: p > 1 ? String(p) : null });
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </>
      ) : null}
    </div>
  );
}
