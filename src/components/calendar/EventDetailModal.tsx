'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CalendarEvent } from '@/types/calendar';
import { CATEGORY_CONFIG } from '@/data/academicCalendarData';
import {
  FileText,
  Clock,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface EventDetailModalProps {
  event: CalendarEvent | null;
  isOpen: boolean;
  onClose: () => void;
}

export function EventDetailModal({ event, isOpen, onClose }: EventDetailModalProps) {
  if (!event) return null;

  const categoryInfo = CATEGORY_CONFIG[event.category];

  const formatDateDisplay = (start: string, end?: string) => {
    const s = new Date(start + 'T00:00:00');
    const startStr = s.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!end || end === start) {
      return startStr;
    }

    const e = new Date(end + 'T00:00:00');
    const endStr = e.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${startStr} — ${endStr}`;
  };

  const impactLabels = {
    no_classes: 'Institute Closed / No Classes Conducted',
    exams_scheduled: 'Examinations in Progress',
    normal_instruction: 'Regular Teaching / Classes Scheduled',
    vacation: 'Official Recess / Vacation Period',
    administrative: 'Administrative / Faculty Processing',
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={event.title}
      description={`MNNIT Allahabad Academic Calendar (${event.academicYear})`}
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Category & Status Row */}
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${categoryInfo.badgeColor}`}
          >
            {categoryInfo.label}
          </span>
          <Badge variant="outline">
            {event.semester} Semester
          </Badge>
          {event.verificationStatus === 'Verified' ? (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
              <ShieldCheck className="h-3 w-3" /> Source Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 font-medium bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-200/50">
              <AlertTriangle className="h-3 w-3" /> Needs Manual Check
            </span>
          )}
        </div>

        {/* Date Display Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 p-4 space-y-1">
          <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-indigo-500" />
            <span>Event Date & Duration</span>
          </div>
          <div className="text-base font-bold text-slate-900 dark:text-white">
            {formatDateDisplay(event.startDate, event.endDate)}
          </div>
          {event.instructionalDayStart && (
            <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium pt-1">
              Instructional Day: Day {event.instructionalDayStart}
              {event.instructionalDayEnd && event.instructionalDayEnd !== event.instructionalDayStart
                ? ` to Day ${event.instructionalDayEnd}`
                : ''}
            </div>
          )}
          {event.vacationCodeStart && (
            <div className="text-xs text-teal-600 dark:text-teal-400 font-medium pt-1">
              Designated Vacation Days: {event.vacationCodeStart}
              {event.vacationCodeEnd && event.vacationCodeEnd !== event.vacationCodeStart
                ? ` to ${event.vacationCodeEnd}`
                : ''}
            </div>
          )}
        </div>

        {/* Impact on Classes */}
        <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-xs space-y-1">
          <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
            Classroom Schedule Status
          </span>
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            {impactLabels[event.impactOnClasses]}
          </span>
        </div>

        {/* Original Wording from PDF Box */}
        <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/30 p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-900 dark:text-indigo-200">
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-indigo-500" />
              Original Document Transcript
            </span>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
              Source: Page {event.sourcePage}
            </span>
          </div>
          <p className="font-mono text-xs text-slate-800 dark:text-slate-200 bg-white/70 dark:bg-slate-900/60 p-2.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/50">
            &ldquo;{event.originalWording}&rdquo;
          </p>
          {event.verificationNote && (
            <p className="text-[11px] text-amber-700 dark:text-amber-300 pt-1">
              <strong>Observation Note:</strong> {event.verificationNote}
            </p>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Details
          </Button>
        </div>
      </div>
    </Modal>
  );
}
