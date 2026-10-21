'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { SemesterGpaEntry } from '@/types';
import { Plus, Trash2, Info, RotateCcw, Award } from 'lucide-react';

const DEFAULT_SEMESTERS: SemesterGpaEntry[] = [
  { id: '1', semesterNumber: 1, semesterName: 'Semester 1', sgpa: 8.4, credits: 22 },
  { id: '2', semesterNumber: 2, semesterName: 'Semester 2', sgpa: 8.8, credits: 22 },
  { id: '3', semesterNumber: 3, semesterName: 'Semester 3', sgpa: 9.1, credits: 24 },
  { id: '4', semesterNumber: 4, semesterName: 'Semester 4', sgpa: 8.9, credits: 24 },
];

export function CgpaCalculator() {
  const [semesters, setSemesters] = useState<SemesterGpaEntry[]>(DEFAULT_SEMESTERS);

  const addSemester = () => {
    const nextNum = semesters.length + 1;
    if (nextNum > 8) return; // MNNIT B.Tech has 8 semesters
    setSemesters([
      ...semesters,
      {
        id: Date.now().toString(),
        semesterNumber: nextNum,
        semesterName: `Semester ${nextNum}`,
        sgpa: 8.5,
        credits: 22,
      },
    ]);
  };

  const removeSemester = (id: string) => {
    setSemesters(semesters.filter((s) => s.id !== id));
  };

  const updateSemester = (id: string, field: 'sgpa' | 'credits', value: number) => {
    setSemesters(
      semesters.map((s) => {
        if (s.id === id) {
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleReset = () => {
    setSemesters([
      { id: '1', semesterNumber: 1, semesterName: 'Semester 1', sgpa: 8.5, credits: 22 },
      { id: '2', semesterNumber: 2, semesterName: 'Semester 2', sgpa: 8.5, credits: 22 },
    ]);
  };

  // Cumulative CGPA calculation
  const totalCredits = semesters.reduce((sum, s) => sum + (Number(s.credits) || 0), 0);
  const totalQualityPoints = semesters.reduce(
    (sum, s) => sum + (Number(s.credits) || 0) * (Number(s.sgpa) || 0),
    0
  );
  const cgpa = totalCredits > 0 ? totalQualityPoints / totalCredits : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-indigo-200/80 bg-indigo-50/70 dark:border-indigo-900/60 dark:bg-indigo-950/40 p-4 text-xs text-indigo-900 dark:text-indigo-200 flex gap-3">
        <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold">Cumulative Formula:</span> CGPA = Σ (Semester SGPA × Semester Credits) / Σ Semester Credits. For MNNIT B.Tech students, typical semester credits range from 20 to 26 credits depending on branch ordinance.
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Semester rows */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="h-4 w-4 text-indigo-500" />
                Completed Semesters (B.Tech 1 - 8)
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={addSemester}
                disabled={semesters.length >= 8}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Semester
              </Button>
            </div>

            <div className="space-y-3">
              {semesters.map((sem) => (
                <div
                  key={sem.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <div className="w-28 text-xs font-bold text-slate-800 dark:text-slate-200">
                    {sem.semesterName}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">SGPA:</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="10"
                        className="h-8 w-20 text-xs text-center font-semibold"
                        value={sem.sgpa}
                        onChange={(e) =>
                          updateSemester(sem.id, 'sgpa', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-400 font-medium">Credits:</span>
                      <Input
                        type="number"
                        min="1"
                        max="35"
                        className="h-8 w-18 text-xs text-center font-semibold"
                        value={sem.credits}
                        onChange={(e) =>
                          updateSemester(sem.id, 'credits', parseInt(e.target.value) || 0)
                        }
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => removeSemester(sem.id)}
                      disabled={semesters.length <= 1}
                      className="p-1.5 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none rounded transition-colors cursor-pointer"
                      title="Remove semester"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
              <span>{semesters.length} of 8 Semesters added</span>
              <button
                onClick={handleReset}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset default
              </button>
            </div>
          </Card>
        </div>

        {/* CGPA Outcome Display */}
        <div className="space-y-4">
          <Card className="text-center p-6 bg-gradient-to-br from-indigo-50/50 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900 border-indigo-200/60 dark:border-indigo-900/60">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Cumulative Overall CGPA
            </span>

            <div className="my-4">
              <span className="text-6xl font-black text-emerald-600 dark:text-emerald-400">
                {cgpa.toFixed(2)}
              </span>
              <span className="text-sm text-slate-400 ml-1 font-semibold">/ 10.0</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Cumulative Credits
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {totalCredits}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Estimated % (× 9.5)
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {(cgpa * 9.5).toFixed(1)}%
                </span>
              </div>
            </div>

            <p className="mt-3 text-[11px] text-slate-400 text-left">
              * Note: Many recruitment companies convert MNNIT CGPA via CGPA × 9.5 or 10.0. Refer to Training & Placement Cell guidelines.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
