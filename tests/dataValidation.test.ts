import { describe, expect, it } from 'vitest';
import type { PracticeQuestion, ResourceItem, Subject } from '@/types';
import {
  isValidResourceUrl,
  validatePracticeQuestions,
  validateResources,
  validateSubjects,
} from '@/lib/dataValidation';

const subject = (over: Partial<Subject> = {}): Subject => ({
  id: 'cse-sem3-ord1-abc',
  code: 'ABC100',
  courseCode: 'ABC100',
  name: 'Sample',
  title: 'Sample',
  branchId: 'cse',
  semester: 3,
  yearId: 'second-year',
  credits: 4,
  description: '',
  topics: [],
  ...over,
});

const resource = (over: Partial<ResourceItem> = {}): ResourceItem => ({
  id: 'r1',
  title: '[Demo] Notes',
  subjectId: 'cse-sem3-ord1-abc',
  subjectName: 'Sample',
  subjectCode: 'ABC100',
  branchId: 'cse',
  branchCode: 'CSE',
  semester: 3,
  yearId: 'second-year',
  category: 'notes',
  fileType: 'pdf',
  downloadUrl: '#',
  author: 'x',
  uploadedAt: '2026-01-01',
  downloadsCount: 0,
  verified: false,
  isDemo: true,
  ...over,
});

const codes = (r: ResourceItem[], s: Subject[] = [subject()]) => validateResources(r, s).map((i) => i.code);

describe('validateResources', () => {
  it('accepts a consistent resource', () => {
    expect(codes([resource()])).toEqual([]);
  });

  it('detects an unknown subjectId (the original audit bug)', () => {
    expect(codes([resource({ subjectId: 'cs-13101' })])).toContain('unknown-subject');
  });

  it('detects duplicate resource ids', () => {
    expect(codes([resource(), resource()])).toContain('duplicate-id');
  });

  it('detects denormalized fields that disagree with the subject', () => {
    expect(codes([resource({ semester: 5 })])).toContain('subject-mismatch');
    expect(codes([resource({ subjectCode: 'ZZZ' })])).toContain('subject-mismatch');
    expect(codes([resource({ yearId: 'first-year' })])).toContain('subject-mismatch');
    expect(codes([resource({ branchId: 'me' })])).toContain('subject-mismatch');
  });

  it('falls back to subject.code when courseCode is empty', () => {
    const s = subject({ courseCode: '', code: '' });
    expect(codes([resource({ subjectCode: '' })], [s])).toEqual([]);
  });

  it('detects bad category, url, date and unlabeled demo data', () => {
    expect(codes([resource({ category: 'memes' as never })])).toContain('invalid-category');
    expect(codes([resource({ previewUrl: 'javascript:alert(1)' })])).toContain('invalid-url');
    expect(codes([resource({ uploadedAt: '15/09/2026' })])).toContain('invalid-date');
    expect(codes([resource({ uploadedAt: '2026-13-45' })])).toContain('invalid-date');
    expect(codes([resource({ title: 'Real looking title' })])).toContain('demo-not-labeled');
    expect(codes([resource({ verified: true })])).toContain('demo-not-labeled');
  });

  it('detects missing title', () => {
    expect(codes([resource({ title: ' ' })])).toContain('missing-field');
  });
});

describe('isValidResourceUrl', () => {
  it('allows #, https and site paths only', () => {
    expect(isValidResourceUrl('#')).toBe(true);
    expect(isValidResourceUrl('https://drive.google.com/file/d/abc/view')).toBe(true);
    expect(isValidResourceUrl('/sample-preview.pdf')).toBe(true);
    expect(isValidResourceUrl('javascript:alert(1)')).toBe(false);
    expect(isValidResourceUrl('data:text/html,hi')).toBe(false);
    expect(isValidResourceUrl('ftp://x')).toBe(false);
  });
});

describe('validateSubjects', () => {
  it('detects duplicate subject ids', () => {
    expect(validateSubjects([subject(), subject()]).map((i) => i.code)).toEqual(['duplicate-id']);
  });
});

describe('validatePracticeQuestions', () => {
  const q = (over: Partial<PracticeQuestion> = {}): PracticeQuestion => ({
    id: 'q1',
    subjectId: 'cse-sem3-ord1-abc',
    subjectName: 'Sample',
    topic: 't',
    difficulty: 'Easy',
    question: '?',
    options: ['a', 'b'],
    correctAnswer: 1,
    explanation: '',
    ...over,
  });
  const run = (questions: PracticeQuestion[]) =>
    validatePracticeQuestions(questions, [subject()]).map((i) => i.code);

  it('accepts a valid question', () => expect(run([q()])).toEqual([]));
  it('detects unknown subject, duplicate id and out-of-range answer', () => {
    expect(run([q({ subjectId: 'cs-13101' })])).toContain('unknown-subject');
    expect(run([q(), q()])).toContain('duplicate-id');
    expect(run([q({ correctAnswer: 2 })])).toContain('invalid-answer');
    expect(run([q({ correctAnswer: -1 })])).toContain('invalid-answer');
  });
});
