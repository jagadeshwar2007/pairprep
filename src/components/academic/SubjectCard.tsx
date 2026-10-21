import React from 'react';
import Link from 'next/link';
import { Subject } from '@/types';
import { ArrowUpRight } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  /** Resources attached to this subject (all kinds). */
  resourceCount?: number;
  /** How many of those are demo placeholders. */
  demoCount?: number;
}

export function SubjectCard({ subject, resourceCount = 0, demoCount = 0 }: SubjectCardProps) {
  const displayCode = subject.courseCode || subject.code;
  const courseType = subject.type ?? 'core';
  const ltp = subject.ltp || (subject.L && subject.T && subject.P ? `${subject.L}-${subject.T}-${subject.P}` : null);
  const realCount = resourceCount - demoCount;

  let resourceLabel = 'No resources yet';
  let resourceTone = 'text-slate-400';
  if (realCount > 0) {
    resourceLabel = `${realCount} ${realCount === 1 ? 'resource' : 'resources'}`;
    resourceTone = 'text-emerald-700';
  } else if (demoCount > 0) {
    resourceLabel = `${demoCount} demo ${demoCount === 1 ? 'placeholder' : 'placeholders'}`;
    resourceTone = 'text-amber-800';
  }

  return (
    <Link
      href={`/resources/${subject.yearId}/${subject.branchId}/${subject.semester}/${subject.id}`}
      className="group block h-full rounded-xl focus-visible:outline-offset-2"
    >
      <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(20,23,31,0.04)] transition-colors group-hover:border-indigo-300">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex min-w-0 items-center gap-1.5">
            {displayCode ? (
              <span className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono font-medium text-slate-700">
                {displayCode}
              </span>
            ) : (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-500">Code not listed</span>
            )}
            {subject.isQuestionableCode && (
              <span
                className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800"
                title="The source prints this code in a way that may contain a typo."
              >
                Code unverified
              </span>
            )}
          </span>
          <span className="shrink-0 text-slate-500">
            Sem {subject.semester} · {subject.credits} cr
          </span>
        </div>

        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2 group-hover:text-indigo-800">
          {subject.title || subject.name}
        </h3>

        <p className="mt-1.5 text-xs capitalize text-slate-500">
          {courseType}
          {ltp ? ` · L-T-P ${ltp}` : ''}
        </p>

        <div className="mt-auto flex items-center justify-between pt-4 text-xs">
          <span className={`font-medium ${resourceTone}`}>{resourceLabel}</span>
          <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-600" aria-hidden="true" />
        </div>
      </article>
    </Link>
  );
}
