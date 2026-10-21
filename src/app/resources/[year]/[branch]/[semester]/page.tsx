import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { DEMO_RESOURCES } from '@/data/resourcesData';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { SubjectCard } from '@/components/academic/SubjectCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { BookOpen, PlusCircle } from 'lucide-react';

interface SemesterSubjectsPageProps {
  params: Promise<{
    year: string;
    branch: string;
    semester: string;
  }>;
}

export function generateStaticParams() {
  const params: Array<{ year: string; branch: string; semester: string }> = [];
  ACADEMIC_YEARS.forEach((y) => {
    BRANCHES.forEach((b) => {
      y.semesters.forEach((sem) => {
        params.push({ year: y.id, branch: b.id, semester: sem.toString() });
      });
    });
  });
  return params;
}

export async function generateMetadata({ params }: SemesterSubjectsPageProps) {
  const { year, branch, semester } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);

  if (!yearData || !branchData) {
    return { title: 'Semester Not Found | Pairprep' };
  }

  return {
    title: `Semester ${semester} Subjects - ${branchData.code} | Pairprep MNNIT`,
    description: `Browse subjects, syllabus, midsems, endsems and notes for ${branchData.name} Semester ${semester}.`,
  };
}

export default async function SemesterSubjectsPage({
  params,
}: SemesterSubjectsPageProps) {
  const { year, branch, semester } = await params;
  const semNumber = parseInt(semester, 10);

  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);

  if (!yearData || !branchData || isNaN(semNumber)) {
    notFound();
  }

  // Find subjects for this branch and semester
  const semesterSubjects = SUBJECTS.filter(
    (s) =>
      s.semester === semNumber &&
      (s.branchId === branchData.id || s.yearId === 'first-year')
  );

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Breadcrumbs
        items={[
          { label: 'Resources', href: '/resources' },
          { label: yearData.title, href: `/resources/${yearData.id}` },
          { label: branchData.code, href: `/resources/${yearData.id}/${branchData.id}` },
          { label: `Semester ${semNumber}` },
        ]}
      />

      {/* Header */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{branchData.code}</Badge>
          <Badge variant="neutral">Semester {semNumber}</Badge>
          <Badge variant="outline">{yearData.title}</Badge>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Semester {semNumber} Subjects & Courseware
        </h1>

        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
          Select a subject below to explore chapter-wise study notes, past midsem & endsem question papers, viva sheets, and laboratory manuals.
        </p>
      </div>

      {/* Subjects Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Registered Subjects ({semesterSubjects.length})
            </h2>
            <p className="text-xs text-slate-500">
              Curriculum aligned with MNNIT B.Tech departmental ordinance.
            </p>
          </div>
          <Link href="/submit">
            <Button variant="outline" size="sm">
              <PlusCircle className="h-3.5 w-3.5 mr-1" />
              Contribute Notes for this Semester
            </Button>
          </Link>
        </div>

        {semesterSubjects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {semesterSubjects.map((sub) => {
              const resCount = DEMO_RESOURCES.filter((r) => r.subjectId === sub.id).length;
              return (
                <SubjectCard key={sub.id} subject={sub} resourceCount={resCount} />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center bg-white dark:bg-slate-900">
            <BookOpen className="h-10 w-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
              No subjects catalogued yet for this semester
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
              We are verifying and expanding the course list for {branchData.name} Semester {semNumber}.
            </p>
            <Link href="/submit">
              <Button variant="primary" size="sm">
                Submit Course Syllabus
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
