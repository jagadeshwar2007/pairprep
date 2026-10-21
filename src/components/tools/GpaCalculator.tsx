'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Notice } from '@/components/ui/Feedback';
import { CourseGradeEntry } from '@/types';
import { GRADE_POINTS, computeSgpa } from '@/lib/academicMath';
import {
  Plus,
  Trash2,
  RotateCcw,
  BookOpen,
  Award,
} from 'lucide-react';

const DEFAULT_COURSES: CourseGradeEntry[] = [
  { id: '1', name: 'Data Structures and Algorithms', credits: 4, grade: 'A+' },
  { id: '2', name: 'Discrete Mathematics', credits: 4, grade: 'A' },
  { id: '3', name: 'Digital Logic & Computer Org', credits: 4, grade: 'B+' },
  { id: '4', name: 'Data Structures Lab', credits: 2, grade: 'A+' },
  { id: '5', name: 'Digital Logic Lab', credits: 2, grade: 'A' },
];

export function GpaCalculator() {
  const [courses, setCourses] = useState<CourseGradeEntry[]>(DEFAULT_COURSES);

  const addCourse = () => {
    const newCourse: CourseGradeEntry = {
      id: Date.now().toString(),
      name: `Course ${courses.length + 1}`,
      credits: 4,
      grade: 'A',
    };
    setCourses([...courses, newCourse]);
  };

  const removeCourse = (id: string) => {
    setCourses(courses.filter((c) => c.id !== id));
  };

  const updateCourse = <K extends keyof CourseGradeEntry>(
    id: string,
    field: K,
    value: CourseGradeEntry[K]
  ) => {
    setCourses(
      courses.map((c) => {
        if (c.id === id) {
          return { ...c, [field]: value };
        }
        return c;
      })
    );
  };

  const handleReset = () => {
    setCourses([
      { id: '1', name: 'Subject 1', credits: 4, grade: 'A' },
      { id: '2', name: 'Subject 2', credits: 4, grade: 'A' },
    ]);
  };

  // SGPA Calculation
  const { totalCredits, totalPoints, sgpa } = computeSgpa(courses);

  return (
    <div className="space-y-6">
      <Notice title="Assumed grading scale">
        <span>Grade points are A+ 10, A 9, B+ 8, B 7, C 6, D 4, F 0. This scale has not been verified against the official ordinance, so treat the result as an estimate. SGPA = sum of (credits x grade points) / sum of credits.</span>
      </Notice>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Rows Table */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-indigo-500" />
                Semester Course Grades
              </h3>
              <Button variant="outline" size="sm" onClick={addCourse}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Course
              </Button>
            </div>

            <div className="space-y-3">
              {courses.map((course) => (
                <div
                  key={course.id}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-colors"
                >
                  <div className="flex-1">
                    <input
                      type="text"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={course.name}
                      onChange={(e) => updateCourse(course.id, 'name', e.target.value)}
                      placeholder="Course name / code"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <Select
                        className="h-8 text-xs py-1"
                        value={course.credits}
                        onChange={(e) =>
                          updateCourse(course.id, 'credits', parseInt(e.target.value) || 0)
                        }
                      >
                        <option value={1}>1 Credit</option>
                        <option value={2}>2 Credits</option>
                        <option value={3}>3 Credits</option>
                        <option value={4}>4 Credits</option>
                        <option value={5}>5 Credits</option>
                      </Select>
                    </div>

                    <div className="w-28">
                      <Select
                        className="h-8 text-xs py-1 font-semibold"
                        value={course.grade}
                        onChange={(e) =>
                          updateCourse(
                            course.id,
                            'grade',
                            e.target.value as CourseGradeEntry['grade']
                          )
                        }
                      >
                        {Object.entries(GRADE_POINTS).map(([letter, pts]) => (
                          <option key={letter} value={letter}>
                            {letter} ({pts} pts)
                          </option>
                        ))}
                      </Select>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeCourse(course.id)}
                      disabled={courses.length <= 1}
                      className="p-2 text-slate-400 hover:text-rose-500 disabled:opacity-30 disabled:pointer-events-none rounded-lg transition-colors cursor-pointer"
                      title="Remove course"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
              <span>{courses.length} Courses listed</span>
              <button
                onClick={handleReset}
                className="hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" /> Reset default list
              </button>
            </div>
          </Card>
        </div>

        {/* Results & Grade Legend */}
        <div className="space-y-4">
          <Card className="bg-white text-center p-6 border-indigo-200/60 dark:border-indigo-900/60">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Projected Semester SGPA
            </span>

            <div className="my-4">
              <span className="text-6xl font-black text-indigo-600 dark:text-indigo-400">
                {sgpa.toFixed(2)}
              </span>
              <span className="text-sm text-slate-400 ml-1 font-semibold">/ 10.0</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-left pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Total Credits
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {totalCredits}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Total Points
                </span>
                <span className="text-base font-bold text-slate-800 dark:text-slate-200">
                  {totalPoints}
                </span>
              </div>
            </div>
          </Card>

          {/* Grade reference card */}
          <Card className="p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Award className="h-3.5 w-3.5 text-amber-500" />
              Assumed 10-point scale
            </h4>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {Object.entries(GRADE_POINTS).map(([letter, pts]) => (
                <div
                  key={letter}
                  className="flex justify-between p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 px-2"
                >
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {letter}
                  </span>
                  <span className="text-slate-500">{pts} Points</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
