import { Suspense } from 'react';
import { ResourceDetail } from '@/components/resources/ResourceDetail';
import { Skeleton } from '@/components/ui/Skeleton';

export const metadata = { title: 'Resource | PairPrep' };

export default function ResourcePage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <ResourceDetail />
      </Suspense>
    </div>
  );
}
