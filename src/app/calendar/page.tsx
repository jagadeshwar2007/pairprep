import React from 'react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Calendar } from 'lucide-react';

export const metadata = {
  title: 'MNNIT Academic Calendar 2026–27 | Pairprep',
  description:
    'Complete official academic calendar for all B.Tech branches and years at MNNIT Allahabad. Track examinations, holidays, registration deadlines, and instructional days.',
};

export default function AcademicCalendarPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Academic Calendar' }]} />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50">
          <Calendar className="h-3.5 w-3.5" />
          Official Institutional Schedule
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          MNNIT Academic Calendar 2026–27
        </h1>
        <p className="text-base text-slate-500 max-w-2xl leading-relaxed">
          Official academic schedule approved by MNNIT Allahabad for all B.Tech students. Explore odd and even semesters, examination intervals, declared holidays, and vacation timelines.
        </p>
      </div>

      <CalendarView />
    </div>
  );
}
