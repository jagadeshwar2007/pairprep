import React from 'react';
import { CardGridSkeleton, Skeleton } from '@/components/ui/Feedback';
import { Page } from '@/components/ui/Layout';

/** Shown while a library, year, branch, semester or subject page is loading. */
export default function Loading() {
  return (
    <Page>
      <div className="space-y-3" role="status" aria-label="Loading">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-9 w-2/3 max-w-md" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <CardGridSkeleton count={6} />
    </Page>
  );
}
