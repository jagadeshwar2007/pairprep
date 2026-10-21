import React from 'react';
import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { ACADEMIC_YEARS, BRANCHES, SUBJECTS } from '@/data/academicData';
import { CATEGORY_LABELS, DEMO_RESOURCES } from '@/data/resourcesData';
import { getRecentRealResources } from '@/lib/library';
import { STUDY_TOOLS } from '@/data/studyTools';
import { ResourceCard } from '@/components/resources/ResourceCard';
import { buttonClass } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { Page, Section } from '@/components/ui/Layout';
import type { ResourceCategory } from '@/types';
import { FileText } from 'lucide-react';

export default function HomePage() {
  const recent = getRecentRealResources(DEMO_RESOURCES, 4);
  const categories = Object.keys(CATEGORY_LABELS) as ResourceCategory[];

  return (
    <>
      {/* Hero */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-indigo-700">
              For MNNIT Allahabad B.Tech students
            </p>
            <h1 className="font-display mt-4 text-4xl font-semibold leading-[1.1] text-slate-900 text-balance sm:text-5xl lg:text-6xl">
              Study material, organised the way your degree is.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Find notes, papers and course details by branch, semester and subject, and keep your grades and
              attendance in check with a few simple tools.
            </p>

            <form action="/resources" method="get" role="search" className="mt-8 flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  name="q"
                  autoComplete="off"
                  placeholder="Search a subject or course code"
                  aria-label="Search the library"
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white pl-12 pr-4 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <button type="submit" className={buttonClass('primary', 'lg')}>
                Search library
              </button>
            </form>
            <p className="mt-3 text-sm text-slate-500">
              {SUBJECTS.length} subjects across {BRANCHES.length} branches are catalogued. Resource uploads are not open
              yet, so the library currently contains demonstration entries only.
            </p>
          </div>
        </div>
      </section>

      <Page className="!pt-10">
        {/* Departments */}
        <Section
          title="Browse by branch"
          description="Open the library filtered to your department."
          action={
            <Link href="/resources" className="hidden text-sm font-medium text-indigo-700 hover:underline sm:inline">
              All branches
            </Link>
          }
        >
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {BRANCHES.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/resources?branch=${b.id}`}
                  className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-indigo-300"
                >
                  <span className="w-12 shrink-0 font-mono text-xs font-semibold text-indigo-700">{b.code}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-800">{b.name}</span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-600" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {/* Semesters */}
        <Section title="Browse by semester" description="Jump to every subject taught in a semester, across branches.">
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => {
              const year = ACADEMIC_YEARS.find((y) => y.semesters.includes(n));
              return (
                <li key={n}>
                  <Link
                    href={`/resources?semester=${n}`}
                    className="block rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-indigo-300"
                  >
                    <span className="font-display text-2xl font-semibold text-slate-900">Sem {n}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">{year?.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Categories */}
        <Section title="Browse by resource type">
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {categories.map((c) => (
              <li key={c}>
                <Link
                  href={`/resources?type=${c}`}
                  className="block h-full rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-indigo-300"
                >
                  <span className="text-sm font-semibold text-slate-900">{CATEGORY_LABELS[c].label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {CATEGORY_LABELS[c].description}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Section>

        {/* Recently added: only real (non-demo) resources ever appear here */}
        <Section title="Recently added">
          {recent.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {recent.map((r) => (
                <ResourceCard key={r.id} resource={r} showSubject />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FileText}
              title="No resources have been published yet"
              description="Uploads open in a later release. Until then the library holds clearly marked demonstration entries, which are not listed here."
              action={
                <>
                  <Link href="/resources" className={buttonClass('outline')}>
                    See the demo entries
                  </Link>
                  <Link href="/submit" className={buttonClass('subtle')}>
                    Preview the contribution form
                  </Link>
                </>
              }
            />
          )}
        </Section>

        {/* Tools */}
        <Section
          title="Study tools"
          description="Calculators and planners that work on their own, with no account."
          action={
            <Link href="/tools" className="hidden text-sm font-medium text-indigo-700 hover:underline sm:inline">
              All tools
            </Link>
          }
        >
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {STUDY_TOOLS.map((t) => {
              const Icon = t.icon;
              return (
                <li key={t.href}>
                  <Link
                    href={t.href}
                    className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors hover:border-indigo-300"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="text-sm font-medium text-slate-800">{t.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Section>

        {/* Call to action */}
        <section className="rounded-xl border border-slate-200 bg-white px-6 py-10 text-center sm:px-10">
          <h2 className="font-display text-2xl font-semibold text-slate-900 sm:text-3xl">Start with your subjects</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Pick your branch and semester to see exactly what you are studying this term.
          </p>
          <Link href="/resources" className={buttonClass('primary', 'lg', 'mt-6')}>
            Explore the library <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>
      </Page>
    </>
  );
}
