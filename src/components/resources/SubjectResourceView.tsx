'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { FileSearch, FileText, Upload } from 'lucide-react';
import { Subject, ResourceCategory, ResourceItem } from '@/types';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { EMPTY_FILTERS, SORT_OPTIONS, searchResources, type LibrarySort } from '@/lib/library';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { buttonClass, Button } from '@/components/ui/Button';
import { FilterChip, SearchField } from '@/components/ui/Controls';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { Select } from '@/components/ui/Select';

interface SubjectResourceViewProps {
  subject: Subject;
  resources: ResourceItem[];
}

const CATEGORY_ORDER = Object.keys(CATEGORY_LABELS) as ResourceCategory[];

export function SubjectResourceView({ subject, resources }: SubjectResourceViewProps) {
  const [category, setCategory] = useState<ResourceCategory | ''>('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<LibrarySort>('relevance');

  const hasDemo = resources.some((r) => r.isDemo);

  // Counts reflect the search box but not the selected type, so chips stay informative.
  const countsByCategory = useMemo(() => {
    const base = searchResources(resources, { ...EMPTY_FILTERS, q: query });
    const counts: Partial<Record<ResourceCategory, number>> = {};
    for (const r of base) counts[r.category] = (counts[r.category] ?? 0) + 1;
    return { counts, total: base.length };
  }, [resources, query]);

  const filtered = useMemo(
    () => searchResources(resources, { ...EMPTY_FILTERS, q: query, type: category, sort }),
    [resources, query, category, sort]
  );

  const contribute = (
    <Link href="/submit" className={buttonClass('outline', 'md')}>
      <Upload className="h-4 w-4" /> Contribute for this subject
    </Link>
  );

  if (resources.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No resources for this subject yet"
        description={`Nothing has been published for ${subject.title || subject.name}. Contributions are not live yet, but the submission form shows how they will work.`}
        action={contribute}
      />
    );
  }

  return (
    <section aria-labelledby="subject-resources" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="subject-resources" className="font-display text-xl font-semibold text-slate-900 sm:text-2xl">
          Resources
        </h2>
        {contribute}
      </div>

      {hasDemo && (
        <Notice tone="demo" title="Demonstration resources">
          The entries below are placeholders used to preview the library. They are not real notes or exam papers, and
          none has been reviewed.
        </Notice>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <SearchField
          value={query}
          onValueChange={setQuery}
          placeholder="Search within this subject"
          aria-label="Search resources in this subject"
          autoComplete="off"
        />
        <Select
          aria-label="Sort resources"
          value={sort}
          onChange={(e) => setSort(e.target.value as LibrarySort)}
          wrapperClassName="sm:w-44"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Resource type">
        <div className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <FilterChip active={category === ''} count={countsByCategory.total} onClick={() => setCategory('')}>
            All
          </FilterChip>
          {CATEGORY_ORDER.filter((c) => (countsByCategory.counts[c] ?? 0) > 0 || category === c).map((c) => (
            <FilterChip
              key={c}
              active={category === c}
              count={countsByCategory.counts[c] ?? 0}
              onClick={() => setCategory(category === c ? '' : c)}
            >
              {CATEGORY_LABELS[c].label}
            </FilterChip>
          ))}
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {filtered.map((res) => (
            <ResourceCard key={res.id} resource={res} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileSearch}
          title="No matching resources"
          description="Nothing matches the current search or type."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setCategory('');
                setQuery('');
              }}
            >
              Reset filters ({resources.length} available)
            </Button>
          }
        />
      )}
    </section>
  );
}
