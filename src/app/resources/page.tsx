import React, { Suspense } from 'react';
import { ACADEMIC_YEARS } from '@/data/academicData';
import Link from 'next/link';
import { ResourceLibrary } from '@/components/resources/ResourceLibrary';
import { Page, PageHeader } from '@/components/ui/Layout';
import { CardGridSkeleton, Skeleton } from '@/components/ui/Feedback';

export const metadata = {
  title: 'Library',
  description:
    'Search and browse study resources and subjects by branch, year, semester and resource type for MNNIT Allahabad B.Tech.',
};

function LibraryFallback() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading the library">
      <Skeleton className="h-12 w-full" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Library"
        title="Find what you need to study"
        description="Search across all 446 subjects and the resource library, or narrow by branch, year, semester and type."
        breadcrumbs={[{ label: 'Library' }]}
      />

      <nav aria-label="Browse by year" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-slate-500">Browse by year:</span>
        {ACADEMIC_YEARS.map((year) => (
          <Link key={year.id} href={`/resources/${year.id}`} className="font-medium text-indigo-700 hover:underline">
            {year.title}
          </Link>
        ))}
      </nav>

      <Suspense fallback={<LibraryFallback />}>
        <ResourceLibrary />
      </Suspense>
    </Page>
  );
}
