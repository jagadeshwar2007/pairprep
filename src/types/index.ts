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
  id: string; // e.g. 'cs-13101'
  code: string; // e.g. 'CS13101'
  name: string; // 'Data Structures and Algorithms'
  shortName?: string;
  branchId: string;
  semester: number;
  yearId: AcademicYearId;
  credits: number;
  description: string;
  topics: string[];
  instructorNote?: string;
}

export type ResourceCategory =
  | 'notes'
  | 'pyq'
  | 'midsem'
  | 'endsem'
  | 'lecture'
  | 'lab'
  | 'practice'
  | 'syllabus'
  | 'reference'
  | 'other';

/** A published resource as shown in the hub (backed by public.resources). */
export interface ResourceItem {
  id: string;
  title: string;
  /** Catalog slug of the subject, e.g. 'cs-13101' (matches SUBJECTS[].id). */
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  /** Catalog slug of the branch, e.g. 'cse' (matches BRANCHES[].id). */
  branchId: string;
  branchCode: string;
  semester: number;
  yearId: AcademicYearId;
  category: ResourceCategory;
  fileType: 'pdf' | 'doc' | 'image' | 'link';
  fileSize?: string;
  /** True when the file is stored in Supabase Storage; false for an external link. */
  hosted: boolean;
  /** Only set for external resources. Rendered as a plain link, never proxied or redirected. */
  externalUrl?: string;
  /** Public contributor credit. Only present when the contributor chose to be credited. */
  author?: string;
  /** ISO 8601 UTC timestamp; formatted in the viewer's locale by <LocalDate>. */
  uploadedAt: string;
  downloadsCount: number;
  verified: boolean;
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

