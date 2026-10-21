import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import {
  Calculator,
  TrendingUp,
  Timer,
  Award,
  Layers,
  Calendar,
  ArrowRight,
} from 'lucide-react';

export const metadata = {
  title: 'Academic Tools Hub | Pairprep MNNIT',
  description:
    'Academic calculators, study timers, attendance planners, and GPA/CGPA utilities for MNNIT Allahabad engineering students.',
};

export default function ToolsHubPage() {
  const tools = [
    {
      title: 'Attendance Calculator',
      description:
        'Verify your compliance with MNNIT 75% attendance policy. Computes safe bunk allowances or consecutive classes needed to return to the safe threshold.',
      href: '/tools/attendance',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/60',
      tag: '75% MNNIT Rule',
    },
    {
      title: 'Scientific Calculator',
      description:
        'Full engineering scientific calculator with trigonometric, logarithmic, root, and power operations for numerical problem sheets.',
      href: '/tools/scientific-calc',
      icon: Calculator,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/60',
      tag: 'Trig & Calculus',
    },
    {
      title: 'Pomodoro Study Timer',
      description:
        '25-minute deep focus sessions with 5-minute short breaks and 15-minute long breaks, accompanied by audio chimes.',
      href: '/tools/study-timer',
      icon: Timer,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/60',
      tag: 'Focus Sessions',
    },
    {
      title: 'Semester GPA (SGPA) Calculator',
      description:
        'Interactive semester grade predictor using the MNNIT Allahabad 10-point relative grading scale (A+ down to F).',
      href: '/tools/gpa',
      icon: Award,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/60',
      tag: '10-Point Scale',
    },
    {
      title: 'Cumulative CGPA Calculator',
      description:
        'Calculate multi-semester cumulative grade point average weighted by credit units across Semesters 1 through 8.',
      href: '/tools/cgpa',
      icon: Layers,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/60',
      tag: 'Multi-Semester',
    },
    {
      title: 'MNNIT Academic Calendar 2026–27',
      description:
        'Official 2-page institutional schedule covering odd and even semesters, examination blocks, declared holidays, and vacation dates.',
      href: '/calendar',
      icon: Calendar,
      color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border-indigo-200/60',
      tag: 'Official Schedule',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      <Breadcrumbs items={[{ label: 'Academic Tools' }]} />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50">
          <Calculator className="h-3.5 w-3.5" />
          MNNIT Student Productivity Suite
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Academic Utilities & Calculators
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Purpose-built productivity tools adapted for MNNIT Allahabad academic regulations, credit structures, and semester routines.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((t, idx) => {
          const Icon = t.icon;
          return (
            <Link key={idx} href={t.href} className="group block focus:outline-none">
              <Card
                hoverEffect
                className="h-full flex flex-col justify-between p-6 sm:p-7 border-slate-200 dark:border-slate-800 group-hover:border-indigo-400 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`h-12 w-12 rounded-xl flex items-center justify-center border ${t.color} group-hover:scale-105 transition-transform`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" size="sm">
                      {t.tag}
                    </Badge>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {t.title}
                  </h3>

                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {t.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                  <span>Open Tool</span>
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
