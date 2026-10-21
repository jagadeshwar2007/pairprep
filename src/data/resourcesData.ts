import { ResourceCategory } from '@/types';

export const CATEGORY_LABELS: Record<ResourceCategory, { label: string; badgeColor: string; description: string }> = {
  notes: {
    label: 'Study Notes',
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
    description: 'Comprehensive chapter-wise lecture notes & peer handwritten summaries',
  },
  pyq: {
    label: 'Previous-Year Questions',
    badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
    description: 'Past semester question paper sets and compiled chapter questions',
  },
  midsem: {
    label: 'Midsem Papers',
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    description: 'Mid-semester examination papers from recent academic sessions',
  },
  endsem: {
    label: 'Endsem Papers',
    badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
    description: 'Final end-semester examination papers and comprehensive question sets',
  },
  lecture: {
    label: 'Lecture Material',
    badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300 border-sky-200 dark:border-sky-800',
    description: 'Slides, lecture recordings summaries and instructor-provided handouts',
  },
  lab: {
    label: 'Lab Materials',
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    description: 'Lab manuals, viva voice questions, code skeletons, and report guidelines',
  },
  practice: {
    label: 'Practice Questions',
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
    description: 'Assignment sets, tutorial problem sheets, and numerical question banks',
  },
  syllabus: {
    label: 'Syllabus',
    badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
    description: 'Official course outline, weightage distribution, and unit breakdown',
  },
  reference: {
    label: 'Reference Materials',
    badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800/80 dark:text-slate-200 border-slate-300 dark:border-slate-700',
    description: 'Standard textbook chapters, cheat sheets, and curated external guides',
  },
  other: {
    label: 'Other',
    badgeColor: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800/80 dark:text-zinc-200 border-zinc-300 dark:border-zinc-700',
    description: 'Anything else that helps fellow students',
  },
};
