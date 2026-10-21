import React from 'react';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { BranchCard } from '@/components/academic/BranchCard';
import { Badge } from '@/components/ui/Badge';
import { Layers } from 'lucide-react';

interface YearPageProps {
  params: Promise<{
    year: string;
  }>;
}

export function generateStaticParams() {
  return ACADEMIC_YEARS.map((y) => ({
    year: y.id,
  }));
}

export async function generateMetadata({ params }: YearPageProps) {
  const { year } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  if (!yearData) return { title: 'Academic Year Not Found | Pairprep' };

  return {
    title: `${yearData.title} (${yearData.badge}) Resources | Pairprep MNNIT`,
    description: `Academic study materials, midsems, endsems and syllabus for ${yearData.title} at MNNIT Allahabad.`,
  };
}

export default async function AcademicYearPage({ params }: YearPageProps) {
  const { year } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);

  if (!yearData) {
    notFound();
  }

  // Count subjects for this year
  const yearSubjectsCount = SUBJECTS.filter((s) => s.yearId === yearData.id).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Resources', href: '/resources' },
          { label: yearData.title },
        ]}
      />

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{yearData.badge}</Badge>
          <Badge variant="outline">Year {yearData.yearNumber} of B.Tech</Badge>
          <span className="text-xs text-slate-500">
            {yearSubjectsCount > 0 ? `${yearSubjectsCount} Catalogued Subjects` : 'Core Common Cycles'}
          </span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {yearData.title} Resources
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {yearData.description}
        </p>

        {/* Semesters belonging to this year */}
        <div className="pt-2 flex flex-wrap gap-3">
          {yearData.semesters.map((semNum) => (
            <div
              key={semNum}
              className="px-3.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2"
            >
              <Layers className="h-3.5 w-3.5 text-indigo-500" />
              <span>Semester {semNum}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Branch Selection Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Select Your Branch for {yearData.title}
            </h2>
            <p className="text-xs text-slate-500">
              Pick your engineering department to access semester-specific syllabi and papers.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            Sample Directory Data
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BRANCHES.map((b) => (
            <BranchCard key={b.id} branch={b} yearId={yearData.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
