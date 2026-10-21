'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSearch, SlidersHorizontal, Upload } from 'lucide-react';
import Link from 'next/link';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { CATEGORY_LABELS, DEMO_RESOURCES } from '@/data/resourcesData';
import {
  EMPTY_FILTERS,
  SORT_OPTIONS,
  hasActiveFilters,
  parseFilters,
  searchResources,
  searchSubjects,
  serializeFilters,
  type LibraryFilters,
  type LibrarySort,
} from '@/lib/library';
import { Select } from '@/components/ui/Select';
import { Button, buttonClass } from '@/components/ui/Button';
import { FilterChip, SearchField } from '@/components/ui/Controls';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { SubjectCard } from '@/components/academic/SubjectCard';
import { ResourceCard } from './ResourceCard';
import type { ResourceCategory } from '@/types';

const PAGE_SIZE = 24;
const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ResourceCategory[];

export function ResourceLibrary() {
  const params = useSearchParams();
  const [filters, setFilters] = useState<LibraryFilters>(() => parseFilters(params));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [visibleSubjects, setVisibleSubjects] = useState(PAGE_SIZE);

  const update = (patch: Partial<LibraryFilters>) => {
    setFilters((prev) => {
      const next = { ...prev, ...patch };
      // Keep the structural filters consistent with each other.
      if (patch.year !== undefined && next.semester) {
        const yearSemesters = ACADEMIC_YEARS.find((y) => y.id === next.year)?.semesters;
        if (next.year && yearSemesters && !yearSemesters.includes(Number(next.semester))) next.semester = '';
      }
      if ((patch.branch !== undefined || patch.semester !== undefined || patch.year !== undefined) && next.subject) {
        const s = SUBJECTS.find((x) => x.id === next.subject);
        if (!s || (next.branch && s.branchId !== next.branch) || (next.semester && String(s.semester) !== next.semester)) {
          next.subject = '';
        }
      }
      return next;
    });
    setVisibleSubjects(PAGE_SIZE);
  };

  // Keep the URL shareable without triggering a navigation.
  useEffect(() => {
    const qs = serializeFilters(filters);
    const url = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    if (url !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(null, '', url);
    }
  }, [filters]);

  const active = hasActiveFilters(filters);

  const resourceResults = useMemo(() => searchResources(DEMO_RESOURCES, filters), [filters]);
  const subjectResults = useMemo(() => searchSubjects(SUBJECTS, DEMO_RESOURCES, filters), [filters]);

  // Type chip counts reflect every other active filter.
  const typeCounts = useMemo(() => {
    const base = searchResources(DEMO_RESOURCES, { ...filters, type: '' });
    const counts: Partial<Record<ResourceCategory, number>> = {};
    for (const r of base) counts[r.category] = (counts[r.category] ?? 0) + 1;
    return { counts, total: base.length };
  }, [filters]);

  const demoCountBySubject = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of DEMO_RESOURCES) if (r.isDemo) m.set(r.subjectId, (m.get(r.subjectId) ?? 0) + 1);
    return m;
  }, []);

  const semesterOptions = useMemo(() => {
    const fromYear = ACADEMIC_YEARS.find((y) => y.id === filters.year)?.semesters;
    return fromYear ?? [1, 2, 3, 4, 5, 6, 7, 8];
  }, [filters.year]);

  const subjectOptions = useMemo(() => {
    if (!filters.branch || !filters.semester) return [];
    return SUBJECTS.filter((s) => s.branchId === filters.branch && String(s.semester) === filters.semester).sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0)
    );
  }, [filters.branch, filters.semester]);

  const structuralCount = [filters.branch, filters.year, filters.semester, filters.subject].filter(Boolean).length;
  const allResourcesAreDemo = DEMO_RESOURCES.every((r) => r.isDemo);

  return (
    <div className="space-y-6">
      {/* Search */}
      <SearchField
        size="lg"
        value={filters.q}
        onValueChange={(q) => update({ q })}
        placeholder="Search subjects or resources"
        aria-label="Search the library"
        autoComplete="off"
      />

      {/* Structural filters */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 md:hidden cursor-pointer"
          aria-expanded={filtersOpen}
          aria-controls="library-filters"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters{structuralCount > 0 ? ` (${structuralCount})` : ''}
        </button>

        <div
          id="library-filters"
          className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-3 sm:grid-cols-2 md:grid md:grid-cols-4`}
        >
          <FilterSelect label="Branch" value={filters.branch} onChange={(branch) => update({ branch })}>
            <option value="">All branches</option>
            {BRANCHES.map((b) => (
              <option key={b.id} value={b.id}>
                {b.code} · {b.name}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Year" value={filters.year} onChange={(year) => update({ year })}>
            <option value="">All years</option>
            {ACADEMIC_YEARS.map((y) => (
              <option key={y.id} value={y.id}>
                {y.title}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Semester" value={filters.semester} onChange={(semester) => update({ semester })}>
            <option value="">All semesters</option>
            {semesterOptions.map((n) => (
              <option key={n} value={String(n)}>
                Semester {n}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Subject"
            value={filters.subject}
            onChange={(subject) => update({ subject })}
            disabled={subjectOptions.length === 0}
            hint={subjectOptions.length === 0 ? 'Pick a branch and semester first' : undefined}
          >
            <option value="">All subjects</option>
            {subjectOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title ?? s.name}
              </option>
            ))}
          </FilterSelect>
        </div>
      </div>

      {/* Resource type chips */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Resource type">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <FilterChip active={filters.type === ''} count={typeCounts.total} onClick={() => update({ type: '' })}>
            All types
          </FilterChip>
          {CATEGORY_ORDER.map((c) => (
            <FilterChip
              key={c}
              active={filters.type === c}
              count={typeCounts.counts[c] ?? 0}
              onClick={() => update({ type: filters.type === c ? '' : c })}
            >
              {CATEGORY_LABELS[c].label}
            </FilterChip>
          ))}
        </div>
      </div>

      {/* Result bar */}
      <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600" aria-live="polite">
          <strong className="font-semibold text-slate-900">{resourceResults.length}</strong>{' '}
          {resourceResults.length === 1 ? 'resource' : 'resources'}
          <span className="mx-1.5 text-slate-300">·</span>
          <strong className="font-semibold text-slate-900">{subjectResults.length}</strong>{' '}
          {subjectResults.length === 1 ? 'subject' : 'subjects'}
        </p>
        <div className="flex items-center gap-2">
          {active && (
            <Button variant="ghost" size="sm" onClick={() => update({ ...EMPTY_FILTERS, sort: filters.sort })}>
              Clear filters
            </Button>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-500">
            Sort
            <Select
              aria-label="Sort results"
              value={filters.sort}
              onChange={(e) => update({ sort: e.target.value as LibrarySort })}
              className="h-9 text-sm"
              wrapperClassName="w-40"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </div>

      {/* Resources */}
      <section aria-labelledby="resources-heading" className="space-y-3">
        <h2 id="resources-heading" className="font-display text-xl font-semibold text-slate-900">
          Resources
        </h2>
        {allResourcesAreDemo && (
          <Notice tone="demo" title="Everything listed here is a demonstration placeholder">
            No real notes or papers have been published yet. These entries show how the library will work; their PDFs
            are generic sample pages and none has been reviewed.
          </Notice>
        )}
        {resourceResults.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {resourceResults.map((r) => (
              <ResourceCard key={r.id} resource={r} showSubject />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileSearch}
            title="No resources match these filters"
            description={
              active
                ? 'Try removing a filter or searching by subject name. Most subjects do not have any resources yet.'
                : 'There are no resources in the library yet.'
            }
            action={
              <>
                {active && (
                  <Button variant="outline" onClick={() => update({ ...EMPTY_FILTERS, sort: filters.sort })}>
                    Clear filters
                  </Button>
                )}
                <Link href="/submit" className={buttonClass('subtle')}>
                  <Upload className="h-4 w-4" /> Contribute a resource
                </Link>
              </>
            }
          />
        )}
      </section>

      {/* Subjects */}
      <section aria-labelledby="subjects-heading" className="space-y-3">
        <h2 id="subjects-heading" className="font-display text-xl font-semibold text-slate-900">
          Subjects
        </h2>
        {subjectResults.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {subjectResults.slice(0, visibleSubjects).map(({ subject, resourceCount }) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  resourceCount={resourceCount}
                  demoCount={filters.type ? resourceCount : (demoCountBySubject.get(subject.id) ?? 0)}
                />
              ))}
            </div>
            {subjectResults.length > visibleSubjects && (
              <div className="flex flex-col items-center gap-2 pt-2">
                <p className="text-xs text-slate-500">
                  Showing {visibleSubjects} of {subjectResults.length}
                </p>
                <Button variant="outline" onClick={() => setVisibleSubjects((n) => n + PAGE_SIZE)}>
                  Show {Math.min(PAGE_SIZE, subjectResults.length - visibleSubjects)} more
                </Button>
              </div>
            )}
          </>
        ) : (
          <EmptyState
            icon={FileSearch}
            title="No subjects match"
            description="Check the spelling or try a course code such as the one printed in your syllabus."
            action={
              <Button variant="outline" onClick={() => update({ ...EMPTY_FILTERS, sort: filters.sort })}>
                Clear filters
              </Button>
            }
          />
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  disabled,
  hint,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  const id = `filter-${label.toLowerCase()}`;
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600">
        {label}
      </label>
      <Select id={id} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        {children}
      </Select>
      {hint && <p className="text-[11px] text-slate-400">{hint}</p>}
    </div>
  );
}
