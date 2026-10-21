import React from 'react';
import { StudyTimer } from '@/components/tools/StudyTimer';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'Study timer',
  description: 'Focus sessions with short breaks, running in your browser.',
};

export default function StudyTimerPage() {
  return (
    <Page className="max-w-3xl">
      <PageHeader
        eyebrow="Study tools"
        title="Study timer"
        description="Work in 25-minute focus sessions with 5-minute breaks. The timer stops if you leave or close this page."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'Study timer' }]}
      />
      <StudyTimer />
    </Page>
  );
}
