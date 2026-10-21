import React from 'react';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { BranchCard } from '@/components/academic/BranchCard';
import { Badge } from '@/components/ui/Badge';
import { Page, PageHeader, Section } from '@/components/ui/Layout';

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
  if (!yearData) return { title: 'Academic year not found' };

  return {
    title: `${yearData.title} resources`,
    description: `Study resources and subjects for ${yearData.title} (${yearData.badge}) at MNNIT Allahabad.`,
  };
}

export default async function AcademicYearPage({ params }: YearPageProps) {
  const { year } = await params;
  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);

  if (!yearData) {
    notFound();
  }

  const yearSubjectsCount = SUBJECTS.filter((s) => s.yearId === yearData.id).length;

  return (
    <Page>
      <PageHeader
        eyebrow={yearData.badge}
        title={`${yearData.title} resources`}
        description={yearData.description}
        breadcrumbs={[{ label: 'Library', href: '/resources' }, { label: yearData.title }]}
        meta={
          <>
            <Badge variant="outline">Year {yearData.yearNumber} of 4</Badge>
            <Badge variant="neutral">{yearSubjectsCount} subjects listed</Badge>
          </>
        }
      />

      <Section title="Choose your branch" description="Subjects are listed per branch and semester.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BRANCHES.map((b) => (
            <BranchCard key={b.id} branch={b} yearId={yearData.id} />
          ))}
        </div>
      </Section>
    </Page>
  );
}
