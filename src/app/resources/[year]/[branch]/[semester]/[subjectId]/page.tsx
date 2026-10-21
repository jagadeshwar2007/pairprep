import React from 'react';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { DEMO_RESOURCES } from '@/data/resourcesData';
import { SubjectResourceView } from '@/components/resources/SubjectResourceView';
import { Badge } from '@/components/ui/Badge';
import { Notice } from '@/components/ui/Feedback';
import { Page, PageHeader } from '@/components/ui/Layout';
import { ExternalLink } from 'lucide-react';

interface SubjectDetailsPageProps {
  params: Promise<{
    year: string;
    branch: string;
    semester: string;
    subjectId: string;
  }>;
}

export function generateStaticParams() {
  return SUBJECTS.map((sub) => ({
    year: sub.yearId,
    branch: sub.branchId,
    semester: sub.semester.toString(),
    subjectId: sub.id,
  }));
}

export async function generateMetadata({ params }: SubjectDetailsPageProps) {
  const { subjectId } = await params;
  const subject = SUBJECTS.find((s) => s.id === subjectId);

  if (!subject) {
    return { title: 'Subject not found' };
  }

  const code = subject.courseCode || subject.code;
  const title = subject.title || subject.name;
  return {
    title: code ? `${title} (${code})` : title,
    description: `Resources and course details for ${title}${code ? ` (${code})` : ''} at MNNIT Allahabad.`,
  };
}

export default async function SubjectDetailsPage({ params }: SubjectDetailsPageProps) {
  const { year, branch, semester, subjectId } = await params;
  const semNumber = parseInt(semester, 10);

  const yearData = ACADEMIC_YEARS.find((y) => y.id === year);
  const branchData = BRANCHES.find((b) => b.id === branch);
  const subject = SUBJECTS.find((s) => s.id === subjectId);

  if (!yearData || !branchData || !subject || isNaN(semNumber)) {
    notFound();
  }

  const displayCode = subject.courseCode || subject.code;
  const displayTitle = subject.title || subject.name;
  const ltp = subject.ltp || (subject.L && subject.T && subject.P ? `${subject.L}-${subject.T}-${subject.P}` : null);

  const subjectResources = DEMO_RESOURCES.filter((r) => r.subjectId === subject.id);

  const facts: Array<[string, string]> = [
    ['Credits', String(subject.credits)],
    ['Type', subject.type ? subject.type.charAt(0).toUpperCase() + subject.type.slice(1) : 'Core'],
  ];
  if (ltp) facts.push(['L-T-P', ltp]);
  if (subject.effectiveFrom) facts.push(['Curriculum from', subject.effectiveFrom]);

  return (
    <Page>
      <PageHeader
        eyebrow={`${branchData.code} · Semester ${semNumber}`}
        title={displayTitle}
        breadcrumbs={[
          { label: 'Library', href: '/resources' },
          { label: yearData.title, href: `/resources/${yearData.id}` },
          { label: branchData.code, href: `/resources/${yearData.id}/${branchData.id}` },
          { label: `Semester ${semNumber}`, href: `/resources/${yearData.id}/${branchData.id}/${semNumber}` },
          { label: displayCode || displayTitle },
        ]}
        meta={
          <>
            {displayCode ? (
              <Badge variant="neutral" className="font-mono">
                {displayCode}
              </Badge>
            ) : (
              <Badge variant="warning">Course code not listed</Badge>
            )}
            <Badge variant="outline">{branchData.name}</Badge>
          </>
        }
      />

      <section aria-label="Course details" className="space-y-3">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-slate-200 bg-slate-200 sm:grid-cols-4">
          {facts.map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">{v}</dd>
            </div>
          ))}
        </dl>

        {subject.sourceUrl && (
          <a
            href={subject.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-indigo-700 hover:underline"
          >
            Curriculum source document <ExternalLink className="h-3 w-3" aria-hidden="true" />
          </a>
        )}

        {subject.isQuestionableCode && (
          <Notice tone="warning" title="Course code needs checking">
            The code <code className="rounded bg-amber-100 px-1 font-mono">{displayCode}</code> is recorded as printed in
            the source{subject.note ? ` (${subject.note})` : ''} and may contain a typo. Confirm it with your department.
          </Notice>
        )}

        {subject.note && !subject.isQuestionableCode && <Notice>Source note: {subject.note}</Notice>}
      </section>

      <SubjectResourceView subject={subject} resources={subjectResources} />
    </Page>
  );
}
