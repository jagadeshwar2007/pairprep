import { Suspense } from 'react';
import type { Metadata } from 'next';
import { Upload } from 'lucide-react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { ContributionForm } from '@/components/contribute/ContributionForm';

export const metadata: Metadata = {
  title: 'Contribute a resource | Pairprep',
  description: 'Share notes, papers and lab material with your batch. Every submission is reviewed by a moderator before it is published.',
};

export default function SubmitResourcePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Contribute Resource' }]} />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50">
          <Upload className="h-3.5 w-3.5" />
          Student Contribution Portal
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Submit Academic Resources
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Share handwritten summaries, midsem/endsem papers or lab manuals. Your submission stays private until a moderator
          approves it, and you can follow its progress from your dashboard.
        </p>
      </div>

      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" aria-busy="true" />}>
        <ContributionForm />
      </Suspense>
    </div>
  );
}
