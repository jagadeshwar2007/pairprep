'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Notice } from '@/components/ui/Feedback';
import { getAcademicSemesterContext } from '@/lib/calendarAttendanceHelper';
import { computeAttendance } from '@/lib/academicMath';
import { SemesterType } from '@/types/calendar';
import {
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Percent,
  Calendar,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export function AttendanceCalculator() {
  const [attended, setAttended] = useState<number>(28);
  const [total, setTotal] = useState<number>(36);
  const [minPercentage, setMinPercentage] = useState<number>(75);
  const [selectedSemester, setSelectedSemester] = useState<SemesterType>('Odd');

  const semesterContext = getAcademicSemesterContext(selectedSemester);

  const {
    attended: safeAttended,
    total: safeTotal,
    target: targetPct,
    percentage: currentPercentage,
    isSatisfied,
    canSkip,
    mustAttend,
    unreachable,
  } = computeAttendance(attended, total, minPercentage);

  const handleReset = () => {
    setAttended(0);
    setTotal(0);
    setMinPercentage(75);
  };

  return (
    <div className="space-y-6">
      <Notice title="Assumption, not an official rule">
        <span>The target defaults to 75%, a common requirement, but rules differ by department and situation. Confirm yours with your department before relying on this.</span>
      </Notice>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Input Panel */}
        <Card className="space-y-4">
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Percent className="h-4 w-4 text-indigo-500" />
            Class Attendance Inputs
          </h3>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Classes Attended So Far
            </label>
            <Input
              type="number"
              min="0"
              value={attended}
              onChange={(e) => setAttended(parseInt(e.target.value) || 0)}
              placeholder="e.g. 28"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Total Classes Conducted
            </label>
            <Input
              type="number"
              min="0"
              value={total}
              onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
              placeholder="e.g. 36"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Minimum Attendance (% requirement)
            </label>
            <div className="flex gap-2">
              <Input
                type="number"
                min="50"
                max="100"
                value={minPercentage}
                onChange={(e) => setMinPercentage(parseInt(e.target.value) || 75)}
                className="flex-1"
              />
              <div className="flex gap-1">
                {[75, 80, 85].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setMinPercentage(preset)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium transition-colors cursor-pointer border ${
                      minPercentage === preset
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {preset}%
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleReset} className="w-full">
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              Reset
            </Button>
          </div>
        </Card>

        {/* Results Panel */}
        <Card className="bg-white flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Attendance Standing
              </span>
              <Badge variant={isSatisfied ? 'success' : 'danger'}>
                {isSatisfied ? 'Above Minimum' : 'Short Attendance'}
              </Badge>
            </div>

            {/* Big percentage display */}
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-5xl font-black tracking-tight text-slate-900 dark:text-white">
                {currentPercentage.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 font-medium">
                ({safeAttended} of {safeTotal} attended)
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-3 relative h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  isSatisfied ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
                style={{ width: `${Math.min(100, currentPercentage)}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-900 dark:bg-white z-10"
                style={{ left: `${targetPct}%` }}
                title={`Target: ${targetPct}%`}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>0%</span>
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Target: {targetPct}%
              </span>
              <span>100%</span>
            </div>
          </div>

          {/* Actionable Insight Box */}
          <div className="rounded-xl p-4 border bg-white dark:bg-slate-900/90 shadow-2xs">
            {safeTotal === 0 ? (
              <p className="text-xs text-slate-500 text-center py-2">
                Enter your total and attended classes to calculate your buffer or required classes.
              </p>
            ) : isSatisfied ? (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle className="h-4 w-4" />
                  <span>You are safely in the safe zone!</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  You can safely skip <strong className="text-indigo-600 dark:text-indigo-400 text-sm">{canSkip}</strong> consecutive{' '}
                  {canSkip === 1 ? 'class' : 'classes'} and still maintain your {targetPct}% minimum target.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Attendance shortage warning</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {unreachable ? (
                    <>A {targetPct}% target cannot be restored once a class has been missed.</>
                  ) : (
                    <>
                      You must attend the next <strong className="text-rose-600 dark:text-rose-400 text-sm">{mustAttend}</strong> consecutive{' '}
                      {mustAttend === 1 ? 'class' : 'classes'} without missing any to restore your attendance to {targetPct}%.
                    </>
                  )}
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Calendar context */}
      <Card className="p-5 sm:p-6 border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Calendar className="h-4 w-4" />
            </div>
            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                Academic calendar dates (2026–27)
              </h4>
              <p className="text-[11px] text-slate-500">
                Semester boundaries and instructional days from the calendar page.
              </p>
            </div>
          </div>

          {/* Semester Selector Pill */}
          <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setSelectedSemester('Odd')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedSemester === 'Odd'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Odd Sem (77 Days)
            </button>
            <button
              onClick={() => setSelectedSemester('Even')}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                selectedSemester === 'Even'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Even Sem (71 Days)
            </button>
          </div>
        </div>

        {/* Benchmarks Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Teaching Window
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {semesterContext.classesStartDate} – {semesterContext.classesEndDate}
            </span>
            <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
              {semesterContext.officialInstructionalDays} Total Instructional Days
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              1st Short Attendance
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {selectedSemester === 'Odd' ? 'Oct 8, 2026' : 'Mar 11, 2027'}
            </span>
            <span className="text-[10px] text-slate-500">
              Published at Day {selectedSemester === 'Odd' ? 56 : 45}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              2nd Short Attendance
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {selectedSemester === 'Odd' ? 'Nov 3, 2026' : 'Apr 16, 2027'}
            </span>
            <span className="text-[10px] text-rose-500 font-medium">
              Pre-debarment cutoff
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Declared Holidays
            </span>
            <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">
              {semesterContext.declaredHolidaysCount} Institute Holidays
            </span>
            <span className="text-[10px] text-slate-500">
              Official gazetted days
            </span>
          </div>
        </div>

        {/* Timetable Decoupling Notice */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>
              <strong>Timetable Integrity:</strong> Your individual course timetable and logged attendances remain strictly decoupled from the calendar. Updates to institute dates will never overwrite historical attendance entries.
            </span>
          </p>

          <Link
            href="/calendar"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Open Full Calendar <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
