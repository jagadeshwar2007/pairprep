'use client';

import React, { useState, useMemo } from 'react';
import {
  OFFICIAL_ACADEMIC_CALENDAR_EVENTS,
  CATEGORY_CONFIG,
  getEventsForDate,
} from '@/data/academicCalendarData';
import {
  CalendarEvent,
  CalendarEventCategory,
  SemesterType,
} from '@/types/calendar';
import { EventDetailModal } from './EventDetailModal';
import { VerificationReportModal } from './VerificationReportModal';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  FileCheck2,
  List,
  Grid,
} from 'lucide-react';

// Academic timeline covers July 2026 to July 2027
const ACADEMIC_MONTHS = [
  { year: 2026, month: 6, label: 'July 2026', semester: 'Odd' as SemesterType },
  { year: 2026, month: 7, label: 'August 2026', semester: 'Odd' as SemesterType },
  { year: 2026, month: 8, label: 'September 2026', semester: 'Odd' as SemesterType },
  { year: 2026, month: 9, label: 'October 2026', semester: 'Odd' as SemesterType },
  { year: 2026, month: 10, label: 'November 2026', semester: 'Odd' as SemesterType },
  { year: 2026, month: 11, label: 'December 2026', semester: 'Odd' as SemesterType },
  { year: 2027, month: 0, label: 'January 2027', semester: 'Even' as SemesterType },
  { year: 2027, month: 1, label: 'February 2027', semester: 'Even' as SemesterType },
  { year: 2027, month: 2, label: 'March 2027', semester: 'Even' as SemesterType },
  { year: 2027, month: 3, label: 'April 2027', semester: 'Even' as SemesterType },
  { year: 2027, month: 4, label: 'May 2027', semester: 'Even' as SemesterType },
  { year: 2027, month: 5, label: 'June 2027', semester: 'Even' as SemesterType },
  { year: 2027, month: 6, label: 'July 2027', semester: 'Transition' as SemesterType },
];

export function CalendarView() {
  const [selectedSemester, setSelectedSemester] = useState<'All' | SemesterType>('All');
  const [selectedCategory, setSelectedCategory] = useState<'all' | CalendarEventCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeMonthIdx, setActiveMonthIdx] = useState(0); // Default to July 2026 (start of session)

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);

  const activeMonth = ACADEMIC_MONTHS[activeMonthIdx];

  // Filtered Events
  const filteredEvents = useMemo(() => {
    return OFFICIAL_ACADEMIC_CALENDAR_EVENTS.filter((event) => {
      const matchSemester =
        selectedSemester === 'All' || event.semester === selectedSemester;
      const matchCategory =
        selectedCategory === 'all' || event.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        event.title.toLowerCase().includes(q) ||
        event.originalWording.toLowerCase().includes(q) ||
        event.description?.toLowerCase().includes(q) ||
        event.startDate.includes(q);

      return matchSemester && matchCategory && matchSearch;
    });
  }, [selectedSemester, selectedCategory, searchQuery]);

  // Handle Event Click
  const handleOpenEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setIsDetailModalOpen(true);
  };

  // Calendar Grid Builder for Active Month
  const daysInMonth = new Date(activeMonth.year, activeMonth.month + 1, 0).getDate();
  const firstDayOfWeek = new Date(activeMonth.year, activeMonth.month, 1).getDay(); // 0 = Sun

  const calendarDays = [];
  // Leading blank days
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null);
  }
  // Days of current month
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push(d);
  }

  const handlePrevMonth = () => {
    if (activeMonthIdx > 0) setActiveMonthIdx(activeMonthIdx - 1);
  };

  const handleNextMonth = () => {
    if (activeMonthIdx < ACADEMIC_MONTHS.length - 1) setActiveMonthIdx(activeMonthIdx + 1);
  };

  return (
    <div className="space-y-8">
      {/* Official Footnote / Disclaimer Banner */}
      <div className="bg-white rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 p-4.5 text-xs text-indigo-950 dark:text-indigo-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start gap-3">
          <FileCheck2 className="h-5 w-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-sm block">
              Academic calendar, session 2026–27
            </span>
            <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
              Transcribed from a two-page institute circular. Odd Semester: July–December 2026 (77 Instructional Days); Even Semester: January–June 2027 (71 Instructional Days).
            </p>
            <p className="text-[10px] text-amber-700 dark:text-amber-300 italic pt-0.5">
              &ldquo;The declared Institute holidays will be considered final in case of any mismatch with the proposed academic calendar.&rdquo;
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsVerificationModalOpen(true)}
          className="shrink-0 text-xs font-semibold"
        >
          View Verification Audit
        </Button>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-3.5 sm:p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Odd Sem Instruction
          </span>
          <div className="text-2xl sm:text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-0.5">
            77 Days
          </div>
          <span className="text-[10px] text-slate-500">Jul 20 – Nov 13, 2026</span>
        </Card>

        <Card className="p-3.5 sm:p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Even Sem Instruction
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
            71 Days
          </div>
          <span className="text-[10px] text-slate-500">Jan 4 – Apr 23, 2027</span>
        </Card>

        <Card className="p-3.5 sm:p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Declared Holidays
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400 mt-0.5">
            18 Days
          </div>
          <span className="text-[10px] text-slate-500">Across Full Year</span>
        </Card>

        <Card className="p-3.5 sm:p-4 border-slate-200 dark:border-slate-800">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">
            Vacation Periods
          </span>
          <div className="text-2xl sm:text-3xl font-black text-teal-600 dark:text-teal-400 mt-0.5">
            60 Days
          </div>
          <span className="text-[10px] text-slate-500">Winter (W1-12) & Summer (S1-48)</span>
        </Card>
      </div>

      {/* Primary Navigation & Controls Bar */}
      <div className="space-y-4">
        {/* Row 1: Semester Tabs & View Mode Switcher */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Semester Selector */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
            <button
              onClick={() => setSelectedSemester('All')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSemester === 'All'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Full Academic Year (2026-27)
            </button>
            <button
              onClick={() => {
                setSelectedSemester('Odd');
                setActiveMonthIdx(0); // Jump to July 2026
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSemester === 'Odd'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Odd Semester (Jul–Dec 2026)
            </button>
            <button
              onClick={() => {
                setSelectedSemester('Even');
                setActiveMonthIdx(6); // Jump to Jan 2027
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSemester === 'Even'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Even Semester (Jan–Jun 2027)
            </button>
            <button
              onClick={() => {
                setSelectedSemester('Transition');
                setActiveMonthIdx(12); // Jump to July 2027
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSemester === 'Transition'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Transition (Jul 2027)
            </button>
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              <span>Month Grid</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <List className="h-3.5 w-3.5" />
              <span>Agenda List ({filteredEvents.length})</span>
            </button>
          </div>
        </div>

        {/* Row 2: Search & Category Filter Pills */}
        <div className="space-y-3">
          <div className="max-w-md">
            <Input
              type="text"
              placeholder="Search holiday, exam, registration, or event..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              All Events ({OFFICIAL_ACADEMIC_CALENDAR_EVENTS.length})
            </button>

            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
              const count = OFFICIAL_ACADEMIC_CALENDAR_EVENTS.filter((e) => e.category === key).length;
              const isSelected = selectedCategory === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelectedCategory(key as CalendarEventCategory)}
                  className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 border ${
                    isSelected
                      ? `${config.badgeColor} shadow-xs font-bold ring-1 ring-indigo-500`
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className={`h-2 w-2 rounded-full ${config.dotColor}`} />
                  <span>{config.label}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===================== VIEW MODE 1: MONTH GRID VIEW ===================== */}
      {viewMode === 'grid' && (
        <Card className="p-4 sm:p-6 space-y-6 border-slate-200 dark:border-slate-800 shadow-sm">
          {/* Month Header & Navigator */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                <CalendarIcon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {activeMonth.label}
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  {activeMonth.semester} Semester • Academic Session 2026-27
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevMonth}
                disabled={activeMonthIdx === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Prev Month
              </Button>

              <select
                className="h-8 min-w-0 flex-1 sm:flex-none text-xs font-semibold rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 text-slate-700 dark:text-slate-200"
                value={activeMonthIdx}
                onChange={(e) => setActiveMonthIdx(parseInt(e.target.value))}
              >
                {ACADEMIC_MONTHS.map((m, idx) => (
                  <option key={idx} value={idx}>
                    {m.label} ({m.semester} Sem)
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={handleNextMonth}
                disabled={activeMonthIdx === ACADEMIC_MONTHS.length - 1}
              >
                Next Month <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>

          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-rose-500">Sun</span>
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span className="text-indigo-500">Sat</span>
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((dayNum, idx) => {
              if (dayNum === null) {
                return (
                  <div
                    key={`blank-${idx}`}
                    className="min-h-[85px] sm:min-h-[110px] rounded-xl bg-slate-50/40 dark:bg-slate-950/20 border border-transparent"
                  />
                );
              }

              const dateStr = `${activeMonth.year}-${(activeMonth.month + 1).toString().padStart(2, '0')}-${dayNum.toString().padStart(2, '0')}`;
              const dayEvents = getEventsForDate(dateStr);

              const isSunday = (idx % 7) === 0;
              const isSaturday = (idx % 7) === 6;

              const hasHoliday = dayEvents.some((e) => e.category === 'holiday');
              const hasExam = dayEvents.some((e) => e.category === 'exam');
              const hasVacation = dayEvents.some((e) => e.category === 'vacation');

              let dayCardBg = 'bg-white dark:bg-slate-900/60 border-slate-200/70 dark:border-slate-800/80';
              if (hasHoliday) {
                dayCardBg = 'bg-rose-50/80 dark:bg-rose-950/30 border-rose-300 dark:border-rose-900/60';
              } else if (hasExam) {
                dayCardBg = 'bg-amber-50/80 dark:bg-amber-950/30 border-amber-300 dark:border-amber-900/60';
              } else if (hasVacation) {
                dayCardBg = 'bg-teal-50/60 dark:bg-teal-950/20 border-teal-200 dark:border-teal-900/40';
              }

              return (
                <div
                  key={dayNum}
                  onClick={() => {
                    if (dayEvents.length > 0) {
                      handleOpenEvent(dayEvents[0]);
                    }
                  }}
                  className={`min-h-[85px] sm:min-h-[110px] p-2 rounded-xl border transition-all flex flex-col justify-between ${dayCardBg} ${
                    dayEvents.length > 0
                      ? 'cursor-pointer hover:shadow-md hover:border-indigo-400 group'
                      : 'hover:border-slate-300'
                  }`}
                >
                  {/* Date number & mini indicators */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-bold ${
                        hasHoliday || isSunday
                          ? 'text-rose-600 dark:text-rose-400 font-extrabold'
                          : isSaturday
                          ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                          : 'text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {dayNum}
                    </span>

                    {dayEvents.length > 0 && (
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 group-hover:scale-125 transition-transform" />
                    )}
                  </div>

                  {/* Day Events preview */}
                  <div className="space-y-1 mt-1 overflow-hidden">
                    {dayEvents.slice(0, 2).map((ev) => {
                      const cfg = CATEGORY_CONFIG[ev.category];
                      return (
                        <div
                          key={ev.id}
                          className={`text-[10px] leading-tight font-medium px-1.5 py-0.5 rounded truncate ${cfg.badgeColor}`}
                          title={ev.title}
                        >
                          {ev.title}
                        </div>
                      );
                    })}
                    {dayEvents.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-semibold pl-1 block">
                        +{dayEvents.length - 2} more
                      </span>
                    )}
                  </div>

                  {/* Bottom indicator for vacation/instructional day */}
                  <div className="mt-auto pt-1 flex justify-between items-center text-[9px] text-slate-400 font-mono">
                    {dayEvents[0]?.instructionalDayStart ? (
                      <span className="text-slate-500 font-semibold">
                        Day {dayEvents[0].instructionalDayStart}
                      </span>
                    ) : dayEvents[0]?.vacationCodeStart ? (
                      <span className="text-teal-600 dark:text-teal-400 font-bold">
                        {dayEvents[0].vacationCodeStart}
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Color Legend */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span>Institute Holiday</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span>Midsem / Endsem / Practical Exams</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
              <span>Vacation / Mid-Term Break</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span>Classes Start / End</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span>Registration Deadlines</span>
            </div>
          </div>
        </Card>
      )}

      {/* ===================== VIEW MODE 2: CHRONOLOGICAL AGENDA LIST ===================== */}
      {viewMode === 'list' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Showing {filteredEvents.length} scheduled academic events</span>
            <span>Sorted chronologically</span>
          </div>

          {filteredEvents.length > 0 ? (
            <div className="space-y-3">
              {filteredEvents.map((event) => {
                const cfg = CATEGORY_CONFIG[event.category];
                return (
                  <div
                    key={event.id}
                    onClick={() => handleOpenEvent(event)}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.badgeColor}`}
                        >
                          {cfg.label}
                        </span>
                        <Badge variant="outline">
                          {event.semester} Semester
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono">
                          Source: Page {event.sourcePage}
                        </span>
                        {event.verificationStatus === 'Verified' ? (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-full">
                            Verified
                          </span>
                        ) : (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full">
                            Check Note
                          </span>
                        )}
                      </div>

                      <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {event.title}
                      </h4>

                      <p className="text-xs text-slate-500 font-mono">
                        Original wording: &ldquo;{event.originalWording}&rdquo;
                      </p>
                    </div>

                    <div className="sm:text-right shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {event.startDate}
                        {event.endDate && event.endDate !== event.startDate ? ` to ${event.endDate}` : ''}
                      </div>
                      {event.instructionalDayStart && (
                        <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
                          Day {event.instructionalDayStart}
                          {event.instructionalDayEnd && event.instructionalDayEnd !== event.instructionalDayStart
                            ? ` - Day ${event.instructionalDayEnd}`
                            : ''}
                        </div>
                      )}
                      {event.vacationCodeStart && (
                        <div className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
                          Vacation: {event.vacationCodeStart}
                          {event.vacationCodeEnd ? ` - ${event.vacationCodeEnd}` : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Card className="text-center p-12 space-y-2">
              <CalendarIcon className="h-10 w-10 text-slate-400 mx-auto mb-2" />
              <h4 className="font-bold text-slate-800 dark:text-slate-200">
                No events found matching your criteria
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try clearing your search query or selecting &ldquo;All Events&rdquo; in the category filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedSemester('All');
                }}
              >
                Reset Filters
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Modals */}
      <EventDetailModal
        event={selectedEvent}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
      />

      <VerificationReportModal
        isOpen={isVerificationModalOpen}
        onClose={() => setIsVerificationModalOpen(false)}
      />
    </div>
  );
}
