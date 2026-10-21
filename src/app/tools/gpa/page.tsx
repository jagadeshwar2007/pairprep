import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { GpaCalculator } from '@/components/tools/GpaCalculator';
import { Award, Layers } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export const metadata = {
  title: 'Semester GPA (SGPA) Calculator | Pairprep MNNIT',
  description:
    'Calculate your semester grade point average with MNNIT relative grading 10-point scale.',
};

export default function GpaPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Academic Tools', href: '/tools' },
          { label: 'SGPA Calculator' },
        ]}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/50">
            <Award className="h-3.5 w-3.5" />
            MNNIT Semester Relative Grading
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Semester GPA (SGPA) Calculator
          </h1>
          <p className="text-sm text-slate-500 max-w-2xl">
            Input course credits and letter grades to calculate your projected Semester Grade Point Average.
          </p>
        </div>

        <Link href="/tools/cgpa">
          <Button variant="outline" size="sm">
            <Layers className="h-4 w-4 mr-1.5 text-indigo-500" />
            Switch to Cumulative CGPA
          </Button>
        </Link>
      </div>

      <GpaCalculator />
    </div>
  );
}
