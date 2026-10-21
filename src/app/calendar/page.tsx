import React from 'react';
import { CalendarView } from '@/components/calendar/CalendarView';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'Academic calendar 2026-27',
  description:
    'Semester dates, examination periods, declared holidays and vacations for the 2026-27 session at MNNIT Allahabad.',
};

export default function AcademicCalendarPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Session 2026–27"
        title="Academic calendar"
        description="Odd and even semester dates, examination periods, holidays and vacations. Transcribed from an institute circular; always check the original before planning around a date."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'Academic calendar' }]}
      />
      <CalendarView />
    </Page>
  );
}
