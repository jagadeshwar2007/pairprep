'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GraduationCap, Mail, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export function Footer() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackSent(true);
  };

  return (
    <>
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 transition-colors">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12">
            {/* Column 1: Brand & Purpose */}
            <div className="md:col-span-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  Pair<span className="text-indigo-600 dark:text-indigo-400">prep</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Your Branch. Your Semester. Your Preparation. A peer-driven centralized academic hub engineered for MNNIT Allahabad B.Tech students.
              </p>
              <div className="pt-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-[11px] font-medium text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60">
                  <Sparkles className="h-3 w-3" />
                  MNNIT Academic Initiative
                </div>
              </div>
            </div>

            {/* Column 2: Academic Hierarchy */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Academic Years
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <Link href="/resources/first-year" className="hover:text-indigo-600 transition-colors">
                    First Year (Sem 1 & 2)
                  </Link>
                </li>
                <li>
                  <Link href="/resources/second-year" className="hover:text-indigo-600 transition-colors">
                    Second Year (Sem 3 & 4)
                  </Link>
                </li>
                <li>
                  <Link href="/resources/third-year" className="hover:text-indigo-600 transition-colors">
                    Third Year (Sem 5 & 6)
                  </Link>
                </li>
                <li>
                  <Link href="/resources/fourth-year" className="hover:text-indigo-600 transition-colors">
                    Fourth Year (Sem 7 & 8)
                  </Link>
                </li>
                <li>
                  <Link href="/resources" className="hover:text-indigo-600 font-medium text-indigo-600 dark:text-indigo-400">
                    All Resource Repositories →
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 3: Academic Tools & Practice */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Tools & Practice
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <Link href="/calendar" className="hover:text-indigo-600 font-semibold text-indigo-600 dark:text-indigo-400 transition-colors">
                    Academic Calendar (2026–27)
                  </Link>
                </li>
                <li>
                  <Link href="/tools/attendance" className="hover:text-indigo-600 transition-colors">
                    Attendance Calculator (75% Rule)
                  </Link>
                </li>
                <li>
                  <Link href="/tools/scientific-calc" className="hover:text-indigo-600 transition-colors">
                    Scientific Calculator
                  </Link>
                </li>
                <li>
                  <Link href="/tools/study-timer" className="hover:text-indigo-600 transition-colors">
                    Pomodoro Study Timer
                  </Link>
                </li>
                <li>
                  <Link href="/tools/gpa" className="hover:text-indigo-600 transition-colors">
                    SGPA & CGPA Calculators
                  </Link>
                </li>
                <li>
                  <Link href="/practice" className="hover:text-indigo-600 transition-colors">
                    Interactive Question Practice
                  </Link>
                </li>
              </ul>
            </div>

            {/* Column 4: Community & Feedback */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Community & Contribute
              </h4>
              <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>
                  <Link href="/submit" className="hover:text-indigo-600 transition-colors font-medium">
                    Submit Academic Notes & PYQs
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      setFeedbackSent(false);
                      setFeedbackOpen(true);
                    }}
                    className="hover:text-indigo-600 transition-colors text-left cursor-pointer flex items-center gap-1.5"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Give Student Feedback
                  </button>
                </li>
              </ul>

              <div className="pt-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 p-2.5 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-900 dark:text-amber-300">
                <span className="font-semibold block mb-0.5">Disclaimer:</span>
                Sample and demonstration data shown for platform preview. Not an official publication of MNNIT administration.
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 Pairprep. Built for the student community at MNNIT Allahabad.</p>
            <div className="flex items-center gap-4">
              <span>Crafted for engineering peers</span>
              <span>•</span>
              <span className="text-slate-400">Milestone 1 Release</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Feedback Modal */}
      <Modal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title="Student Feedback & Suggestions"
        description="Help improve Pairprep for your branch and semester."
      >
        {feedbackSent ? (
          <div className="text-center py-6 space-y-3">
            <div className="h-10 w-10 mx-auto rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              ✓
            </div>
            <h4 className="font-semibold text-slate-900 dark:text-white">Feedback Logged!</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Thank you for helping us refine Pairprep for MNNIT students.
            </p>
            <Button variant="primary" onClick={() => setFeedbackOpen(false)} className="w-full mt-2">
              Close
            </Button>
          </div>
        ) : (
          <form onSubmit={handleFeedbackSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Your Email (Optional)
              </label>
              <Input
                type="email"
                placeholder="name@mnnit.ac.in"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-600 dark:text-slate-400 mb-1">
                Feedback or Requested Resource / Feature
              </label>
              <textarea
                rows={4}
                required
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="e.g. Please add 2024 Endsem questions for CS15102 Operating Systems or suggest a new tool..."
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
              />
            </div>
            <Button type="submit" variant="primary" className="w-full">
              Send Feedback (Demo)
            </Button>
          </form>
        )}
      </Modal>
    </>
  );
}
