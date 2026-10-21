import React from 'react';
import Link from 'next/link';
import { SearchX } from 'lucide-react';
import { buttonClass } from '@/components/ui/Button';
import { Page } from '@/components/ui/Layout';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <Page className="max-w-xl">
      <div className="rounded-xl border border-slate-200 bg-white px-6 py-12 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <SearchX className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="font-display text-2xl font-semibold text-slate-900">We could not find that page</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-slate-600">
          The link may be out of date, or the subject may not be in the catalog.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/resources" className={buttonClass('primary')}>
            Search the library
          </Link>
          <Link href="/" className={buttonClass('outline')}>
            Go home
          </Link>
        </div>
      </div>
    </Page>
  );
}
