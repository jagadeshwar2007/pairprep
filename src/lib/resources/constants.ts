import { BRANCHES } from '@/data/academicData';
import type { PublicationStatus, ResourceType, UserRole, VerificationStatus } from './types';

export const RESOURCE_TYPE_INFO: Record<
  ResourceType,
  { label: string; shortLabel: string; description: string; badgeClass: string }
> = {
  pyq: {
    label: 'Previous-Year Question Papers',
    shortLabel: 'PYQ',
    description: 'Past midsem and endsem examination papers.',
    badgeClass:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  },
  question_bank: {
    label: 'Question Banks',
    shortLabel: 'Question Bank',
    description: 'Compiled questions grouped by unit or topic.',
    badgeClass:
      'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  },
  notes: {
    label: 'Study Notes',
    shortLabel: 'Notes',
    description: 'Lecture notes and handwritten summaries.',
    badgeClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  },
  lab_manual: {
    label: 'Lab Manuals',
    shortLabel: 'Lab Manual',
    description: 'Laboratory manuals, experiment lists and viva questions.',
    badgeClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  },
  model_paper: {
    label: 'Model Question Papers',
    shortLabel: 'Model Paper',
    description: 'Sample and model papers for exam practice.',
    badgeClass:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  },
  other: {
    label: 'Other Study Materials',
    shortLabel: 'Other',
    description: 'Syllabi, reference material and everything else.',
    badgeClass:
      'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800/80 dark:text-slate-200 dark:border-slate-700',
  },
};

/** First-year courses are common to all branches at MNNIT. */
export const COMMON_DEPARTMENT = { id: 'common', code: 'Common', name: 'First Year (Common)' };

export const DEPARTMENTS: Array<{ id: string; code: string; name: string }> = [
  COMMON_DEPARTMENT,
  ...BRANCHES.map((b) => ({ id: b.id, code: b.code, name: b.name })),
];

export const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id);

export function departmentLabel(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.code ?? id.toUpperCase();
}

export function departmentName(id: string): string {
  return DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
}

export const SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

export const VERIFICATION_STATUS_INFO: Record<
  VerificationStatus,
  { label: string; variant: 'warning' | 'primary' | 'success' | 'danger' }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  under_review: { label: 'Under Review', variant: 'primary' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export const PUBLICATION_STATUS_INFO: Record<
  PublicationStatus,
  { label: string; variant: 'neutral' | 'success' | 'outline' }
> = {
  draft: { label: 'Draft', variant: 'neutral' },
  published: { label: 'Published', variant: 'success' },
  unpublished: { label: 'Unpublished', variant: 'outline' },
};

export const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  reviewer: 'Reviewer',
  admin: 'Administrator',
};

/** MIME types PairPrep will register. Drive's viewer can preview all of these. */
export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/vnd.google-apps.document': 'Google Doc',
  'application/vnd.google-apps.presentation': 'Google Slides',
  'application/vnd.google-apps.spreadsheet': 'Google Sheet',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
};

export function isSupportedMimeType(mimeType: string): boolean {
  return Object.prototype.hasOwnProperty.call(SUPPORTED_MIME_TYPES, mimeType);
}

export function fileFormatLabel(mimeType: string): string {
  return SUPPORTED_MIME_TYPES[mimeType] ?? 'File';
}

export function formatFileSize(bytes: number | null): string | null {
  if (bytes == null || !Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
