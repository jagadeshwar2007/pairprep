import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { Badge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { Page, PageHeader, Section } from '@/components/ui/Layout';
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
    return { title: 'Branch not found' };
  }

  return {
    title: `${branchData.code}, ${yearData.title}`,
    description: `Semester subjects and resources for ${branchData.name} at MNNIT Allahabad.`,
  };
}

export default async function BranchSemesterSelectionPage({ params }: BranchSemesterPageProps) {
  const { year, branch } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);

  if (!yearData || !branchData) {
    notFound();
  }

  return (
    <Page>
      <PageHeader
        eyebrow={`${branchData.code} · ${yearData.title}`}
        title={branchData.name}
        description={branchData.description}
        breadcrumbs={[
          { label: 'Library', href: '/resources' },
          { label: yearData.title, href: `/resources/${yearData.id}` },
          { label: branchData.code },
        ]}
      />

      <Section title="Choose a semester">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {yearData.semesters.map((semNum) => {
            const semesterSubjects = SUBJECTS.filter(
              (s) => s.semester === semNum && s.branchId === branchData.id
            ).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

            return (
              <article
                key={semNum}
                className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(20,23,31,0.04)]"
              >
                <div className="flex items-baseline justify-between">
                  <h3 className="font-display text-2xl font-semibold text-slate-900">Semester {semNum}</h3>
                  <Badge variant="neutral">{semesterSubjects.length} subjects</Badge>
                </div>

                {semesterSubjects.length > 0 ? (
                  <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
                    {semesterSubjects.slice(0, 4).map((sub) => (
                      <li key={sub.id} className="flex items-baseline gap-2">
                        <span className="w-20 shrink-0 truncate font-mono text-[11px] text-slate-400">
                          {sub.courseCode || sub.code || ''}
                        </span>
                        <span className="truncate">{sub.title || sub.name}</span>
                      </li>
                    ))}
                    {semesterSubjects.length > 4 && (
                      <li className="pl-[5.5rem] text-xs text-slate-400">+ {semesterSubjects.length - 4} more</li>
                    )}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">
                    No subjects are listed for this semester yet. The source data for this branch is incomplete.
                  </p>
                )}

                <Link
                  href={`/resources/${yearData.id}/${branchData.id}/${semNum}`}
                  className={buttonClass('primary', 'md', 'mt-5 w-full')}
                >
                  View semester {semNum} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>
      </Section>
    </Page>
  );
}
