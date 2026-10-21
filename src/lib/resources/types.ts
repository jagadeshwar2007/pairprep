// Domain model for the Drive-backed resource library.
// Shared by the API (server) and the UI (client); contains no secrets.

export const RESOURCE_TYPES = [
  'pyq',
  'question_bank',
  'notes',
  'lab_manual',
  'model_paper',
  'other',
] as const;
export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const VERIFICATION_STATUSES = ['pending', 'under_review', 'approved', 'rejected'] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

export const PUBLICATION_STATUSES = ['draft', 'published', 'unpublished'] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const USER_ROLES = ['student', 'reviewer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export type ResourceSource = 'admin' | 'import' | 'contribution';

export interface ReviewerScope {
  /** Department ids the reviewer may review. Empty = all departments. */
  departments: string[];
  /** Subject names/codes (lowercase) the reviewer may review. Empty = all subjects. */
  subjects: string[];
}

export interface ApprovalRecord {
  reviewerUid: string;
  assignmentId: string;
  decidedAt: string;
}

/** A resource as stored in Firestore (`resources/{id}`), timestamps serialised to ISO strings. */
export interface Resource {
  id: string;
  title: string;
  description: string;
  department: string;
  semester: number;
  subject: string;
  subjectCode: string | null;
  academicYear: string | null;
  resourceType: ResourceType;
  unit: string | null;
  keywords: string[];
  driveFileId: string;
  mimeType: string;
  fileName: string;
  fileSizeBytes: number | null;
  /** False when the Drive owner disabled download/copy for viewers. */
  downloadAllowed: boolean;
  verificationStatus: VerificationStatus;
  publicationStatus: PublicationStatus;
  source: ResourceSource;
  uploadedBy: string;
  uploaderName: string;
  contributorNote: string | null;
  approval: ApprovalRecord | null;
  rejectionReason: string | null;
  searchText: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** What anonymous visitors receive. Internal fields (uids, review data) are stripped. */
export interface PublicResource {
  id: string;
  title: string;
  description: string;
  department: string;
  semester: number;
  subject: string;
  subjectCode: string | null;
  academicYear: string | null;
  resourceType: ResourceType;
  unit: string | null;
  keywords: string[];
  mimeType: string;
  fileSizeBytes: number | null;
  uploaderName: string;
  verificationStatus: VerificationStatus;
  createdAt: string;
  publishedAt: string | null;
  links: ResourceLinks;
}

export interface ResourceLinks {
  /** Drive's own embeddable viewer. Drive enforces the file's sharing permissions. */
  preview: string;
  /** Opens the file in Drive. */
  open: string;
  /** Present only when the underlying file allows viewers to download. */
  download: string | null;
}

export type ReviewAssignmentStatus = 'assigned' | 'completed' | 'cancelled';
export type ReviewDecision = 'approve' | 'reject';

export interface ReviewAssignment {
  id: string;
  resourceId: string;
  resourceTitle: string;
  reviewerUid: string;
  reviewerName: string;
  assignedBy: string;
  status: ReviewAssignmentStatus;
  decision: ReviewDecision | null;
  comments: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  reviewerScope: ReviewerScope;
  createdAt: string;
  updatedAt: string;
}

export type DriveAvailability =
  | 'available'
  | 'not_found'
  | 'forbidden'
  | 'trashed'
  | 'unsupported'
  | 'not_configured'
  | 'error';

export interface ResourceSearchQuery {
  q?: string;
  department?: string;
  semester?: number;
  subject?: string;
  resourceType?: ResourceType;
  academicYear?: string;
  sort?: 'newest' | 'title';
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ResourceFacets {
  departments: string[];
  semesters: number[];
  subjects: string[];
  resourceTypes: ResourceType[];
  academicYears: string[];
}

export interface AdminStats {
  total: number;
  published: number;
  pending: number;
  underReview: number;
  approvedAwaitingPublication: number;
  rejected: number;
}
