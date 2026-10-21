// Row shapes returned by Supabase for the tables the UI reads. Regenerate/verify against the live
// schema with `supabase gen types typescript` once a project is linked (see README).

import type { AcademicYearId, ResourceCategory } from './index';

export type ContributionStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';

export interface SubjectRef {
  slug: string;
  code: string;
  name: string;
  semester: number;
  academic_year: AcademicYearId;
  branches: { slug: string; code: string };
}

export interface ContributionRow {
  id: string;
  submitted_by: string;
  subject_id: string;
  title: string;
  description: string | null;
  resource_type: ResourceCategory;
  storage_path: string | null;
  external_url: string | null;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  contributor_credit: string | null;
  status: ContributionStatus;
  revision: number;
  claimed_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_feedback: string | null;
  files_purged_at: string | null;
  created_at: string;
  updated_at: string;
  subjects: SubjectRef | null;
}

export interface ReviewRow {
  id: string;
  contribution_id: string;
  revision: number;
  reviewer_id: string | null;
  action: 'start_review' | 'approve' | 'reject' | 'request_changes' | 'flag' | 'unflag';
  feedback: string | null;
  created_at: string;
}

export interface RevisionRow {
  id: string;
  contribution_id: string;
  revision: number;
  title: string;
  description: string | null;
  resource_type: ResourceCategory;
  storage_path: string | null;
  external_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface AuditRow {
  id: number;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export const CONTRIBUTION_SELECT =
  'id, submitted_by, subject_id, title, description, resource_type, storage_path, external_url, file_name, file_size, mime_type, contributor_credit, status, revision, claimed_by, reviewed_by, reviewed_at, review_feedback, files_purged_at, created_at, updated_at, subjects(slug, code, name, semester, academic_year, branches(slug, code))';
