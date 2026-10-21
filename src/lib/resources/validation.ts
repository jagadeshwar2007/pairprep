// Input schemas for every write API. Objects are strict so unexpected fields (for example
// `role`, `publicationStatus` or `uploadedBy`) are rejected rather than silently stored.

import { z } from 'zod';
import { DEPARTMENT_IDS } from './constants';
import { RESOURCE_TYPES, USER_ROLES } from './types';
import { parseDriveReference } from '../drive/fileId';

const trimmed = (max: number) => z.string().trim().max(max);

const driveFileRef = z
  .string()
  .trim()
  .min(1, 'A Google Drive link or file ID is required')
  .max(2048)
  .refine((v) => {
    const ref = parseDriveReference(v);
    return ref !== null && ref.kind !== 'folder';
  }, 'Enter a Google Drive file link (drive.google.com or docs.google.com) or a file ID');

const metadataFields = {
  title: trimmed(200).min(3, 'Title must be at least 3 characters'),
  description: trimmed(2000).default(''),
  department: z.enum(DEPARTMENT_IDS as [string, ...string[]], { message: 'Choose a department' }),
  semester: z.coerce.number().int().min(1).max(8),
  subject: trimmed(120).min(2, 'Subject is required'),
  subjectCode: trimmed(20)
    .regex(/^[A-Za-z0-9-]*$/, 'Subject code may contain letters, digits and dashes')
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
  academicYear: trimmed(9)
    .regex(/^(\d{4}(-\d{2,4})?)?$/, 'Use a year such as 2024 or 2024-25')
    .optional()
    .transform((v) => v || null),
  resourceType: z.enum(RESOURCE_TYPES),
  unit: trimmed(40).optional().transform((v) => v || null),
  keywords: z
    .array(trimmed(40).min(1))
    .max(15)
    .optional()
    .transform((v) => [...new Set((v ?? []).map((k) => k.toLowerCase()))]),
};

export const registerResourceSchema = z.strictObject({
  ...metadataFields,
  driveRef: driveFileRef,
});
export type RegisterResourceInput = z.infer<typeof registerResourceSchema>;

export const submitResourceSchema = z.strictObject({
  ...metadataFields,
  driveRef: driveFileRef,
  contributorNote: trimmed(500).optional().transform((v) => v || null),
});
export type SubmitResourceInput = z.infer<typeof submitResourceSchema>;

export const updateResourceSchema = z
  .strictObject({
    title: metadataFields.title,
    description: trimmed(2000),
    department: metadataFields.department,
    semester: metadataFields.semester,
    subject: metadataFields.subject,
    subjectCode: metadataFields.subjectCode,
    academicYear: metadataFields.academicYear,
    resourceType: metadataFields.resourceType,
    unit: metadataFields.unit,
    keywords: metadataFields.keywords,
    driveRef: driveFileRef,
  })
  .partial();
export type UpdateResourceInput = z.infer<typeof updateResourceSchema>;

export const assignReviewerSchema = z.strictObject({
  reviewerUid: z.string().trim().min(1).max(128),
});

export const reviewDecisionSchema = z
  .strictObject({
    decision: z.enum(['approve', 'reject']),
    comments: trimmed(2000).optional().transform((v) => v || null),
  })
  .refine((v) => v.decision === 'approve' || !!v.comments, {
    message: 'Comments are required when rejecting a resource',
    path: ['comments'],
  });

export const resourceActionSchema = z.strictObject({
  action: z.enum(['publish', 'unpublish', 'reject']),
  reason: trimmed(1000).optional(),
});

export const updateUserRoleSchema = z.strictObject({
  role: z.enum(USER_ROLES),
  reviewerScope: z
    .strictObject({
      departments: z.array(z.enum(DEPARTMENT_IDS as [string, ...string[]])).max(20).default([]),
      subjects: z.array(trimmed(120).min(1)).max(50).default([]),
    })
    .optional(),
});

export const importFolderSchema = z.strictObject({
  folderRef: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .refine((v) => {
      const ref = parseDriveReference(v);
      return ref !== null && ref.kind !== 'file';
    }, 'Enter a Google Drive folder link or folder ID'),
  defaults: z.strictObject({
    department: metadataFields.department,
    semester: metadataFields.semester.optional(),
    subject: trimmed(120).optional(),
    resourceType: z.enum(RESOURCE_TYPES).optional(),
    academicYear: metadataFields.academicYear,
  }),
  recursive: z.boolean().default(true),
  dryRun: z.boolean().default(false),
});
export type ImportFolderInput = z.infer<typeof importFolderSchema>;

export const driveLookupSchema = z.strictObject({ driveRef: driveFileRef });

export function formatZodError(error: z.ZodError): { message: string; fields: Record<string, string> } {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  const first = error.issues[0];
  return { message: first ? first.message : 'Invalid input', fields };
}
