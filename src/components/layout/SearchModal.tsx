'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { SUBJECTS, BRANCHES, ACADEMIC_YEARS } from '@/data/academicData';
import { DEMO_RESOURCES, CATEGORY_LABELS } from '@/data/resourcesData';
import { OFFICIAL_ACADEMIC_CALENDAR_EVENTS, CATEGORY_CONFIG } from '@/data/academicCalendarData';
import { Search, BookOpen, FileText, ArrowRight, Layers, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');

  const filteredResults = useMemo(() => {
    if (!query.trim()) return { subjects: [], resources: [], branches: [], calendarEvents: [] };
    const q = query.toLowerCase().trim();

    const matchedSubjects = SUBJECTS.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.topics.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedResources = DEMO_RESOURCES.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subjectName.toLowerCase().includes(q) ||
        r.tags?.some((t) => t.toLowerCase().includes(q))
    ).slice(0, 5);

    const matchedBranches = BRANCHES.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.code.toLowerCase().includes(q) ||
        b.shortName.toLowerCase().includes(q)
    ).slice(0, 3);

    const matchedCalendarEvents = OFFICIAL_ACADEMIC_CALENDAR_EVENTS.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.originalWording.toLowerCase().includes(q) ||
        (q === 'calendar' || q === 'holiday' || q === 'vacation' || q === 'midsem' || q === 'endsem')
    ).slice(0, 4);

    return {
      subjects: matchedSubjects,
      resources: matchedResources,
      branches: matchedBranches,
      calendarEvents: matchedCalendarEvents,
    };
  }, [query]);

  const hasResults =
    filteredResults.subjects.length > 0 ||
    filteredResults.resources.length > 0 ||
    filteredResults.branches.length > 0 ||
    filteredResults.calendarEvents.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="2xl">
      <div className="space-y-4">
        <div className="relative">
          <Input
            autoFocus
            type="text"
            placeholder="Search subjects, PYQs, branches (e.g. Data Structures, OS, CSE, Math)..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            icon={<Search className="h-5 w-5" />}
            className="h-12 text-base rounded-xl"
          />
        </div>

        {query.trim().length === 0 ? (
          <div className="py-8 text-center">
            <Layers className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Type keywords to quickly jump to any course, semester paper, or branch repository.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              <span className="text-xs text-slate-400 self-center">Popular:</span>
              {['Data Structures', 'Operating Systems', 'Mathematics I', 'CSE', 'ECE'].map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="text-xs px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : !hasResults ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No matching resources or subjects found for &ldquo;{query}&rdquo;.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto space-y-4 divide-y divide-slate-100 dark:divide-slate-800 pr-1">
            {/* Subjects */}
            {filteredResults.subjects.length > 0 && (
              <div className="pt-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Subjects ({filteredResults.subjects.length})
                </p>
                <div className="space-y-1.5">
                  {filteredResults.subjects.map((sub) => {
                    const yearObj = ACADEMIC_YEARS.find((y) => y.id === sub.yearId);
                    return (
                      <Link
                        key={sub.id}
                        href={`/resources/${sub.yearId}/${sub.branchId}/${sub.semester}/${sub.id}`}
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <BookOpen className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                              {sub.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {sub.code} • Sem {sub.semester} • {sub.branchId.toUpperCase()} • {yearObj?.title}
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-1" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Resources */}
            {filteredResults.resources.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Papers & Materials ({filteredResults.resources.length})
                </p>
                <div className="space-y-1.5">
                  {filteredResults.resources.map((res) => (
                    <Link
                      key={res.id}
                      href={`/resources/${res.yearId}/${res.branchId}/${res.semester}/${res.subjectId}`}
                      onClick={onClose}
                      className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 group transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                          <FileText className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600">
                            {res.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Badge variant="primary" size="sm">
                              {CATEGORY_LABELS[res.category]?.label || res.category}
                            </Badge>
                            <span className="text-xs text-slate-500">
                              {res.subjectName} ({res.branchCode})
                            </span>
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Events */}
            {filteredResults.calendarEvents.length > 0 && (
              <div className="pt-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Academic Calendar Events ({filteredResults.calendarEvents.length})
                  </p>
                  <Link
                    href="/calendar"
                    onClick={onClose}
                    className="text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    View Full Calendar →
                  </Link>
                </div>
                <div className="space-y-1.5">
                  {filteredResults.calendarEvents.map((ev) => {
                    const cfg = CATEGORY_CONFIG[ev.category];
                    return (
                      <Link
                        key={ev.id}
                        href="/calendar"
                        onClick={onClose}
                        className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 group transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100 group-hover:text-indigo-600">
                              {ev.title}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${cfg.badgeColor}`}>
                                {cfg.label}
                              </span>
                              <span className="text-xs text-slate-500">
                                {ev.startDate} • {ev.semester} Semester (Page {ev.sourcePage})
                              </span>
                            </div>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600" />
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Branches */}
            {filteredResults.branches.length > 0 && (
              <div className="pt-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                  Branches
                </p>
                <div className="flex flex-wrap gap-2">
                  {filteredResults.branches.map((b) => (
                    <Link
                      key={b.id}
                      href={`/resources/second-year/${b.id}`}
                      onClick={onClose}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-sm font-medium text-slate-800 dark:text-slate-200 hover:text-indigo-600 transition-colors"
                    >
                      <span>{b.code}</span>
                      <span className="text-xs text-slate-400">- {b.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
