import React from 'react';
import { QuizSession } from '@/components/practice/QuizSession';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'Practice quiz',
  description: 'Short multiple-choice practice questions with explanations.',
};

export default function PracticePage() {
  return (
    <Page className="max-w-4xl">
      <PageHeader
        eyebrow="Study tools"
        title="Practice quiz"
        description="Answer a question, check it, and read the explanation. This is a small sample set of generic questions, not past exam papers."
        breadcrumbs={[{ label: 'Study tools', href: '/tools' }, { label: 'Practice quiz' }]}
      />
      <QuizSession />
    </Page>
  );
}
