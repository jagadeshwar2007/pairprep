import React from 'react';
import Link from 'next/link';
import { AcademicYear } from '@/types';
import { Card } from '@/components/ui/Card';
import { ArrowRight, Calendar, Layers } from 'lucide-react';

interface YearCardProps {
  year: AcademicYear;
}

export function YearCard({ year }: YearCardProps) {
  return (
    <Link href={`/resources/${year.id}`} className="group block focus:outline-none">
      <Card
        hoverEffect
        className={`relative overflow-hidden h-full flex flex-col justify-between border transition-all duration-300 group-hover:border-indigo-400 group-hover:shadow-lg dark:group-hover:border-indigo-500`}
      >
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 rounded-full bg-indigo-500/5 group-hover:bg-indigo-500/10 transition-colors pointer-events-none" />

        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              <Calendar className="h-3 w-3 text-indigo-500" />
              {year.badge}
            </span>
            <span className="text-2xl font-black text-slate-300 dark:text-slate-700 group-hover:text-indigo-400/40 transition-colors">
              0{year.yearNumber}
            </span>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {year.title}
          </h3>

          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            {year.description}
          </p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <span className="flex items-center gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            Explore Semesters {year.semesters.join(' & ')}
          </span>
          <ArrowRight className="h-4 w-4 transform transition-transform group-hover:translate-x-1" />
        </div>
      </Card>
    </Link>
  );
}
