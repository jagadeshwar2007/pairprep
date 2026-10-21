import React from 'react';
import { ACADEMIC_YEARS, BRANCHES } from '@/data/academicData';
import { YearCard } from '@/components/academic/YearCard';
import { BranchCard } from '@/components/academic/BranchCard';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { Badge } from '@/components/ui/Badge';
import { BookOpen } from 'lucide-react';

export const metadata = {
  title: 'Academic Resources Hierarchy | Pairprep MNNIT',
  description:
    'Explore engineering study resources by Academic Year, Branch, Semester, and Subject for MNNIT Allahabad.',
};

export default function ResourcesIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Breadcrumbs items={[{ label: 'Resources' }]} />

      {/* Header */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50">
          <BookOpen className="h-3.5 w-3.5" />
          MNNIT Academic Repository
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Academic Resource Hierarchy
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Structured path: Academic Year → Branch → Semester → Subject → Course Materials. Select your current academic year to start.
        </p>
      </div>

      {/* Step 1: Academic Years */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            1. Select Academic Year
          </h2>
          <span className="text-xs text-slate-400">4 Stages of B.Tech</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACADEMIC_YEARS.map((year) => (
            <YearCard key={year.id} year={year} />
          ))}
        </div>
      </div>

      {/* Quick Branch Access */}
      <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Quick Branch Directory
            </h2>
            <p className="text-xs text-slate-500">
              Jump straight into any department&apos;s curriculum and subject archives.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            Sample Directory (Registry verification in progress)
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BRANCHES.map((b) => (
            <BranchCard key={b.id} branch={b} yearId="second-year" />
          ))}
        </div>
      </div>
    </div>
  );
}
