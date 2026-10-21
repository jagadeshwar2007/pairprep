import React from 'react';
import { AttendanceCalculator } from '@/components/tools/AttendanceCalculator';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'Attendance calculator',
  description:
    'Work out your attendance percentage and how many classes you can miss, or must attend, to reach a target.',
};

export default function AttendancePage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Study tools"
        title="Attendance calculator"
        description="Enter the classes you have attended and the classes held so far, then pick the percentage you need to stay above."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'Attendance' }]}
      />
      <AttendanceCalculator />
    </Page>
  );
}
