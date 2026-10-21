export type CalendarEventCategory =
  | 'holiday'
  | 'exam'
  | 'classes'
  | 'registration'
  | 'vacation'
  | 'attendance'
  | 'grades_result'
  | 'activity';

export type SemesterType = 'Odd' | 'Even' | 'Transition';

export type VerificationStatus = 'Verified' | 'Needs Manual Verification';

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD for multi-day events
  category: CalendarEventCategory;
  semester: SemesterType;
  academicYear: string; // e.g. '2026-27'
  sourcePage: 1 | 2;
  originalWording: string;
  verificationStatus: VerificationStatus;
  verificationNote?: string;
  description?: string;
  impactOnClasses: 'no_classes' | 'exams_scheduled' | 'normal_instruction' | 'vacation' | 'administrative';
  instructionalDayStart?: number;
  instructionalDayEnd?: number;
  vacationCodeStart?: string;
  vacationCodeEnd?: string;
}

export interface VerificationReportItem {
  id: string;
  item: string;
  page: 1 | 2;
  observedText: string;
  interpretation: string;
  confidence: 'High' | 'Medium' | 'Low';
  reasonForNote: string;
}

export interface SemesterInfo {
  id: SemesterType;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  totalInstructionalDays: number;
  firstYearInstructionalDaysNote?: string;
  sourcePage: 1 | 2;
}
