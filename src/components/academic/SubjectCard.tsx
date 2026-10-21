import React from 'react';
import Link from 'next/link';
import { Subject } from '@/types';
import { Card } from '@/components/ui/Card';
import { ArrowRight, Award } from 'lucide-react';

interface SubjectCardProps {
  subject: Subject;
  resourceCount?: number;
}

export function SubjectCard({ subject, resourceCount = 0 }: SubjectCardProps) {
  return (
    <Link
      href={`/resources/${subject.yearId}/${subject.branchId}/${subject.semester}/${subject.id}`}
      className="group block focus:outline-none"
    >
      <Card
        hoverEffect
        className="h-full flex flex-col justify-between border-slate-200/90 dark:border-slate-800 transition-all duration-200 group-hover:border-indigo-400 group-hover:shadow-md"
      >
        <div>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-900/60">
              {subject.code}
            </span>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              <span>{subject.credits} Credits</span>
            </div>
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {subject.name}
          </h4>

          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {subject.description}
          </p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {subject.topics.slice(0, 3).map((topic, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-500">
            {resourceCount > 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {resourceCount} Resources available
              </span>
            ) : (
              'Notes, PYQs and more'
            )}
          </span>
          <span className="text-indigo-600 dark:text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
            View Material
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </Card>
    </Link>
  );
}
