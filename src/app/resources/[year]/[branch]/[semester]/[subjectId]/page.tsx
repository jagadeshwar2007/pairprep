import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { getSubjectResources } from '@/lib/data/resources';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { SubjectResourceView } from '@/components/resources/SubjectResourceView';
import { Badge } from '@/components/ui/Badge';
import type { ResourceItem, Subject } from '@/types';
import { Award, AlertTriangle, DatabaseZap } from 'lucide-react';

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
    return { title: 'Subject Not Found | Pairprep' };
  }

  return {
    title: `${subject.code} - ${subject.name} Notes & PYQs | Pairprep MNNIT`,
    description: `Download lecture notes, midsem & endsem question papers, and syllabus for ${subject.name} (${subject.code}) at MNNIT Allahabad.`,
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

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Resources', href: '/resources' },
          { label: yearData.title, href: `/resources/${yearData.id}` },
          { label: branchData.code, href: `/resources/${yearData.id}/${branchData.id}` },
          {
            label: `Semester ${semNumber}`,
            href: `/resources/${yearData.id}/${branchData.id}/${semNumber}`,
          },
          { label: subject.code },
        ]}
      />

      {/* Subject Header Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-10 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60">
              {subject.code}
            </span>
            <Badge variant="outline">{branchData.code}</Badge>
            <Badge variant="neutral">Semester {semNumber}</Badge>
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/50 px-2.5 py-1 rounded-lg border border-amber-200/50">
              <Award className="h-3.5 w-3.5" />
              <span>{subject.credits} Credits</span>
            </div>
          </div>

        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {subject.name}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
            {subject.description}
          </p>
        </div>

        {/* Topics covered */}
        <div className="pt-2 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Syllabus Topics:
          </span>
          {subject.topics.map((t, idx) => (
            <span
              key={idx}
              className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium"
            >
              {t}
            </span>
          ))}
        </div>

        {subject.instructorNote && (
          <div className="mt-3 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 p-3 rounded-xl text-slate-600 dark:text-slate-400">
            <strong>Curator Note:</strong> {subject.instructorNote}
          </div>
        )}
      </div>

      {/* Interactive Category Filter and Resources Grid */}
      <Suspense fallback={<ResourcesSkeleton />}>
        <SubjectResources subject={subject} />
      </Suspense>
    </div>
  );
}

/** Live data from the database; kept inside Suspense so the rest of the page stays static. */
async function SubjectResources({ subject }: { subject: Subject }) {
  if (!isSupabaseConfigured()) {
    return (
      <StatusPanel icon={DatabaseZap} title="Resources are not available yet">
        The backend is not configured for this deployment (missing Supabase environment variables).
      </StatusPanel>
    );
  }
  let resources: ResourceItem[];
  try {
    resources = await getSubjectResources(subject.id);
  } catch (error) {
    console.error('[resources] could not load subject resources:', (error as Error).message);
    return (
      <StatusPanel icon={AlertTriangle} title="We couldn't load resources right now">
        Please refresh in a moment. If this keeps happening, tell an admin.
      </StatusPanel>
    );
  }
  return <SubjectResourceView subject={subject} resources={resources} />;
}

function StatusPanel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div role="status" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-10 text-center space-y-2">
      <Icon className="mx-auto h-7 w-7 text-amber-500" />
      <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">{title}</h3>
      <p className="text-xs text-slate-500 max-w-md mx-auto">{children}</p>
    </div>
  );
}

function ResourcesSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading resources">
      <div className="h-10 w-full max-w-md rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        ))}
      </div>
    </div>
  );
}
