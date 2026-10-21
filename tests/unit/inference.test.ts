import { describe, expect, it } from 'vitest';
import {
  inferAcademicYear,
  inferResourceType,
  inferSemester,
  inferSubject,
  inferUnit,
  titleFromFileName,
} from '@/lib/drive/inference';

describe('Drive import inference', () => {
  it('reads semesters from folder names', () => {
    expect(inferSemester(['1st Sem', 'Notes'])).toBe(1);
    expect(inferSemester(['8th sem'])).toBe(8);
    expect(inferSemester(['Semester 4'])).toBe(4);
    expect(inferSemester(['Third Semester'])).toBe(3);
    expect(inferSemester(['Physics'])).toBeNull();
  });
  it('reads resource types', () => {
    expect(inferResourceType(['1st Sem', 'Notes'])).toBe('notes');
    expect(inferResourceType(['PYQs', 'Maths endsem 2023.pdf'])).toBe('pyq');
    expect(inferResourceType(['Question Bank'])).toBe('question_bank');
    expect(inferResourceType(['Lab'])).toBe('lab_manual');
    expect(inferResourceType(['Model paper.pdf'])).toBe('model_paper');
    expect(inferResourceType(['Misc'])).toBeNull();
  });
  it('reads years, units, titles and subjects', () => {
    expect(inferAcademicYear('Endsem 2023-24.pdf')).toBe('2023-24');
    expect(inferAcademicYear('Midsem 2022.pdf')).toBe('2022');
    expect(inferUnit('Unit 01.pdf')).toBe('1');
    expect(titleFromFileName('Unit_01 notes.pdf')).toBe('Unit 01 notes');
    expect(inferSubject(['1st Sem', 'Engineering Physics', 'Notes'])).toBe('Engineering Physics');
    expect(inferSubject(['1st Sem', 'Notes'])).toBeNull();
  });
});
