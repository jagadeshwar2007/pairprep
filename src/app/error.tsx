'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button, buttonClass } from '@/components/ui/Button';
import { Page } from '@/components/ui/Layout';

/** Error boundary for any route. `reset` re-renders the segment, which fixes most transient failures. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Page className="max-w-xl">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">Something went wrong</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          This page could not be shown. You can try again, or go back to the library.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Try again</Button>
          <Link href="/resources" className={buttonClass('outline')}>
            Open the library
          </Link>
        </div>
      </div>
    </Page>
  );
}
