import { Suspense } from 'react';
import { LibraryView } from '@/components/resources/LibraryView';
import { ResourceCardSkeleton } from '@/components/resources/ResourceCard';

export const metadata = {
  title: 'Resource Library | PairPrep',
  description: 'Search previous-year question papers, notes, question banks and lab manuals by department, semester and subject.',
};

export default function LibraryPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Resource library</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Every file here has been checked by a reviewer and opens from its original Google Drive location.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }, (_, i) => (
              <ResourceCardSkeleton key={i} />
            ))}
          </div>
        }
      >
        <LibraryView />
      </Suspense>
    </div>
  );
}
