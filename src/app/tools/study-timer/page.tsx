import React from 'react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { StudyTimer } from '@/components/tools/StudyTimer';
import { Timer } from 'lucide-react';

export const metadata = {
  title: 'Pomodoro Study Timer | Pairprep MNNIT',
  description:
    'Stay focused on midsem preparation with customizable 25-minute Pomodoro study intervals and break reminders.',
};

export default function StudyTimerPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs
        items={[
          { label: 'Academic Tools', href: '/tools' },
          { label: 'Pomodoro Study Timer' },
        ]}
      />

      <div className="text-center space-y-2 max-w-xl mx-auto">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300 border border-purple-200/50">
          <Timer className="h-3.5 w-3.5" />
          Pomodoro Focus Session
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Study Focus Timer
        </h1>
        <p className="text-sm text-slate-500">
          Break down challenging engineering revisions into 25-minute uninterrupted sprint sessions with scheduled rest intervals.
        </p>
      </div>

      <StudyTimer />
    </div>
  );
}
