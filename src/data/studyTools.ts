import type { ElementType } from 'react';
import { Award, Calculator, Calendar, Layers, ListChecks, Timer, TrendingUp } from 'lucide-react';

export interface StudyTool {
  title: string;
  href: string;
  icon: ElementType;
  description: string;
  /** Honest caveat about assumptions or data limits, shown on the hub. */
  caveat?: string;
}

/** Single list used by the home page, tools hub and tool pages so names and routes cannot drift. */
export const STUDY_TOOLS: StudyTool[] = [
  {
    title: 'Attendance calculator',
    href: '/tools/attendance',
    icon: TrendingUp,
    description: 'See how many classes you can miss, or must attend, to stay above a target percentage.',
    caveat: 'The default 75% target is an assumption. Confirm your department’s rule.',
  },
  {
    title: 'SGPA calculator',
    href: '/tools/gpa',
    icon: Award,
    description: 'Estimate a semester’s grade point average from credits and expected grades.',
    caveat: 'Uses a 10-point scale that has not been verified against the official ordinance.',
  },
  {
    title: 'CGPA calculator',
    href: '/tools/cgpa',
    icon: Layers,
    description: 'Combine semester SGPAs, weighted by credits, into a cumulative GPA.',
    caveat: 'The percentage conversion is a rough estimate, not an official formula.',
  },
  {
    title: 'Scientific calculator',
    href: '/tools/scientific-calc',
    icon: Calculator,
    description: 'Trigonometry, logarithms, roots and powers, in degrees or radians.',
  },
  {
    title: 'Study timer',
    href: '/tools/study-timer',
    icon: Timer,
    description: 'Focus sessions with short breaks. Runs in your browser; nothing is saved.',
  },
  {
    title: 'Academic calendar',
    href: '/calendar',
    icon: Calendar,
    description: 'Semester dates, exams, holidays and vacations for session 2026–27.',
    caveat: 'Transcribed from a circular. Check the original before planning around a date.',
  },
  {
    title: 'Practice quiz',
    href: '/practice',
    icon: ListChecks,
    description: 'Short multiple-choice questions with explanations.',
    caveat: 'A small sample set of generic questions, not past papers.',
  },
];
