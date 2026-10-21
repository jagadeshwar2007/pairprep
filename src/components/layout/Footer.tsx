import React from 'react';
import Link from 'next/link';
import { Brand } from './Navbar';

const COLUMNS = [
  {
    title: 'Library',
    links: [
      { href: '/resources', label: 'Browse all resources' },
      { href: '/resources/first-year', label: 'First year' },
      { href: '/resources/second-year', label: 'Second year' },
      { href: '/resources/third-year', label: 'Third year' },
      { href: '/resources/fourth-year', label: 'Fourth year' },
    ],
  },
  {
    title: 'Study tools',
    links: [
      { href: '/tools/attendance', label: 'Attendance calculator' },
      { href: '/tools/gpa', label: 'SGPA calculator' },
      { href: '/tools/cgpa', label: 'CGPA calculator' },
      { href: '/tools/scientific-calc', label: 'Scientific calculator' },
      { href: '/tools/study-timer', label: 'Study timer' },
    ],
  },
  {
    title: 'More',
    links: [
      { href: '/calendar', label: 'Academic calendar' },
      { href: '/practice', label: 'Practice quiz' },
      { href: '/submit', label: 'Contribute a resource' },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="space-y-3">
            <Brand />
            <p className="max-w-xs text-sm leading-relaxed text-slate-600">
              Notes, papers and study tools organised by branch, semester and subject for MNNIT B.Tech students.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{col.title}</h2>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-slate-700 hover:text-indigo-700 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 border-t border-slate-100 pt-6 text-xs leading-relaxed text-slate-500">
          PairPrep is an independent student project and is not affiliated with or endorsed by MNNIT Allahabad.
          Resources currently shown are demonstration placeholders. Course data, grading and attendance assumptions
          have not been verified against official institute documents; check with your department before relying on them.
        </div>
      </div>
    </footer>
  );
}
