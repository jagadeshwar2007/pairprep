import React from 'react';
import Link from 'next/link';
import { Branch } from '@/types';
import { Laptop, Cpu, Zap, Wrench, Building2, FlaskConical, Factory, Dna, Layers, ArrowRight } from 'lucide-react';

interface BranchCardProps {
  branch: Branch;
  yearId?: string;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Laptop,
  Cpu,
  Zap,
  Wrench,
  Building2,
  FlaskConical,
  Factory,
  Dna,
  Layers,
};

export function BranchCard({ branch, yearId = 'second-year' }: BranchCardProps) {
  const Icon = ICON_MAP[branch.iconName] || Laptop;

  return (
    <Link href={`/resources/${yearId}/${branch.id}`} className="group block h-full rounded-xl">
      <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(20,23,31,0.04)] transition-colors group-hover:border-indigo-300">
        <div className="flex items-center justify-between">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700 group-hover:bg-indigo-50 group-hover:text-indigo-700">
            <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-medium text-slate-600">
            {branch.code}
          </span>
        </div>
        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-900">{branch.name}</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500 line-clamp-2">{branch.description}</p>
        <span className="mt-auto flex items-center gap-1 pt-3 text-xs font-medium text-indigo-700">
          View semesters
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </article>
    </Link>
  );
}
