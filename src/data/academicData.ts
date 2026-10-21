import { AcademicYear, Branch, Subject } from '@/types';
import {
  MNNIT_BTECH_BRANCHES,
  MNNIT_BTECH_SUBJECTS,
  MNNIT_SUBJECTS_VALIDATION_REPORT,
  type MnnitSubjectRecord,
  type DatasetValidationReport,
} from './mnnitSubjectsData';

export const ACADEMIC_YEARS: AcademicYear[] = [
  {
    id: 'first-year',
    yearNumber: 1,
    title: 'First Year',
    badge: 'Semesters 1 & 2',
    description: 'Foundational engineering sciences, physics, chemistry, basic programming, and calculus for all branch cycles.',
    semesters: [1, 2],
    color: 'from-blue-500/10 via-sky-500/5 to-transparent border-blue-500/20 text-blue-600 dark:text-blue-400',
  },
  {
    id: 'second-year',
    yearNumber: 2,
    title: 'Second Year',
    badge: 'Semesters 3 & 4',
    description: 'Core departmental fundamentals, algorithmic foundations, digital design, and branch-specific engineering principles.',
    semesters: [3, 4],
    color: 'from-indigo-500/10 via-purple-500/5 to-transparent border-indigo-500/20 text-indigo-600 dark:text-indigo-400',
  },
  {
    id: 'third-year',
    yearNumber: 3,
    title: 'Third Year',
    badge: 'Semesters 5 & 6',
    description: 'Advanced departmental subjects, specialized core labs, professional electives, and internship preparations.',
    semesters: [5, 6],
    color: 'from-emerald-500/10 via-teal-500/5 to-transparent border-emerald-500/20 text-emerald-600 dark:text-emerald-400',
  },
  {
    id: 'fourth-year',
    yearNumber: 4,
    title: 'Fourth Year',
    badge: 'Semesters 7 & 8',
    description: 'Open electives, major degree project (BTP), industrial training seminars, and campus placement revisions.',
    semesters: [7, 8],
    color: 'from-amber-500/10 via-orange-500/5 to-transparent border-amber-500/20 text-amber-600 dark:text-amber-400',
  },
];

// All 10 B.Tech branches at MNNIT Allahabad directly mapped from official curriculum dataset
export const BRANCHES: Branch[] = MNNIT_BTECH_BRANCHES;

// All 446 subjects from MNNIT Allahabad B.Tech Curriculum Dataset
export const SUBJECTS: Subject[] = MNNIT_BTECH_SUBJECTS;

export {
  MNNIT_BTECH_BRANCHES,
  MNNIT_BTECH_SUBJECTS,
  MNNIT_SUBJECTS_VALIDATION_REPORT,
  type MnnitSubjectRecord,
  type DatasetValidationReport,
};
