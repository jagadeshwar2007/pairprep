const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const csvPath = path.join(__dirname, '..', 'data', 'mnnit_btech_subjects.csv');
const csvContent = fs.readFileSync(csvPath, 'utf8');

const parsed = Papa.parse(csvContent, {
  header: true,
  skipEmptyLines: true,
});

// Branch mapping
const BRANCH_CONFIG = {
  'Computer Science & Engineering': {
    id: 'cse',
    code: 'CSE',
    name: 'Computer Science & Engineering',
    shortName: 'Comp Science',
    description: 'Algorithms, systems, computer architecture, databases, AI/ML, and computational theory.',
    iconName: 'Laptop',
    color: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  },
  'Electronics & Communication Engineering': {
    id: 'ece',
    code: 'ECE',
    name: 'Electronics & Communication Engineering',
    shortName: 'Electronics',
    description: 'Signals & systems, analog/digital communications, VLSI design, microprocessors, and RF engineering.',
    iconName: 'Cpu',
    color: 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  },
  'Electrical Engineering': {
    id: 'ee',
    code: 'EE',
    name: 'Electrical Engineering',
    shortName: 'Electrical',
    description: 'Power systems, electrical machines, control engineering, power electronics, and high voltage tech.',
    iconName: 'Zap',
    color: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  },
  'Mechanical Engineering': {
    id: 'me',
    code: 'ME',
    name: 'Mechanical Engineering',
    shortName: 'Mechanical',
    description: 'Thermodynamics, fluid mechanics, strength of materials, machine design, CAD/CAM, and robotics.',
    iconName: 'Wrench',
    color: 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800',
  },
  'Civil Engineering': {
    id: 'ce',
    code: 'CE',
    name: 'Civil Engineering',
    shortName: 'Civil',
    description: 'Structural engineering, geotechnical analysis, surveying, environmental hydraulics, and transportation.',
    iconName: 'Building2',
    color: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  },
  'Chemical Engineering': {
    id: 'che',
    code: 'CHE',
    name: 'Chemical Engineering',
    shortName: 'Chemical',
    description: 'Chemical reaction engineering, heat & mass transfer, process dynamics, transport phenomena.',
    iconName: 'FlaskConical',
    color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border-teal-200 dark:border-teal-800',
  },
  'Production & Industrial Engineering': {
    id: 'pie',
    code: 'PIE',
    name: 'Production & Industrial Engineering',
    shortName: 'Prod & Ind',
    description: 'Manufacturing science, operations research, supply chain optimization, quality assurance, ergonomics.',
    iconName: 'Factory',
    color: 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  },
  'Biotechnology': {
    id: 'biotech',
    code: 'BT',
    name: 'Biotechnology',
    shortName: 'Biotech',
    description: 'Molecular biology, bioprocess engineering, bioinformatics, immunology, recombinant DNA technology.',
    iconName: 'Dna',
    color: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800',
  },
  'Engineering & Computational Mechanics': {
    id: 'ecm',
    code: 'ECM',
    name: 'Engineering & Computational Mechanics',
    shortName: 'Comp Mechanics',
    description: 'Finite element analysis, computational fluid dynamics, solid mechanics, continuum mechanics, and numerical simulations.',
    iconName: 'Cpu',
    color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
  },
  'Materials Engineering': {
    id: 'materials',
    code: 'MME',
    name: 'Materials Engineering',
    shortName: 'Materials Eng',
    description: 'Physical metallurgy, nanomaterials, polymers, ceramics, material characterization, and failure analysis.',
    iconName: 'Layers',
    color: 'bg-stone-50 text-stone-700 dark:bg-stone-950/40 dark:text-stone-300 border-stone-200 dark:border-stone-800',
  },
};

const YEAR_ID_MAP = {
  1: 'first-year',
  2: 'second-year',
  3: 'third-year',
  4: 'fourth-year',
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[-\s]+/g, '-');
}

const subjects = [];
const branchSemesters = {};

// Tracking validation
const missingCodeRecords = [];
const questionableCodeRecords = [];
const missingTitleRecords = [];
const duplicateRecords = [];
const seenKeySet = new Set();

parsed.data.forEach((row, idx) => {
  const branchName = row.branch?.trim() || '';
  const semester = parseInt(row.semester, 10);
  const year = parseInt(row.year, 10);
  const order = parseInt(row.order, 10);
  const courseCode = row.course_code?.trim() || '';
  const title = row.title?.trim() || '';
  const L = row.L?.trim() || '0';
  const T = row.T?.trim() || '0';
  const P = row.P?.trim() || '0';
  const credits = parseFloat(row.credits) || 0;
  const type = row.type?.trim().toLowerCase() || 'core';
  const note = row.note?.trim() || '';
  const effectiveFrom = row.effective_from?.trim() || '';
  const sourceUrl = row.source_url?.trim() || '';

  const branchMeta = BRANCH_CONFIG[branchName];
  if (!branchMeta) {
    console.error(`Unknown branch at line ${idx + 2}: ${branchName}`);
    return;
  }

  const branchId = branchMeta.id;
  const yearId = YEAR_ID_MAP[year] || 'first-year';

  if (!branchSemesters[branchId]) {
    branchSemesters[branchId] = new Set();
  }
  branchSemesters[branchId].add(semester);

  // Generate unique stable ID
  const codeOrTitleSlug = slugify(courseCode || title);
  const id = `${branchId}-sem${semester}-ord${order}-${codeOrTitleSlug}`;

  const hasMissingCode = !courseCode;
  const isQuestionableCode =
    note.toLowerCase().includes('typo') ||
    note.toLowerCase().includes('code as printed') ||
    note.toLowerCase().includes('duplicate');

  if (hasMissingCode) {
    missingCodeRecords.push({ id, branch: branchName, semester, order, title, type });
  }

  if (isQuestionableCode) {
    questionableCodeRecords.push({ id, branch: branchName, semester, order, courseCode, title, note });
  }

  if (!title) {
    missingTitleRecords.push({ id, branch: branchName, semester, order, courseCode });
  }

  const duplicateCheckKey = `${branchName}|${semester}|${courseCode}|${title}`;
  if (seenKeySet.has(duplicateCheckKey)) {
    duplicateRecords.push({ id, key: duplicateCheckKey });
  }
  seenKeySet.add(duplicateCheckKey);

  subjects.push({
    id,
    branch: branchName,
    branchId,
    branchCode: branchMeta.code,
    semester,
    year,
    yearId,
    order,
    courseCode,
    code: courseCode, // backwards-compatible alias
    title,
    name: title, // backwards-compatible alias
    L,
    T,
    P,
    ltp: `${L}-${T}-${P}`,
    credits,
    type,
    note,
    effectiveFrom,
    sourceUrl,
    hasMissingCode,
    isQuestionableCode,
    description: note || `${branchMeta.name} Semester ${semester} ${type.toUpperCase()} course (${credits} credits, L-T-P: ${L}-${T}-${P}). Curriculum effective session ${effectiveFrom}.`,
    topics: [type.toUpperCase(), `L-T-P: ${L}-${T}-${P}`, `${credits} Credits`],
  });
});

console.log(`Successfully converted ${subjects.length} subjects from CSV.`);

// Generate BRANCHES array with accurate semesters
const branchesArray = Object.values(BRANCH_CONFIG).map((b) => {
  const sems = branchSemesters[b.id] ? Array.from(branchSemesters[b.id]).sort((a, b) => a - b) : [1, 2, 3, 4, 5, 6, 7, 8];
  return {
    ...b,
    semesters: sems,
  };
});

const outputPath = path.join(__dirname, '..', 'src', 'data', 'mnnitSubjectsData.ts');

const tsContent = `// Generated automatically from data/mnnit_btech_subjects.csv
// Source of truth: MNNIT Allahabad B.Tech Curriculum Dataset
// Total Records: ${subjects.length}

import { Subject, Branch } from '@/types';

export interface MnnitSubjectRecord extends Subject {
  branch: string;
  branchCode: string;
  order: number;
  courseCode: string;
  title: string;
  L: string;
  T: string;
  P: string;
  ltp: string;
  type: string;
  note: string;
  effectiveFrom: string;
  sourceUrl: string;
  hasMissingCode: boolean;
  isQuestionableCode: boolean;
}

export interface DatasetValidationReport {
  totalRecords: number;
  missingCourseCodesCount: number;
  questionableCourseCodesCount: number;
  missingTitlesCount: number;
  duplicateRecordsCount: number;
  branchesWithIncompleteSemesters: Array<{ branch: string; missingSemesters: number[] }>;
  missingCodeSamples: Array<{ id: string; branch: string; semester: number; order: number; title: string; type: string }>;
  questionableCodeSamples: Array<{ id: string; branch: string; semester: number; order: number; courseCode: string; title: string; note: string }>;
}

export const MNNIT_SUBJECTS_VALIDATION_REPORT: DatasetValidationReport = {
  totalRecords: ${subjects.length},
  missingCourseCodesCount: ${missingCodeRecords.length},
  questionableCourseCodesCount: ${questionableCodeRecords.length},
  missingTitlesCount: ${missingTitleRecords.length},
  duplicateRecordsCount: ${duplicateRecords.length},
  branchesWithIncompleteSemesters: [
    { branch: 'Chemical Engineering', missingSemesters: [7, 8] },
    { branch: 'Electrical Engineering', missingSemesters: [6, 7, 8] },
  ],
  missingCodeSamples: ${JSON.stringify(missingCodeRecords.slice(0, 10), null, 2)},
  questionableCodeSamples: ${JSON.stringify(questionableCodeRecords, null, 2)},
};

export const MNNIT_BTECH_BRANCHES: Branch[] = ${JSON.stringify(branchesArray, null, 2)};

export const MNNIT_BTECH_SUBJECTS: MnnitSubjectRecord[] = ${JSON.stringify(subjects, null, 2)};

// Helper query functions
export function getSubjectsByBranchAndSemester(branchId: string, semester: number): MnnitSubjectRecord[] {
  return MNNIT_BTECH_SUBJECTS
    .filter((s) => s.branchId === branchId && s.semester === semester)
    .sort((a, b) => a.order - b.order);
}

export function getSubjectsByYear(yearId: string): MnnitSubjectRecord[] {
  return MNNIT_BTECH_SUBJECTS.filter((s) => s.yearId === yearId);
}

export function getSubjectById(subjectId: string): MnnitSubjectRecord | undefined {
  return MNNIT_BTECH_SUBJECTS.find((s) => s.id === subjectId);
}
`;

fs.writeFileSync(outputPath, tsContent, 'utf8');
console.log(`Written to ${outputPath}`);
