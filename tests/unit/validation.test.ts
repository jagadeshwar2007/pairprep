import { describe, expect, it } from 'vitest';
import {
  importFolderSchema,
  reviewDecisionSchema,
  submitResourceSchema,
  updateUserRoleSchema,
} from '@/lib/resources/validation';
import { reviewerCanReview } from '@/lib/server/auth';

const valid = {
  title: 'Engineering Physics endsem 2024',
  department: 'common',
  semester: 1,
  subject: 'Engineering Physics',
  resourceType: 'pyq',
  driveRef: 'https://drive.google.com/file/d/1R8IjP3eDpeYkhrmeFcGzxWyJ368vohJn/view',
};

describe('validation', () => {
  it('accepts a valid submission and normalises fields', () => {
    const out = submitResourceSchema.parse({ ...valid, subjectCode: 'ph11101', keywords: ['Optics', 'optics'] });
    expect(out.subjectCode).toBe('PH11101');
    expect(out.keywords).toEqual(['optics']);
    expect(out.academicYear).toBeNull();
  });
  it('rejects privileged fields smuggled into a submission', () => {
    expect(submitResourceSchema.safeParse({ ...valid, publicationStatus: 'published' }).success).toBe(false);
    expect(submitResourceSchema.safeParse({ ...valid, role: 'admin' }).success).toBe(false);
    expect(submitResourceSchema.safeParse({ ...valid, uploadedBy: 'someone' }).success).toBe(false);
  });
  it('rejects non-Drive links and folders as files', () => {
    expect(submitResourceSchema.safeParse({ ...valid, driveRef: 'https://example.com/a.pdf' }).success).toBe(false);
    expect(
      submitResourceSchema.safeParse({ ...valid, driveRef: 'https://drive.google.com/drive/folders/16g1SvodQLuXZknBlNXjVJXmBMUkcmZ8V' }).success
    ).toBe(false);
  });
  it('rejects unknown departments, bad semesters and bad years', () => {
    expect(submitResourceSchema.safeParse({ ...valid, department: 'xyz' }).success).toBe(false);
    expect(submitResourceSchema.safeParse({ ...valid, semester: 9 }).success).toBe(false);
    expect(submitResourceSchema.safeParse({ ...valid, academicYear: 'last year' }).success).toBe(false);
  });
  it('requires comments when rejecting', () => {
    expect(reviewDecisionSchema.safeParse({ decision: 'reject' }).success).toBe(false);
    expect(reviewDecisionSchema.safeParse({ decision: 'reject', comments: 'Blurry scan' }).success).toBe(true);
    expect(reviewDecisionSchema.safeParse({ decision: 'approve' }).success).toBe(true);
  });
  it('validates role updates and folder imports', () => {
    expect(updateUserRoleSchema.safeParse({ role: 'superuser' }).success).toBe(false);
    expect(
      importFolderSchema.safeParse({
        folderRef: 'https://drive.google.com/drive/folders/16g1SvodQLuXZknBlNXjVJXmBMUkcmZ8V',
        defaults: { department: 'common' },
      }).success
    ).toBe(true);
  });
});

describe('reviewer scope', () => {
  const resource = { department: 'cse', subject: 'Data Structures', subjectCode: 'CS13101' };
  it('limits reviewers to their scope', () => {
    expect(reviewerCanReview({ role: 'reviewer', reviewerScope: { departments: [], subjects: [] } }, resource)).toBe(true);
    expect(reviewerCanReview({ role: 'reviewer', reviewerScope: { departments: ['ece'], subjects: [] } }, resource)).toBe(false);
    expect(reviewerCanReview({ role: 'reviewer', reviewerScope: { departments: ['cse'], subjects: ['cs13101'] } }, resource)).toBe(true);
    expect(reviewerCanReview({ role: 'reviewer', reviewerScope: { departments: [], subjects: ['physics'] } }, resource)).toBe(false);
  });
  it('never lets students review and always lets admins', () => {
    expect(reviewerCanReview({ role: 'student', reviewerScope: { departments: [], subjects: [] } }, resource)).toBe(false);
    expect(reviewerCanReview({ role: 'admin', reviewerScope: { departments: ['ece'], subjects: [] } }, resource)).toBe(true);
  });
});
