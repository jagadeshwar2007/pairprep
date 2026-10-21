'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  Calendar,
  FileCheck2,
  Layers,
  Search,
  Sparkles,
  Timer,
  TrendingUp,
  Award,
  Laptop,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ACADEMIC_YEARS, BRANCHES } from '@/data/academicData';
import { DEMO_RESOURCES } from '@/data/resourcesData';
import { YearCard } from '@/components/academic/YearCard';
import { BranchCard } from '@/components/academic/BranchCard';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { SearchModal } from '@/components/layout/SearchModal';

export default function HomePage() {
  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');

  const filteredDemoResources =
    selectedBranchFilter === 'all'
      ? DEMO_RESOURCES.slice(0, 6)
      : DEMO_RESOURCES.filter((r) => r.branchId === selectedBranchFilter).slice(0, 6);

  const academicTools = [
    {
      title: 'Attendance Calculator',
      description:
        'Track MNNIT 75% attendance rule, calculate permissible bunks, and required recovery classes.',
      href: '/tools/attendance',
      icon: TrendingUp,
      color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/60',
      badge: '75% Rule',
    },
    {
      title: 'Scientific Calculator',
      description:
        'Trigonometry, logarithmic, exponential, and power computations tailored for engineering tutorials.',
      href: '/tools/scientific-calc',
      icon: Calculator,
      color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/60',
      badge: 'Full Suite',
    },
    {
      title: 'Pomodoro Study Timer',
      description:
        '25-minute deep focus intervals with automated 5m & 15m rest periods and audible completion chimes.',
      href: '/tools/study-timer',
      icon: Timer,
      color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/60',
      badge: 'Focus 25m',
    },
    {
      title: 'Semester GPA (SGPA)',
      description:
        'Official 10-point MNNIT relative grading weights to project your end-semester grade sheet.',
      href: '/tools/gpa',
      icon: Award,
      color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border-amber-200/60',
      badge: '10-Point Scale',
    },
    {
      title: 'Cumulative CGPA',
      description:
        'Aggregate multi-semester SGPA weighted by departmental credit units (1st to 8th Semester).',
      href: '/tools/cgpa',
      icon: Layers,
      color: 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/60',
      badge: 'B.Tech Overall',
    },
  ];

  return (
    <div className="flex flex-col gap-16 lg:gap-24 pb-20">
      {/* ===================== HERO SECTION ===================== */}
      <section className="relative overflow-hidden pt-12 pb-16 lg:pt-20 lg:pb-24 border-b border-slate-200/70 dark:border-slate-800/70 bg-gradient-to-b from-indigo-50/40 via-white to-transparent dark:from-slate-900/50 dark:via-slate-950 dark:to-transparent">
        {/* Glow backdrop circles */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800/80 shadow-xs text-xs font-semibold text-indigo-700 dark:text-indigo-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 animate-pulse" />
            <span>Curated for all 4 Years & B.Tech Branches • MNNIT Allahabad</span>
          </div>

          {/* Main Headline */}
          <div className="max-w-4xl mx-auto space-y-4">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
              Your Branch. Your Semester.{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 dark:from-indigo-400 dark:via-sky-400 dark:to-teal-300">
                Your Preparation.
              </span>
            </h1>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Pairprep centralizes lecture notes, previous-year question papers (PYQs), midsem/endsem exams, lab manuals, and student productivity tools in one unified peer repository.
            </p>
          </div>

          {/* Hero Interactive Search Trigger Bar */}
          <div className="max-w-2xl mx-auto">
            <div
              onClick={() => setSearchModalOpen(true)}
              className="flex items-center justify-between p-2 pl-4 rounded-2xl border-2 border-indigo-100 dark:border-slate-800 bg-white dark:bg-slate-900/90 shadow-lg shadow-indigo-500/5 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all cursor-pointer group"
            >
              <div className="flex items-center gap-3 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300">
                <Search className="h-5 w-5 text-indigo-500" />
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  Search subjects, PYQs, branches (e.g. Data Structures, OS, CSE)...
                </span>
              </div>
              <Button variant="primary" size="sm" className="hidden sm:inline-flex">
                Quick Search
              </Button>
            </div>
            <div className="flex items-center justify-center gap-4 mt-2.5 text-xs text-slate-400">
              <span>Popular searches:</span>
              <button
                onClick={() => setSearchModalOpen(true)}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer"
              >
                CS13101 Data Structures
              </button>
              <span>•</span>
              <button
                onClick={() => setSearchModalOpen(true)}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer"
              >
                MA11101 Math I
              </button>
              <span>•</span>
              <button
                onClick={() => setSearchModalOpen(true)}
                className="hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer"
              >
                CSE Sem 3
              </button>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link href="/resources">
              <Button variant="primary" size="lg" className="shadow-md shadow-indigo-600/20">
                <BookOpen className="h-4 w-4 mr-2" />
                Explore Resources
              </Button>
            </Link>
            <Link href="/calendar">
              <Button variant="outline" size="lg" className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-semibold">
                <Calendar className="h-4 w-4 mr-2 text-indigo-600 dark:text-indigo-400" />
                Academic Calendar (2026–27)
              </Button>
            </Link>
            <Link href="/tools">
              <Button variant="outline" size="lg">
                <Calculator className="h-4 w-4 mr-2" />
                Academic Tools
              </Button>
            </Link>
          </div>

          {/* Quick Metrics Banner */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-200/60 dark:border-slate-800/60">
            <div className="p-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white">4 Years</div>
              <div className="text-xs text-slate-500">B.Tech 1st to 8th Sem</div>
            </div>
            <div className="p-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white">8 Branches</div>
              <div className="text-xs text-slate-500">MNNIT Engineering</div>
            </div>
            <div className="p-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white">8 Categories</div>
              <div className="text-xs text-slate-500">Notes, PYQs, Labs & More</div>
            </div>
            <div className="p-3">
              <div className="text-2xl font-black text-slate-900 dark:text-white">100% Peer</div>
              <div className="text-xs text-slate-500">Student Curated</div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== ACADEMIC YEAR SELECTION ===================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Calendar className="h-4 w-4" />
              <span>Step 1: Choose Academic Stage</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Select Your Academic Year
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Navigate directly to semester syllabi, midsem/endsem papers, and notes for your batch.
            </p>
          </div>
          <Link
            href="/resources"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
          >
            Browse all years hierarchy <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {ACADEMIC_YEARS.map((year) => (
            <YearCard key={year.id} year={year} />
          ))}
        </div>
      </section>

      {/* ===================== BRANCH EXPLORATION ===================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Laptop className="h-4 w-4" />
              <span>Step 2: Department Repositories</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Explore by Engineering Branch
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Course materials organized by specialized B.Tech engineering departments at MNNIT.
            </p>
          </div>
          <Badge variant="warning" size="sm">
            Sample Directory (MNNIT registry verification in progress)
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {BRANCHES.map((branch) => (
            <BranchCard key={branch.id} branch={branch} yearId="second-year" />
          ))}
        </div>
      </section>

      {/* ===================== RECENTLY ADDED RESOURCES ===================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-4 w-4" />
              <span>Updated Course Sets</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Recently Added Academic Resources
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Sample lecture summaries, midsem papers, and lab manuals submitted for testing.
            </p>
          </div>

          {/* Quick branch pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <button
              onClick={() => setSelectedBranchFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedBranchFilter === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              All ({DEMO_RESOURCES.length})
            </button>
            <button
              onClick={() => setSelectedBranchFilter('cse')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedBranchFilter === 'cse'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              CSE
            </button>
            <button
              onClick={() => setSelectedBranchFilter('me')}
              className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                selectedBranchFilter === 'me'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Mechanical
            </button>
          </div>
        </div>

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDemoResources.map((res) => (
            <ResourceCard key={res.id} resource={res} showSubjectBadge />
          ))}
        </div>
      </section>

      {/* ===================== ACADEMIC TOOLS ===================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              <Calculator className="h-4 w-4" />
              <span>Student Productivity</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">
              Essential Academic Tools
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Calculators and focus utilities designed around MNNIT academic regulations.
            </p>
          </div>
          <Link
            href="/tools"
            className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Launch all tools hub <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {academicTools.map((tool, idx) => {
            const Icon = tool.icon;
            return (
              <Link key={idx} href={tool.href} className="group block focus:outline-none">
                <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md transition-all group-hover:border-indigo-400 dark:group-hover:border-indigo-500 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={`h-11 w-11 rounded-xl flex items-center justify-center border ${tool.color} group-hover:scale-105 transition-transform`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" size="sm">
                        {tool.badge}
                      </Badge>
                    </div>

                    <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {tool.title}
                    </h4>

                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                    <span>Open Tool</span>
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ===================== CONTRIBUTION SECTION ===================== */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 lg:p-16 border border-slate-800 shadow-xl">
          <div className="max-w-2xl space-y-4 relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-400/30">
              <FileCheck2 className="h-3.5 w-3.5" />
              <span>Peer-Driven Academic Platform</span>
            </div>

            <h3 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight">
              Have lecture notes or past semester question papers?
            </h3>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed">
              Every solved tutorial sheet, handwritten class note, and midsem paper you contribute directly assists fellow MNNITians. Share your study resources with peer verification.
            </p>

            <div className="pt-4 flex flex-wrap items-center gap-3">
              <Link href="/submit">
                <Button variant="primary" size="lg" className="bg-indigo-500 hover:bg-indigo-600">
                  <FileCheck2 className="h-4 w-4 mr-2" />
                  Submit Academic Resource
                </Button>
              </Link>
              <Link href="/practice">
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Try Practice Questions
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Global Search Modal */}
      <SearchModal isOpen={searchModalOpen} onClose={() => setSearchModalOpen(false)} />
    </div>
  );
}
