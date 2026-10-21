import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { CgpaCalculator } from '@/components/tools/CgpaCalculator';
import { Layers, Award } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Cumulative CGPA Calculator | Pairprep MNNIT',
  description:
    'Calculate your cumulative grade point average across all completed semesters at MNNIT Allahabad.',
};

export default function CgpaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Academic Tools', href: '/tools' },
          { label: 'Cumulative CGPA' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-200/50">
            <Layers className="h-3.5 w-3.5" />
            Overall B.Tech Performance
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Cumulative CGPA Calculator
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Aggregate your semester SGPA weighted by semester credit weights across Semesters 1 through 8.
          </p>
        </div>

        <Link href="/tools/gpa">
          <Button variant="outline" size="sm">
            <Award className="h-4 w-4 mr-1.5 text-indigo-500" />
            Switch to Semester SGPA
          </Button>
        </Link>
      </div>

      <CgpaCalculator />
    </div>
  );
}
