export type AcademicYearId = 'first-year' | 'second-year' | 'third-year' | 'fourth-year';

export interface AcademicYear {
  id: AcademicYearId;
  yearNumber: 1 | 2 | 3 | 4;
  title: string;
  badge: string;
  description: string;
  semesters: number[];
  color: string;
}

export interface Branch {
  id: string; // e.g. 'cse', 'ece', 'ee', 'me', 'ce', 'che', 'pie', 'biotech'
  code: string; // e.g. 'CSE'
  name: string; // 'Computer Science and Engineering'
  shortName: string;
  description: string;
  iconName: string;
  color: string;
  semesters: number[];
}

export interface Subject {
  id: string; // e.g. 'cse-sem1-ord1-cyn11502'
  code: string; // e.g. 'CYN11502'
  name: string; // e.g. 'Chemistry'
  shortName?: string;
  branchId: string;
  branch?: string;
  branchCode?: string;
  semester: number;
  year?: number;
  yearId: AcademicYearId;
  order?: number;
  courseCode?: string;
  title?: string;
  L?: string;
  T?: string;
  P?: string;
  ltp?: string;
  credits: number;
  type?: string;
  note?: string;
  effectiveFrom?: string;
  sourceUrl?: string;
  hasMissingCode?: boolean;
  isQuestionableCode?: boolean;
  description: string;
  topics: string[];
  instructorNote?: string;
}

export type ResourceCategory =
  | 'notes'
  | 'pyq'
  | 'midsem'
  | 'endsem'
  | 'lab'
  | 'practice'
  | 'syllabus'
  | 'reference';

export interface ResourceItem {
  id: string;
  title: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  branchId: string;
  branchCode: string;
  semester: number;
  yearId: AcademicYearId;
  category: ResourceCategory;
  fileType: 'pdf' | 'doc' | 'zip' | 'link';
  fileSize?: string;
  downloadUrl: string;
  previewUrl?: string;
  author: string;
  uploadedAt: string;
  downloadsCount: number;
  verified: boolean;
  /** True for placeholder entries with no real file attached. */
  isDemo?: boolean;
  description?: string;
  tags?: string[];
}

export interface PracticeQuestion {
  id: string;
  subjectId: string;
  subjectName: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  question: string;
  codeSnippet?: string;
  options: string[];
  correctAnswer: number; // 0-indexed
  explanation: string;
  yearReference?: string;
}

export interface AttendanceRecord {
  courseName: string;
  attended: number;
  total: number;
  minRequiredPercent: number;
}

export interface CourseGradeEntry {
  id: string;
  name: string;
  credits: number;
  grade: 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D' | 'F';
}

export interface SemesterGpaEntry {
  id: string;
  semesterNumber: number;
  semesterName: string;
  sgpa: number;
  credits: number;
}

export * from './calendar';

