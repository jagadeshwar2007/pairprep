'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  BookOpen,
  Calculator,
  FileCheck2,
  Layers,
  Search,
  Sparkles,
  Timer,
  TrendingUp,
  Award,
  FileQuestion,
  ClipboardList,
  NotebookText,
  FlaskConical,
  FileStack,
  Files,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { ResourceCard, ResourceCardSkeleton } from '@/components/resources/ResourceCard';
import { api } from '@/lib/api/client';
import { DEPARTMENTS, RESOURCE_TYPE_INFO, SEMESTERS } from '@/lib/resources/constants';
import type { Paginated, PublicResource, ResourceFacets, ResourceType } from '@/lib/resources/types';

const TYPE_ICONS: Record<ResourceType, React.ElementType> = {
  pyq: FileQuestion,
  question_bank: ClipboardList,
  notes: NotebookText,
  lab_manual: FlaskConical,
  model_paper: FileStack,
  other: Files,
};

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">{eyebrow}</p>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white mt-1">{title}</h2>
        {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<PublicResource[] | null>(null);
  const [recentError, setRecentError] = useState(false);
  const [facets, setFacets] = useState<ResourceFacets | null>(null);

  useEffect(() => {
    api<Paginated<PublicResource>>('/api/resources?sort=newest&pageSize=6', { auth: false })
      .then((r) => setRecent(r.items))
      .catch(() => setRecentError(true));
    api<ResourceFacets>('/api/resources/facets', { auth: false })
      .then(setFacets)
      .catch(() => setFacets(null));
  }, []);

  // Only show categories that actually have published resources.
  const categories = facets?.resourceTypes ?? [];

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
    <div className="flex flex-col gap-14 lg:gap-20 pb-20">
      {/* ===================== HERO ===================== */}
      <section className="border-b border-slate-200/70 dark:border-slate-800/70 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 text-center space-y-6">
          <p className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/70 dark:border-indigo-800/70 text-xs font-medium text-indigo-700 dark:text-indigo-300">
            For B.Tech students at MNNIT Allahabad
          </p>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Your Branch. Your Semester. <span className="text-indigo-600 dark:text-indigo-400">Your Preparation.</span>
          </h1>
          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Previous-year question papers, notes, question banks and lab manuals, checked by student reviewers and organised by department, semester and subject. No account needed to browse.
          </p>

          <form
            role="search"
            className="max-w-2xl mx-auto flex flex-col sm:flex-row gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const q = query.trim();
              router.push(q ? `/library?q=${encodeURIComponent(q)}` : '/library');
            }}
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search resources"
                placeholder="Search a subject, code or topic, e.g. “Data Structures endsem”"
                className="h-12 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-11 pr-4 text-[15px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <Button type="submit" variant="primary" size="lg" className="h-12">Search</Button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/library">
              <Button variant="outline">
                <BookOpen className="h-4 w-4" /> Explore the library
              </Button>
            </Link>
            <Link href="/submit">
              <Button variant="ghost">
                <FileCheck2 className="h-4 w-4" /> Contribute a resource
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ===================== CATEGORIES ===================== */}
      {categories.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <SectionHeading eyebrow="Categories" title="Browse by resource type" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((t) => {
              const Icon = TYPE_ICONS[t];
              const info = RESOURCE_TYPE_INFO[t];
              return (
                <Link key={t} href={`/library?type=${t}`} className="group block rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  <div className="h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex gap-4 items-start transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-700">
                    <div className={`h-10 w-10 shrink-0 rounded-xl border flex items-center justify-center ${info.badgeClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{info.label}</h3>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{info.description}</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ===================== DEPARTMENT & SEMESTER ===================== */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 grid gap-8 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionHeading eyebrow="Departments" title="Browse by department" />
          <div className="flex flex-wrap gap-2">
            {DEPARTMENTS.map((d) => (
              <Link
                key={d.id}
                href={`/library?department=${d.id}`}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-sm text-slate-700 dark:text-slate-300 hover:border-indigo-300 hover:text-indigo-700 dark:hover:text-indigo-300"
                title={d.name}
              >
                <span className="font-semibold">{d.code}</span>
                <span className="hidden sm:inline text-slate-400"> · {d.name}</span>
              </Link>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <SectionHeading eyebrow="Semesters" title="Browse by semester" />
          <div className="grid grid-cols-4 gap-2">
            {SEMESTERS.map((s) => (
              <Link
                key={s}
                href={`/library?semester=${s}`}
                className="py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-center hover:border-indigo-300 group"
              >
                <span className="block text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600">{s}</span>
                <span className="block text-[11px] text-slate-500">Semester</span>
              </Link>
            ))}
          </div>
          <Link href="/resources" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
            Or browse year → branch → subject <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </section>

      {/* ===================== RECENTLY ADDED ===================== */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <SectionHeading
          eyebrow="Recently added"
          title="Latest published resources"
          action={
            <Link href="/library" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        {recentError ? (
          <EmptyState tone="error" title="Recent resources could not be loaded" description="The library may be temporarily unavailable." />
        ) : recent === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }, (_, i) => <ResourceCardSkeleton key={i} />)}
          </div>
        ) : recent.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-6 w-6" />}
            title="Nothing published yet"
            description="Resources appear here as soon as they have been reviewed and published."
            action={
              <Link href="/submit">
                <Button variant="primary" size="sm">Submit the first one</Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recent.map((r) => <ResourceCard key={r.id} resource={r} />)}
          </div>
        )}
      </section>

      {/* ===================== ACADEMIC TOOLS ===================== */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
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
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
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
              Share files that are already in your Google Drive. PairPrep links to the original, a reviewer checks it, and an administrator publishes it.
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

    </div>
  );
}
