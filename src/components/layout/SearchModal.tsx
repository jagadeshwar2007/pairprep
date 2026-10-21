'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BookOpen, Calendar, FileText, Search } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { SUBJECTS, BRANCHES } from '@/data/academicData';
import { DEMO_RESOURCES, CATEGORY_LABELS } from '@/data/resourcesData';
import { OFFICIAL_ACADEMIC_CALENDAR_EVENTS } from '@/data/academicCalendarData';
import { EMPTY_FILTERS, searchResources, searchSubjects } from '@/lib/library';
import { DemoBadge } from '@/components/resources/DemoBadge';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SUGGESTIONS = ['Data Structures', 'Operating System', 'Mathematics', 'Physics'];

export function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const q = query.trim();

  const results = useMemo(() => {
    if (!q) return null;
    const filters = { ...EMPTY_FILTERS, q };
    const lower = q.toLowerCase();
    return {
      subjects: searchSubjects(SUBJECTS, DEMO_RESOURCES, filters).slice(0, 6),
      resources: searchResources(DEMO_RESOURCES, filters).slice(0, 4),
      branches: BRANCHES.filter(
        (b) =>
          b.name.toLowerCase().includes(lower) ||
          b.code.toLowerCase().includes(lower) ||
          b.shortName.toLowerCase().includes(lower)
      ).slice(0, 3),
      calendar: OFFICIAL_ACADEMIC_CALENDAR_EVENTS.filter(
        (e) => e.title.toLowerCase().includes(lower) || e.originalWording.toLowerCase().includes(lower)
      ).slice(0, 3),
    };
  }, [q]);

  const hasResults =
    results &&
    (results.subjects.length > 0 ||
      results.resources.length > 0 ||
      results.branches.length > 0 ||
      results.calendar.length > 0);

  const rowClass = 'group flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors hover:bg-slate-50';
  const groupTitle = 'px-2.5 pb-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Search" maxWidth="2xl">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Subject, course code, branch or resource"
            aria-label="Search"
            autoComplete="off"
            className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-11 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {!results ? (
          <div className="py-4 text-center">
            <p className="text-sm text-slate-500">Start typing, or try one of these:</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  className="h-8 rounded-full border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 cursor-pointer"
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : !hasResults ? (
          <p className="py-6 text-center text-sm text-slate-500">
            Nothing found for &ldquo;{q}&rdquo;. Check the spelling or try a course code.
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-4 overflow-y-auto" aria-live="polite">
            {results.subjects.length > 0 && (
              <section>
                <h3 className={groupTitle}>Subjects</h3>
                {results.subjects.map(({ subject: sub }) => (
                  <Link
                    key={sub.id}
                    href={`/resources/${sub.yearId}/${sub.branchId}/${sub.semester}/${sub.id}`}
                    onClick={onClose}
                    className={rowClass}
                  >
                    <BookOpen className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{sub.title || sub.name}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {sub.courseCode || sub.code || 'Code not listed'} · {sub.branchCode} · Sem {sub.semester}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-600" aria-hidden="true" />
                  </Link>
                ))}
              </section>
            )}

            {results.resources.length > 0 && (
              <section>
                <h3 className={groupTitle}>Resources</h3>
                {results.resources.map((res) => (
                  <Link
                    key={res.id}
                    href={`/resources/${res.yearId}/${res.branchId}/${res.semester}/${res.subjectId}`}
                    onClick={onClose}
                    className={rowClass}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{res.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {CATEGORY_LABELS[res.category]?.label ?? res.category} · {res.subjectName}
                      </span>
                    </span>
                    {res.isDemo && <DemoBadge />}
                  </Link>
                ))}
              </section>
            )}

            {results.branches.length > 0 && (
              <section>
                <h3 className={groupTitle}>Branches</h3>
                {results.branches.map((b) => (
                  <Link key={b.id} href={`/resources?branch=${b.id}`} onClick={onClose} className={rowClass}>
                    <span className="w-10 shrink-0 font-mono text-xs font-semibold text-indigo-700">{b.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{b.name}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-indigo-600" aria-hidden="true" />
                  </Link>
                ))}
              </section>
            )}

            {results.calendar.length > 0 && (
              <section>
                <h3 className={groupTitle}>Calendar</h3>
                {results.calendar.map((ev) => (
                  <Link key={ev.id} href="/calendar" onClick={onClose} className={rowClass}>
                    <Calendar className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">{ev.title}</span>
                      <span className="block text-xs text-slate-500">
                        {ev.startDate} · {ev.semester} semester
                      </span>
                    </span>
                  </Link>
                ))}
              </section>
            )}

            <Link
              href={`/resources?q=${encodeURIComponent(q)}`}
              onClick={onClose}
              className="block rounded-lg border border-slate-200 px-3 py-2.5 text-center text-sm font-medium text-indigo-700 hover:bg-indigo-50"
            >
              See all results in the library
            </Link>
          </div>
        )}
      </div>
    </Modal>
  );
}
