import React from 'react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { AttendanceCalculator } from '@/components/tools/AttendanceCalculator';
import { TrendingUp } from 'lucide-react';

export const metadata = {
  title: 'Attendance Calculator (75% Rule) | Pairprep MNNIT',
  description:
    'Calculate your attendance percentage, how many classes you can safely skip, or how many you must attend to meet MNNIT 75% rule.',
};

export default function AttendancePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Academic Tools', href: '/tools' },
          { label: 'Attendance Calculator' },
        ]}
      />

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/50">
          <TrendingUp className="h-3.5 w-3.5" />
          MNNIT Attendance Rule Checker
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Attendance Calculator
        </h1>
        <p className="text-sm text-slate-500 max-w-2xl">
          Quickly compute your exact class attendance standing, calculate your safe bunk buffer, or determine how many classes you must attend consecutively to hit 75%.
        </p>
      </div>

      <AttendanceCalculator />
    </div>
  );
}
