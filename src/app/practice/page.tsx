import React from 'react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { QuizSession } from '@/components/practice/QuizSession';
import { Sparkles } from 'lucide-react';

export const metadata = {
  title: 'Academic Practice Questions | Pairprep MNNIT',
  description:
    'Interactive question practice session with immediate step-by-step explanations for engineering exams at MNNIT Allahabad.',
};

export default function PracticePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <Breadcrumbs items={[{ label: 'Practice' }]} />

      <div className="space-y-3">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50">
          <Sparkles className="h-3.5 w-3.5" />
          Interactive Assessment Interface
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Academic Question Practice
        </h1>
        <p className="text-base text-slate-500 max-w-2xl">
          Test your conceptual understanding across Data Structures, Operating Systems, and Engineering Mathematics with instant feedback and detailed explanations.
        </p>
      </div>

      <QuizSession />
    </div>
  );
}
