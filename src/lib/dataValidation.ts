import type { PracticeQuestion, ResourceCategory, ResourceItem, Subject } from '@/types';

export interface DataIssue {
  code:
    | 'duplicate-id'
    | 'unknown-subject'
    | 'subject-mismatch'
    | 'invalid-category'
    | 'invalid-url'
    | 'invalid-date'
    | 'missing-field'
    | 'demo-not-labeled'
    | 'invalid-answer';
  id: string;
  message: string;
}

const CATEGORIES: ReadonlySet<ResourceCategory> = new Set<ResourceCategory>([
  'notes',
  'pyq',
  'midsem',
  'endsem',
  'lab',
  'practice',
  'syllabus',
  'reference',
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dupes = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dupes.add(id);
    seen.add(id);
  }
  return [...dupes];
}

export function validateSubjects(subjects: Subject[]): DataIssue[] {
  return findDuplicates(subjects.map((s) => s.id)).map((id) => ({
    code: 'duplicate-id' as const,
    id,
    message: `Duplicate subject id "${id}"`,
  }));
}

/** A preview/download URL is allowed to be '#', an absolute http(s) URL, or a site-relative path. */
export function isValidResourceUrl(url: string): boolean {
  return url === '#' || /^https?:\/\/\S+$/.test(url) || /^\/[^\s]*$/.test(url);
}

export function validateResources(resources: ResourceItem[], subjects: Subject[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const subjectsById = new Map(subjects.map((s) => [s.id, s]));

  for (const id of findDuplicates(resources.map((r) => r.id))) {
    issues.push({ code: 'duplicate-id', id, message: `Duplicate resource id "${id}"` });
  }

  for (const r of resources) {
    if (!r.id?.trim() || !r.title?.trim()) {
      issues.push({ code: 'missing-field', id: r.id || '(no id)', message: 'Resource needs an id and a title' });
    }

    const subject = subjectsById.get(r.subjectId);
    if (!subject) {
      issues.push({
        code: 'unknown-subject',
        id: r.id,
        message: `subjectId "${r.subjectId}" does not exist in the subject dataset`,
      });
    } else {
      const expectedCode = subject.courseCode || subject.code;
      const mismatches: string[] = [];
      if (r.subjectCode !== expectedCode) mismatches.push(`subjectCode "${r.subjectCode}" != "${expectedCode}"`);
      if (r.branchId !== subject.branchId) mismatches.push(`branchId "${r.branchId}" != "${subject.branchId}"`);
      if (r.semester !== subject.semester) mismatches.push(`semester ${r.semester} != ${subject.semester}`);
      if (r.yearId !== subject.yearId) mismatches.push(`yearId "${r.yearId}" != "${subject.yearId}"`);
      if (mismatches.length > 0) {
        issues.push({
          code: 'subject-mismatch',
          id: r.id,
          message: `Denormalized fields disagree with subject "${subject.id}": ${mismatches.join('; ')}`,
        });
      }
    }

    if (!CATEGORIES.has(r.category)) {
      issues.push({ code: 'invalid-category', id: r.id, message: `Unknown category "${r.category}"` });
    }

    for (const [field, url] of [
      ['downloadUrl', r.downloadUrl],
      ['previewUrl', r.previewUrl],
    ] as const) {
      if (url !== undefined && !isValidResourceUrl(url)) {
        issues.push({ code: 'invalid-url', id: r.id, message: `${field} "${url}" is not '#', http(s) or a site path` });
      }
    }

    if (!ISO_DATE.test(r.uploadedAt) || Number.isNaN(Date.parse(r.uploadedAt))) {
      issues.push({ code: 'invalid-date', id: r.id, message: `uploadedAt "${r.uploadedAt}" is not YYYY-MM-DD` });
    }

    if (r.isDemo && !r.title.startsWith('[Demo]')) {
      issues.push({ code: 'demo-not-labeled', id: r.id, message: 'Demo resources must have a "[Demo]" title prefix' });
    }
    if (r.isDemo && r.verified) {
      issues.push({ code: 'demo-not-labeled', id: r.id, message: 'Demo resources must not be marked verified' });
    }
  }

  return issues;
}

export function validatePracticeQuestions(questions: PracticeQuestion[], subjects: Subject[]): DataIssue[] {
  const issues: DataIssue[] = [];
  const subjectIds = new Set(subjects.map((s) => s.id));

  for (const id of findDuplicates(questions.map((q) => q.id))) {
    issues.push({ code: 'duplicate-id', id, message: `Duplicate question id "${id}"` });
  }
  for (const q of questions) {
    if (!subjectIds.has(q.subjectId)) {
      issues.push({ code: 'unknown-subject', id: q.id, message: `subjectId "${q.subjectId}" does not exist` });
    }
    if (!Number.isInteger(q.correctAnswer) || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
      issues.push({ code: 'invalid-answer', id: q.id, message: `correctAnswer ${q.correctAnswer} is outside the options` });
    }
  }
  return issues;
}
