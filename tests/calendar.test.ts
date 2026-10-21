import { describe, expect, it } from 'vitest';
import { OFFICIAL_ACADEMIC_CALENDAR_EVENTS, SEMESTER_METADATA } from '@/data/academicCalendarData';
import { getAcademicSemesterContext, isNonInstructionalDate } from '@/lib/calendarAttendanceHelper';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDate = (d: string) => ISO.test(d) && !Number.isNaN(Date.parse(d));

describe('academic calendar data', () => {
  it('has unique event ids', () => {
    const ids = OFFICIAL_ACADEMIC_CALENDAR_EVENTS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has valid ISO dates and end >= start', () => {
    for (const e of OFFICIAL_ACADEMIC_CALENDAR_EVENTS) {
      expect(validDate(e.startDate), `${e.id} startDate ${e.startDate}`).toBe(true);
      if (e.endDate) {
        expect(validDate(e.endDate), `${e.id} endDate ${e.endDate}`).toBe(true);
        expect(e.endDate >= e.startDate, `${e.id} ends before it starts`).toBe(true);
      }
    }
  });

  it('keeps every event inside the displayed July 2026 - July 2027 window', () => {
    for (const e of OFFICIAL_ACADEMIC_CALENDAR_EVENTS) {
      expect(e.startDate >= '2026-07-01' && e.startDate <= '2027-07-31', `${e.id} ${e.startDate}`).toBe(true);
    }
  });

  it('has semester metadata for Odd and Even', () => {
    const ids = SEMESTER_METADATA.map((s) => s.id);
    expect(ids).toContain('Odd');
    expect(ids).toContain('Even');
  });
});

describe('calendar-attendance bridge', () => {
  it('finds class start/end and exam dates for both semesters', () => {
    for (const sem of ['Odd', 'Even'] as const) {
      const ctx = getAcademicSemesterContext(sem);
      expect(ctx.classesStartDate, sem).toMatch(ISO);
      expect(ctx.classesEndDate, sem).toMatch(ISO);
      expect(ctx.classesEndDate >= ctx.classesStartDate).toBe(true);
      expect(ctx.midsemStart, `${sem} midsem`).toMatch(ISO);
      expect(ctx.endsemStart, `${sem} endsem`).toMatch(ISO);
    }
  });

  it('flags a declared holiday as non-instructional and a plain date as instructional', () => {
    const holiday = OFFICIAL_ACADEMIC_CALENDAR_EVENTS.find((e) => e.category === 'holiday')!;
    expect(isNonInstructionalDate(holiday.startDate).isNonInstructional).toBe(true);
    expect(isNonInstructionalDate('1999-01-01').isNonInstructional).toBe(false);
  });
});
