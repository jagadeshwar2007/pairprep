import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

interface BranchSemesterPageProps {
  params: Promise<{
    year: string;
    branch: string;
  }>;
}

export function generateStaticParams() {
  const params: Array<{ year: string; branch: string }> = [];
  ACADEMIC_YEARS.forEach((y) => {
    BRANCHES.forEach((b) => {
      params.push({ year: y.id, branch: b.id });
    });
  });
  return params;
}

export async function generateMetadata({ params }: BranchSemesterPageProps) {
  const { year, branch } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);

  if (!yearData || !branchData) {
    return { title: 'Branch Not Found | Pairprep' };
  }

  return {
    title: `${branchData.code} (${branchData.name}) - ${yearData.title} | Pairprep MNNIT`,
    description: `Access semester subjects and resources for ${branchData.name} at MNNIT Allahabad.`,
  };
}

export default async function BranchSemesterSelectionPage({
  params,
}: BranchSemesterPageProps) {
  const { year, branch } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);

  if (!yearData || !branchData) {
    notFound();
  }

  // Find subjects for each semester belonging to this year
  const semestersForYear = yearData.semesters;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Resources', href: '/resources' },
          { label: yearData.title, href: `/resources/${yearData.id}` },
          { label: `${branchData.code}` },
        ]}
      />

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{branchData.code}</Badge>
          <Badge variant="outline">{yearData.title}</Badge>
          <Badge variant="neutral">Semesters: {semestersForYear.join(' & ')}</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          {branchData.name}
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          {branchData.description}
        </p>
      </div>

      {/* Semester Selection Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Choose Your Current Semester
          </h2>
          <span className="text-xs text-slate-400">
            {semestersForYear.length} Semesters in this Academic Year
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {semestersForYear.map((semNum) => {
            const semesterSubjects = SUBJECTS.filter(
              (s) =>
                s.semester === semNum &&
                (s.branchId === branchData.id || s.yearId === 'first-year')
            );

            return (
              <Card
                key={semNum}
                hoverEffect
                className="p-6 sm:p-8 flex flex-col justify-between border-slate-200 dark:border-slate-800 group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50">
                      Semester 0{semNum}
                    </span>
                    <span className="text-xs text-slate-500 font-medium">
                      {semesterSubjects.length} Registered Subjects
                    </span>
                  </div>

                  <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    B.Tech Semester {semNum}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 leading-relaxed">
                    View lecture notes, midsem papers, endsem question sets, and laboratory guidelines for Semester {semNum}.
                  </p>

                  {/* Sample subjects preview */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                      Featured Subjects:
                    </span>
                    <ul className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                      {semesterSubjects.slice(0, 3).map((sub) => (
                        <li key={sub.id} className="flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                          <span className="font-mono text-[11px] text-slate-400">
                            {sub.code}:
                          </span>
                          <span className="truncate">{sub.name}</span>
                        </li>
                      ))}
                      {semesterSubjects.length === 0 && (
                        <li className="text-slate-400 italic">
                          Subjects curriculum loading for this semester cycle.
                        </li>
                      )}
                    </ul>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Link
                    href={`/resources/${yearData.id}/${branchData.id}/${semNum}`}
                    className="w-full block"
                  >
                    <Button variant="primary" className="w-full justify-center">
                      <span>Explore Semester {semNum} Subjects</span>
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
