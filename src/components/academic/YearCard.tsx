import React from 'react';
import Link from 'next/link';
import { AcademicYear } from '@/types';
import { ArrowRight } from 'lucide-react';

interface YearCardProps {
  year: AcademicYear;
}

export function YearCard({ year }: YearCardProps) {
  return (
    <Link href={`/resources/${year.id}`} className="group block h-full rounded-xl">
      <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(20,23,31,0.04)] transition-colors group-hover:border-indigo-300">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-3xl font-semibold text-indigo-700">{year.yearNumber}</span>
          <span className="text-xs font-medium text-slate-500">{year.badge}</span>
        </div>
        <h3 className="mt-3 text-base font-semibold text-slate-900">{year.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600 line-clamp-3">{year.description}</p>
        <span className="mt-auto flex items-center gap-1 pt-4 text-xs font-medium text-indigo-700">
          Choose a branch
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </article>
    </Link>
  );
}
