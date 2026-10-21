import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { DEMO_RESOURCES } from '@/data/resourcesData';
import { DEMO_PRACTICE_QUESTIONS, PRACTICE_SUBJECTS } from '@/data/practiceQuestionsData';
import { validatePracticeQuestions, validateResources, validateSubjects } from '@/lib/dataValidation';

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');

describe('subject dataset', () => {
  it('has unique subject ids', () => {
    expect(validateSubjects(SUBJECTS)).toEqual([]);
  });

  it('keeps all 446 records (incomplete metadata is never a reason to drop a subject)', () => {
    expect(SUBJECTS).toHaveLength(446);
  });

  it('references only known branches and a year that matches the semester', () => {
    const branchIds = new Set(BRANCHES.map((b) => b.id));
    for (const s of SUBJECTS) {
      expect(branchIds.has(s.branchId), `${s.id}: unknown branch ${s.branchId}`).toBe(true);
      const year = ACADEMIC_YEARS.find((y) => y.id === s.yearId);
      expect(year, `${s.id}: unknown year ${s.yearId}`).toBeDefined();
      expect(year!.semesters, `${s.id}: semester ${s.semester} not in ${s.yearId}`).toContain(s.semester);
    }
  });

  it('embeds branch and semester in every id so ids are stable and routable', () => {
    for (const s of SUBJECTS) {
      expect(s.id.startsWith(`${s.branchId}-sem${s.semester}-ord`), s.id).toBe(true);
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
    }
  });
});

describe('demo resources', () => {
  it('pass full validation against the subject dataset', () => {
    expect(validateResources(DEMO_RESOURCES, SUBJECTS)).toEqual([]);
  });

  it('are all clearly labeled as demo data', () => {
    for (const r of DEMO_RESOURCES) {
      expect(r.isDemo).toBe(true);
      expect(r.title.startsWith('[Demo]')).toBe(true);
      expect(r.verified).toBe(false);
      expect(r.downloadsCount).toBe(0);
    }
  });

  it('take subject name, code and placement from the dataset', () => {
    for (const r of DEMO_RESOURCES) {
      const subject = SUBJECTS.find((s) => s.id === r.subjectId)!;
      expect(r.subjectName).toBe(subject.title);
      expect(r.subjectCode).toBe(subject.courseCode);
      expect(r.semester).toBe(subject.semester);
      expect(r.yearId).toBe(subject.yearId);
      expect(r.branchId).toBe(subject.branchId);
    }
  });

  it('attach to subjects that exist, so those subject pages are not empty', () => {
    const ids = new Set(DEMO_RESOURCES.map((r) => r.subjectId));
    expect(ids.size).toBeGreaterThan(0);
    for (const id of ids) {
      expect(SUBJECTS.some((s) => s.id === id), id).toBe(true);
    }
  });

  it('point only at local files that exist in /public', () => {
    for (const r of DEMO_RESOURCES) {
      for (const url of [r.previewUrl, r.downloadUrl]) {
        if (url && url.startsWith('/')) {
          expect(fs.existsSync(path.join(PUBLIC_DIR, url)), `${r.id}: ${url} missing from public/`).toBe(true);
        }
      }
    }
  });

  it('ships a real PDF as the sample placeholder', () => {
    const bytes = fs.readFileSync(path.join(PUBLIC_DIR, 'sample-preview.pdf'));
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(bytes.toString('latin1').trimEnd().endsWith('%%EOF')).toBe(true);
  });
});

describe('practice questions', () => {
  it('pass validation and reference real subjects', () => {
    expect(validatePracticeQuestions(DEMO_PRACTICE_QUESTIONS, SUBJECTS)).toEqual([]);
  });

  it('have at least one question for every quiz filter button', () => {
    for (const p of PRACTICE_SUBJECTS) {
      expect(DEMO_PRACTICE_QUESTIONS.some((q) => q.subjectId === p.subjectId), p.subjectId).toBe(true);
    }
  });
});
