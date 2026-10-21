/**
 * Pure academic calculations shared by the GPA, CGPA and attendance tools.
 * Kept free of React so they can be unit tested.
 */

// Grading scale used by the SGPA tool. This is an assumption surfaced in the UI banner;
// it has not been verified against the official MNNIT ordinance.
export const GRADE_POINTS: Record<string, number> = {
  'A+': 10,
  A: 9,
  'B+': 8,
  B: 7,
  C: 6,
  D: 4,
  F: 0,
};

export function computeSgpa(courses: Array<{ credits: number; grade: string }>): {
  totalCredits: number;
  totalPoints: number;
  sgpa: number;
} {
  let totalCredits = 0;
  let totalPoints = 0;
  for (const c of courses) {
    const credits = Math.max(0, Number(c.credits) || 0);
    totalCredits += credits;
    totalPoints += credits * (GRADE_POINTS[c.grade] ?? 0);
  }
  return { totalCredits, totalPoints, sgpa: totalCredits > 0 ? totalPoints / totalCredits : 0 };
}

export function computeCgpa(semesters: Array<{ credits: number; sgpa: number }>): {
  totalCredits: number;
  cgpa: number;
} {
  let totalCredits = 0;
  let quality = 0;
  for (const s of semesters) {
    const credits = Math.max(0, Number(s.credits) || 0);
    totalCredits += credits;
    quality += credits * (Number(s.sgpa) || 0);
  }
  return { totalCredits, cgpa: totalCredits > 0 ? quality / totalCredits : 0 };
}

export interface AttendanceResult {
  attended: number;
  total: number;
  target: number;
  percentage: number;
  isSatisfied: boolean;
  /** Consecutive classes that can be missed while staying at or above the target. */
  canSkip: number;
  /** Consecutive classes that must be attended to reach the target (0 if already satisfied). */
  mustAttend: number;
  /** True when the target is 100% and attendance is below it: no number of classes can fix it. */
  unreachable: boolean;
}

export function computeAttendance(attendedInput: number, totalInput: number, targetInput: number): AttendanceResult {
  const total = Math.max(0, Math.floor(Number(totalInput) || 0));
  // Attended classes cannot exceed classes conducted.
  const attended = Math.min(total, Math.max(0, Math.floor(Number(attendedInput) || 0)));
  const target = Math.min(100, Math.max(1, Number(targetInput) || 75));

  const percentage = total > 0 ? (attended / total) * 100 : 0;
  // Integer cross-multiplication avoids floating point error right at the threshold.
  const isSatisfied = total > 0 && attended * 100 >= target * total;

  const canSkip = isSatisfied ? Math.max(0, Math.floor((attended * 100) / target - total)) : 0;

  let mustAttend = 0;
  let unreachable = false;
  if (total > 0 && !isSatisfied) {
    if (target >= 100) {
      unreachable = true;
    } else {
      mustAttend = Math.ceil((target * total - 100 * attended) / (100 - target));
    }
  }

  return { attended, total, target, percentage, isSatisfied, canSkip, mustAttend, unreachable };
}
