import { ResourceCategory, ResourceItem } from '@/types';
import { SUBJECTS } from '@/data/academicData';

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
};

/** Fields derived from the subject dataset; seeds only reference a subject by id. */
type DerivedResourceFields =
  | 'subjectName'
  | 'subjectCode'
  | 'branchId'
  | 'branchCode'
  | 'semester'
  | 'yearId'
  | 'downloadUrl'
  | 'isDemo';

export type DemoResourceSeed = Omit<ResourceItem, DerivedResourceFields>;

/**
 * Builds a full ResourceItem from a seed by looking the subject up in the dataset,
 * so subject name/code/branch/semester/year can never drift from the catalog.
 * Throws on an unknown subjectId (also covered by the resource validation tests).
 */
export function hydrateResource(seed: DemoResourceSeed): ResourceItem {
  const subject = SUBJECTS.find((s) => s.id === seed.subjectId);
  if (!subject) {
    throw new Error(`Resource "${seed.id}" references unknown subjectId "${seed.subjectId}"`);
  }
  return {
    ...seed,
    subjectName: subject.title ?? subject.name,
    subjectCode: subject.courseCode || subject.code,
    branchId: subject.branchId,
    branchCode: subject.branchCode ?? subject.branchId.toUpperCase(),
    semester: subject.semester,
    yearId: subject.yearId,
    downloadUrl: seed.previewUrl ?? '#',
    isDemo: true,
  };
}


const DEMO_RESOURCE_SEEDS: DemoResourceSeed[] = [
  // Data Structures (CSE sem 2, CSN12401)
  {
    id: 'res-ds-notes-01',
    title: '[Demo] Complete Trees, Heaps & Graph Traversals Handwritten Notes',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'notes',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Pairprep Academic Team (Demo)',
    uploadedAt: '2026-09-15',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Clear visual notes covering Binary Search Trees, AVL balance rotations, Max/Min Heaps, and DFS/BFS algorithms with C++ snippets.',
    tags: ['Trees', 'Graphs', 'AVL', 'Heaps'],
  },
  {
    id: 'res-ds-midsem-2025',
    title: '[Demo] Midsem Exam Paper 2024-25 (With Solution Hints)',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'midsem',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Student Contributor (Sample)',
    uploadedAt: '2026-10-02',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Actual midsem question paper covering Asymptotic notation, Stack applications (Infix to Postfix), and Circular Linked Lists.',
    tags: ['Midsem', '2024-25', 'Stack', 'Linked List'],
  },
  {
    id: 'res-ds-endsem-2024',
    title: '[Demo] Endsem Exam Paper 2023-24 (Complete 50 Marks)',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'endsem',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Student Contributor (Sample)',
    uploadedAt: '2026-08-20',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Comprehensive end-semester paper covering Dijkstra shortest path, Prim vs Kruskal, B-Trees, and Hash collision resolution.',
    tags: ['Endsem', 'PYQ', 'Dijkstra', 'Hashing'],
  },
  {
    id: 'res-ds-lab-manual',
    title: '[Demo] Data Structures Laboratory Manual & Weekly Code Assignments',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'lab',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Department Lab Instructors (Sample)',
    uploadedAt: '2026-07-28',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Laboratory assignments list, compilation commands on Linux, test cases, and viva question bank.',
    tags: ['Lab Manual', 'Viva Voce', 'C++ Programs'],
  },
  {
    id: 'res-ds-pyq-compilation',
    title: '[Demo] 5-Year PYQ Question Bank (2019 - 2024) Grouped by Module',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'pyq',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Pairprep Senior Curators (Demo)',
    uploadedAt: '2026-06-14',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Questions categorized by Module 1 (Lists/Stacks), Module 2 (Trees), Module 3 (Graphs), and Module 4 (Sorting & Searching).',
    tags: ['PYQ', 'Compilation', '5-Years'],
  },
  {
    id: 'res-ds-syllabus',
    title: '[Demo] Official Course Syllabus & Evaluation Weightage (Sample)',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'syllabus',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Academic Section (Sample)',
    uploadedAt: '2026-07-01',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Unit-wise syllabus breakdown, text books (Cormen, Weiss), and grading criteria (Midsem 30%, Endsem 50%, TA 20%).',
    tags: ['Syllabus', 'Textbooks'],
  },
  {
    id: 'res-ds-practice-sheets',
    title: '[Demo] Tutorial Sheet 1-4: Asymptotic Notations & Recurrence Trees',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'practice',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Teaching Assistant (Sample)',
    uploadedAt: '2026-08-30',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Practice questions with step-by-step master theorem applications and substitution method proofs.',
    tags: ['Tutorials', 'Master Theorem', 'Asymptotics'],
  },
  {
    id: 'res-ds-reference-cheat',
    title: '[Demo] Big-O Cheat Sheet & Data Structure Complexity Quick Reference',
    subjectId: 'cse-sem2-ord4-csn12401',
    category: 'reference',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Pairprep Core Team (Demo)',
    uploadedAt: '2026-09-01',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Quick two-page printable cheat sheet of time & space complexities for all common data structures and sorting algorithms.',
    tags: ['Cheat Sheet', 'Complexity', 'Interview Prep'],
  },

  // Operating System (CSE sem 4, CSN14401)
  {
    id: 'res-os-notes-01',
    title: '[Demo] Operating Systems Complete Lecture Notes (Process to File Systems)',
    subjectId: 'cse-sem4-ord2-csn14401',
    category: 'notes',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Student Contributor (Sample)',
    uploadedAt: '2026-09-18',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Detailed explanations of CPU scheduling algorithms, Peterson solution, Semaphores, Banker algorithm, and Inverted Page tables.',
    tags: ['Processes', 'Semaphores', 'Virtual Memory'],
  },
  {
    id: 'res-os-midsem-2024',
    title: '[Demo] Midsem Exam Paper 2024: Concurrency & Scheduling Numerical',
    subjectId: 'cse-sem4-ord2-csn14401',
    category: 'midsem',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Department Archives (Sample)',
    uploadedAt: '2026-10-05',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Past midsem question paper focusing on Round Robin Gantt charts, multilevel feedback queues, and dining philosophers.',
    tags: ['Midsem', 'Scheduling', 'Concurrency'],
  },

  // Database Management System (CSE sem 5, CSN15401)
  {
    id: 'res-dbms-notes-01',
    title: '[Demo] DBMS Normalization & Relational Algebra Handouts',
    subjectId: 'cse-sem5-ord2-csn15401',
    category: 'notes',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Peer Student Notes (Sample)',
    uploadedAt: '2026-09-12',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Simplified methods for computing candidate keys, finding canonical covers, and proving BCNF/3NF lossless joins.',
    tags: ['Normalization', 'Candidate Keys', 'BCNF'],
  },
  {
    id: 'res-dbms-endsem-2024',
    title: '[Demo] Endsem Exam 2024: SQL Queries & Transaction Schedules',
    subjectId: 'cse-sem5-ord2-csn15401',
    category: 'endsem',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Student Contributor (Sample)',
    uploadedAt: '2026-08-11',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Full endsem question paper with complex nested SQL queries, serializability conflict graphs, and 2-Phase Locking.',
    tags: ['Endsem', 'SQL', 'Transactions', '2PL'],
  },

  // Mathematics-I (CSE sem 1, MAN11101)
  {
    id: 'res-math1-notes-01',
    title: '[Demo] Engineering Mathematics I - Matrices, Eigenvalues & Calculus Summary',
    subjectId: 'cse-sem1-ord2-man11101',
    category: 'notes',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Pairprep Academic Team (Demo)',
    uploadedAt: '2026-08-15',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Clean handwritten formulas, Cayley-Hamilton theorem applications, Taylor series, and multiple integral coordinate transformations.',
    tags: ['Calculus', 'Matrices', 'Eigenvalues', 'First Year'],
  },
  {
    id: 'res-math1-endsem-2024',
    title: '[Demo] First Year Math-I Endsem Question Paper (All Sections)',
    subjectId: 'cse-sem1-ord2-man11101',
    category: 'endsem',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Student Contributor (Sample)',
    uploadedAt: '2026-09-02',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Past endsem exam questions covering Stoke theorem, Green theorem, and orthogonal diagonalization.',
    tags: ['Endsem', 'PYQ', 'Vector Calculus'],
  },

  // Physics (CSE sem 2, PHN12502)
  {
    id: 'res-phys-notes-01',
    title: '[Demo] Quantum Mechanics & Wave Optics Concise Revision Notes',
    subjectId: 'cse-sem2-ord1-phn12502',
    category: 'notes',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Peer Contributor (Sample)',
    uploadedAt: '2026-08-25',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Schrodinger equation derivations, particle in a 1D box, interference in thin films, and laser population inversion.',
    tags: ['Physics', 'Quantum', 'Optics'],
  },

  // Engineering Thermodynamics (ME sem 1, MEN11101)
  {
    id: 'res-thermo-notes-01',
    title: '[Demo] Thermodynamics & Steam Cycles Formula Sheet and Solved Numericals',
    subjectId: 'me-sem1-ord5-men11101',
    category: 'notes',
    fileType: 'pdf',
    previewUrl: '/sample-preview.pdf',
    author: 'Mechanical Society (Sample)',
    uploadedAt: '2026-09-09',
    downloadsCount: 0,
    verified: false,
    description: 'Demo placeholder entry; no real file is attached. Step-by-step steam table interpolation, Mollier chart problem walkthroughs, and Carnot efficiency proofs.',
    tags: ['Thermodynamics', 'Rankine', 'Steam Tables'],
  },
];

export const DEMO_RESOURCES: ResourceItem[] = DEMO_RESOURCE_SEEDS.map(hydrateResource);
