import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { STUDY_TOOLS } from '@/data/studyTools';
import { Notice } from '@/components/ui/Feedback';
import { Page, PageHeader } from '@/components/ui/Layout';

export const metadata = {
  title: 'Study tools',
  description:
    'Attendance, SGPA and CGPA calculators, a scientific calculator, a study timer, the academic calendar and a practice quiz for MNNIT students.',
};

export default function ToolsHubPage() {
  return (
    <Page>
      <PageHeader
        eyebrow="Study tools"
        title="Tools for the semester"
        description="Small utilities that run entirely in your browser. No account is needed and nothing you enter is stored."
        breadcrumbs={[{ label: 'Study tools' }]}
      />

      <Notice title="About the numbers">
        Grading scales, attendance thresholds and conversion factors in these tools are common assumptions, not rules
        confirmed with the institute. Treat results as estimates.
      </Notice>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {STUDY_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <li key={tool.href}>
              <Link href={tool.href} className="group block h-full rounded-xl">
                <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(20,23,31,0.04)] transition-colors group-hover:border-indigo-300">
                  <div className="flex items-center justify-between">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <ArrowUpRight className="h-4 w-4 text-slate-300 transition-colors group-hover:text-indigo-600" aria-hidden="true" />
                  </div>
                  <h2 className="mt-4 text-base font-semibold text-slate-900">{tool.title}</h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{tool.description}</p>
                  {tool.caveat && <p className="mt-auto pt-4 text-xs leading-relaxed text-slate-500">{tool.caveat}</p>}
                </article>
              </Link>
            </li>
          );
        })}
      </ul>
    </Page>
  );
}
