import { describe, expect, it } from 'vitest';
import { attendanceStanding } from '@/lib/attendance';

describe('attendanceStanding', () => {
  it('computes the current percentage and how many classes can be skipped', () => {
    // 30/36 = 83.3%. At 75%: 30*100/75 = 40 -> may attend up to 40 total, so can miss 4 more.
    expect(attendanceStanding(30, 36, 75)).toMatchObject({ satisfied: true, canSkip: 4, mustAttend: 0 });
    expect(attendanceStanding(30, 36, 75).percentage).toBeCloseTo(83.33, 1);
  });

  it('computes how many consecutive classes are needed to recover', () => {
    // 28/40 = 70%. Need (75*40 - 2800)/(25) = 8 -> (28+8)/(40+8) = 75%.
    const standing = attendanceStanding(28, 40, 75);
    expect(standing).toMatchObject({ satisfied: false, canSkip: 0, mustAttend: 8 });
    expect((28 + standing.mustAttend) / (40 + standing.mustAttend)).toBeGreaterThanOrEqual(0.75);
    expect((28 + standing.mustAttend - 1) / (40 + standing.mustAttend - 1)).toBeLessThan(0.75);
  });

  it('is exactly on target without a margin', () => {
    expect(attendanceStanding(30, 40, 75)).toMatchObject({ satisfied: true, canSkip: 0, mustAttend: 0 });
  });

  it('never invents data for an empty record and survives bad input', () => {
    expect(attendanceStanding(0, 0, 75)).toEqual({ percentage: 0, satisfied: false, canSkip: 0, mustAttend: 0 });
    expect(attendanceStanding(-5, -2, 75)).toEqual({ percentage: 0, satisfied: false, canSkip: 0, mustAttend: 0 });
    // NaN attended counts as 0 and NaN target falls back to 75%: 30 straight classes get 30/40 = 75%.
    const fallback = attendanceStanding(Number.NaN, 10, Number.NaN);
    expect(fallback).toMatchObject({ percentage: 0, mustAttend: 30 });
    expect(fallback.mustAttend / (10 + fallback.mustAttend)).toBe(0.75);
  });

  it('handles a 100% target (recovery impossible) without dividing by zero', () => {
    const s = attendanceStanding(9, 10, 100);
    expect(s.mustAttend).toBe(0);
    expect(Number.isFinite(s.canSkip)).toBe(true);
    expect(attendanceStanding(10, 10, 100)).toMatchObject({ satisfied: true, canSkip: 0 });
  });
});
