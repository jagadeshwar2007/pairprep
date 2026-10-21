import {
  OFFICIAL_ACADEMIC_CALENDAR_EVENTS,
  SEMESTER_METADATA,
} from '@/data/academicCalendarData';
import { SemesterType, CalendarEvent } from '@/types/calendar';

/**
 * Attendance Tracker Compatibility Layer
 *
 * This utility bridges official institutional calendar events (holidays, exams, vacations)
 * with the student Attendance Calculator/Tracker without assuming fictional class slots or timetables.
 * Student timetables remain decoupled and independently managed.
 */

export interface AcademicSemesterContext {
  semesterType: SemesterType;
  officialInstructionalDays: number;
  classesStartDate: string;
  classesEndDate: string;
  midsemStart: string;
  midsemEnd: string;
  endsemStart: string;
  endsemEnd: string;
  declaredHolidaysCount: number;
  holidaysList: Array<{ title: string; date: string }>;
  vacationsList: Array<{ title: string; startDate: string; endDate?: string }>;
}

export function getAcademicSemesterContext(
  semester: SemesterType = 'Odd'
): AcademicSemesterContext {
  const meta = SEMESTER_METADATA.find((s) => s.id === semester) || SEMESTER_METADATA[0];

  const semesterEvents = OFFICIAL_ACADEMIC_CALENDAR_EVENTS.filter(
    (e) => e.semester === semester
  );

  const holidays = semesterEvents
    .filter((e) => e.category === 'holiday')
    .map((e) => ({ title: e.title, date: e.startDate }));

  const vacations = semesterEvents
    .filter((e) => e.category === 'vacation')
    .map((e) => ({ title: e.title, startDate: e.startDate, endDate: e.endDate }));

  const startClassesEvent = semesterEvents.find((e) => e.category === 'classes' && e.title.includes('Start'));
  const endClassesEvent = semesterEvents.find((e) => e.category === 'classes' && e.title.includes('End'));

  const midsemEvent = semesterEvents.find((e) => e.category === 'exam' && e.title.toLowerCase().includes('mid sem'));
  const endsemEvent = semesterEvents.find((e) => e.category === 'exam' && e.title.toLowerCase().includes('end sem'));

  return {
    semesterType: semester,
    officialInstructionalDays: meta.totalInstructionalDays,
    classesStartDate: startClassesEvent ? startClassesEvent.startDate : meta.startDate,
    classesEndDate: endClassesEvent ? endClassesEvent.startDate : meta.endDate,
    midsemStart: midsemEvent ? midsemEvent.startDate : '',
    midsemEnd: midsemEvent?.endDate || midsemEvent?.startDate || '',
    endsemStart: endsemEvent ? endsemEvent.startDate : '',
    endsemEnd: endsemEvent?.endDate || endsemEvent?.startDate || '',
    declaredHolidaysCount: holidays.length,
    holidaysList: holidays,
    vacationsList: vacations,
  };
}

/**
 * Checks if a specific date is a non-instructional day (official holiday, midsem break, or vacation)
 */
export function isNonInstructionalDate(dateStr: string): {
  isNonInstructional: boolean;
  reason?: string;
  event?: CalendarEvent;
} {
  const match = OFFICIAL_ACADEMIC_CALENDAR_EVENTS.find((e) => {
    const isWithinRange = !e.endDate
      ? e.startDate === dateStr
      : dateStr >= e.startDate && dateStr <= e.endDate;
    return isWithinRange && (e.category === 'holiday' || e.category === 'vacation');
  });

  if (match) {
    return {
      isNonInstructional: true,
      reason: match.title,
      event: match,
    };
  }

  return { isNonInstructional: false };
}
