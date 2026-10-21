import React from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

/**
 * Summary of the official academic calendar shipped in src/data/academicCalendarData.ts.
 * Editing the calendar from the dashboard is not implemented; update the data file instead.
 */
export function CalendarAdminInfo() {
  return (
    <Card className="p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="h-4 w-4 text-indigo-500" />
            MNNIT Academic Calendar
          </h3>
          <p className="text-xs text-slate-500">
            Current active schedule: Session 2026–27 (Extracted from 2-page Dean Academic official document).
          </p>
        </div>
        <Badge variant="neutral">Bundled data (read-only)</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
          <span className="font-bold text-slate-900 dark:text-white block">
            Odd Semester (Page 2)
          </span>
          <p className="text-slate-500">
            July 9 – Dec 31, 2026 • 77 Teaching Days (Others)
          </p>
          <span className="text-[11px] text-emerald-600 font-medium block">
            35 Events Extracted & Verified
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
          <span className="font-bold text-slate-900 dark:text-white block">
            Even Semester (Page 1)
          </span>
          <p className="text-slate-500">
            Jan 1 – June 30, 2027 • 71 Teaching Days
          </p>
          <span className="text-[11px] text-emerald-600 font-medium block">
            29 Events Extracted & Verified
          </span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-1">
          <span className="font-bold text-slate-900 dark:text-white block">
            July 2027 Transition (Page 1)
          </span>
          <p className="text-slate-500">
            Bridge to 2027-28 Session • Summer Vacation End & Reg
          </p>
          <span className="text-[11px] text-indigo-600 font-medium block">
            4 Events Extracted & Verified
          </span>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-3.5 text-xs text-amber-900 dark:text-amber-200 space-y-1">
        <p className="font-bold">Not editable here yet</p>
        <p className="leading-relaxed text-[11px]">
          Calendar editing from the dashboard is not implemented. To change dates, update <code>src/data/academicCalendarData.ts</code> and redeploy.
        </p>
      </div>
    </Card>
  );
}
