import { describe, expect, it } from 'vitest';
import { computeAttendance, computeCgpa, computeSgpa } from '@/lib/academicMath';

describe('computeSgpa', () => {
  it('is the credit-weighted mean of grade points', () => {
    const r = computeSgpa([
      { credits: 4, grade: 'A+' }, // 40
      { credits: 2, grade: 'B' }, // 14
    ]);
    expect(r.totalCredits).toBe(6);
    expect(r.totalPoints).toBe(54);
    expect(r.sgpa).toBeCloseTo(9);
  });

  it('counts F credits toward the denominator', () => {
    expect(computeSgpa([{ credits: 4, grade: 'A+' }, { credits: 4, grade: 'F' }]).sgpa).toBe(5);
  });

  it('is 0 with no credits and ignores negative / NaN credits and unknown grades', () => {
    expect(computeSgpa([]).sgpa).toBe(0);
    expect(computeSgpa([{ credits: -3, grade: 'A' }, { credits: NaN, grade: 'A' }]).totalCredits).toBe(0);
    expect(computeSgpa([{ credits: 4, grade: '??' }]).sgpa).toBe(0);
  });
});

describe('computeCgpa', () => {
  it('is the credit-weighted mean of SGPAs', () => {
    expect(computeCgpa([{ credits: 20, sgpa: 8 }, { credits: 30, sgpa: 9 }]).cgpa).toBeCloseTo(8.6);
  });
  it('is 0 with no credits', () => {
    expect(computeCgpa([]).cgpa).toBe(0);
  });
});

describe('computeAttendance', () => {
  it('computes percentage and satisfied state', () => {
    const r = computeAttendance(28, 36, 75);
    expect(r.percentage).toBeCloseTo(77.78, 1);
    expect(r.isSatisfied).toBe(true);
  });

  it('computes how many classes can be skipped and verifies it', () => {
    const r = computeAttendance(28, 36, 75);
    expect(r.canSkip).toBe(1); // 28/37 = 75.7% ok, 28/38 = 73.7% not ok
    expect((28 * 100) / (36 + r.canSkip)).toBeGreaterThanOrEqual(75);
    expect((28 * 100) / (36 + r.canSkip + 1)).toBeLessThan(75);
  });

  it('is exactly at threshold without floating point error', () => {
    const r = computeAttendance(21, 28, 75);
    expect(r.isSatisfied).toBe(true);
    expect(r.canSkip).toBe(0);
  });

  it('computes how many classes must be attended and verifies it', () => {
    const r = computeAttendance(20, 36, 75);
    expect(r.isSatisfied).toBe(false);
    expect(((20 + r.mustAttend) * 100) / (36 + r.mustAttend)).toBeGreaterThanOrEqual(75);
    expect(((20 + r.mustAttend - 1) * 100) / (36 + r.mustAttend - 1)).toBeLessThan(75);
  });

  it('never reports attended > total', () => {
    const r = computeAttendance(50, 40, 75);
    expect(r.attended).toBe(40);
    expect(r.percentage).toBe(100);
  });

  it('flags an unreachable 100% target instead of reporting 0 classes', () => {
    const r = computeAttendance(9, 10, 100);
    expect(r.unreachable).toBe(true);
    expect(r.mustAttend).toBe(0);
  });

  it('handles zero classes and junk input', () => {
    const r = computeAttendance(0, 0, 75);
    expect(r.isSatisfied).toBe(false);
    expect(r.canSkip).toBe(0);
    expect(r.mustAttend).toBe(0);
    expect(computeAttendance(NaN, NaN, NaN).target).toBe(75);
  });
});
