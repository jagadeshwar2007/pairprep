export interface AttendanceStanding {
  percentage: number;
  satisfied: boolean;
  /** Consecutive classes that can still be missed while staying at/above the target (0 if short). */
  canSkip: number;
  /** Consecutive classes that must be attended to reach the target (0 if already satisfied). */
  mustAttend: number;
}

/**
 * The attendance maths used by the calculator and the saved-course list.
 *   can skip x:     attended / (total + x)       >= target  =>  x <= attended*100/target - total
 *   must attend y:  (attended + y) / (total + y) >= target  =>  y >= (target*total - 100*attended) / (100 - target)
 * Pure function of what the student entered; it never assumes a timetable or invents classes.
 */
export function attendanceStanding(attended: number, total: number, targetPercent: number): AttendanceStanding {
  const safeAttended = Math.max(0, Math.floor(Number(attended) || 0));
  const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
  const target = Math.min(100, Math.max(1, Number(targetPercent) || 75));

  const percentage = safeTotal > 0 ? (safeAttended / safeTotal) * 100 : 0;
  const satisfied = percentage >= target;

  const canSkip = safeTotal > 0 && satisfied ? Math.max(0, Math.floor((safeAttended * 100) / target - safeTotal)) : 0;
  const mustAttend =
    safeTotal > 0 && !satisfied && target < 100
      ? Math.max(0, Math.ceil((target * safeTotal - 100 * safeAttended) / (100 - target)))
      : 0;

  return { percentage, satisfied, canSkip, mustAttend };
}
