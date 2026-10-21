import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { DEMO_RESOURCES } from '@/data/resourcesData';
import { SubjectCard } from '@/components/academic/SubjectCard';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Page, PageHeader } from '@/components/ui/Layout';
import { BookOpen, Upload } from 'lucide-react';

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
    return { title: 'Semester not found' };
  }

  return {
    title: `${branchData.code} semester ${semester} subjects`,
    description: `Subjects and resources for ${branchData.name}, semester ${semester}.`,
  };
}

export default async function SemesterSubjectsPage({ params }: SemesterSubjectsPageProps) {
  const { year, branch, semester } = await params;
  const semNumber = parseInt(semester, 10);

  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);

  if (!yearData || !branchData || isNaN(semNumber)) {
    notFound();
  }

  // Strictly the selected branch and semester, in catalog order.
  const semesterSubjects = SUBJECTS.filter((s) => s.semester === semNumber && s.branchId === branchData.id).sort(
    (a, b) => (a.order ?? 0) - (b.order ?? 0)
  );

  return (
    <Page>
      <PageHeader
        eyebrow={`${branchData.code} · ${yearData.title}`}
        title={`Semester ${semNumber} subjects`}
        description={`${branchData.name}. Pick a subject to see its resources.`}
        breadcrumbs={[
          { label: 'Library', href: '/resources' },
          { label: yearData.title, href: `/resources/${yearData.id}` },
          { label: branchData.code, href: `/resources/${yearData.id}/${branchData.id}` },
          { label: `Semester ${semNumber}` },
        ]}
        meta={<Badge variant="neutral">{semesterSubjects.length} subjects</Badge>}
        actions={
          <Link href="/submit" className={buttonClass('outline', 'sm')}>
            <Upload className="h-3.5 w-3.5" /> Contribute
          </Link>
        }
      />

      {semesterSubjects.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {semesterSubjects.map((sub) => {
            const subjectResources = DEMO_RESOURCES.filter((r) => r.subjectId === sub.id);
            return (
              <SubjectCard
                key={sub.id}
                subject={sub}
                resourceCount={subjectResources.length}
                demoCount={subjectResources.filter((r) => r.isDemo).length}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={BookOpen}
          title="No subjects listed for this semester"
          description={`The source data for ${branchData.name} does not include semester ${semNumber} yet.`}
          action={
            <Link href="/resources" className={buttonClass('outline')}>
              Back to the library
            </Link>
          }
        />
      )}
    </Page>
  );
}
