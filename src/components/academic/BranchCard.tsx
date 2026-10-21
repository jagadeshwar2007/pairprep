import React from 'react';
import Link from 'next/link';
import { Branch } from '@/types';
import { Card } from '@/components/ui/Card';
import {
  Laptop,
  Cpu,
  Zap,
  Wrench,
  Building2,
  FlaskConical,
  Factory,
  Dna,
  ArrowRight,
} from 'lucide-react';

interface BranchCardProps {
  branch: Branch;
  yearId?: string; // If passed, navigate to specific year branch
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
};

export function BranchCard({ branch, yearId = 'second-year' }: BranchCardProps) {
  const IconComponent = ICON_MAP[branch.iconName] || Laptop;

  return (
    <Link href={`/resources/${yearId}/${branch.id}`} className="group block focus:outline-none">
      <Card
        hoverEffect
        className="h-full flex flex-col justify-between transition-all duration-200 group-hover:border-indigo-400 group-hover:shadow-md dark:group-hover:border-indigo-500"
      >
        <div>
          <div className="flex items-center justify-between mb-3">
            <div
              className={`h-11 w-11 rounded-xl flex items-center justify-center border ${branch.color} group-hover:scale-105 transition-transform`}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              {branch.code}
            </span>
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {branch.name}
          </h4>

          <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
            {branch.description}
          </p>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-medium text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          <span>View Semesters</span>
          <ArrowRight className="h-3.5 w-3.5 transform transition-transform group-hover:translate-x-1" />
        </div>
      </Card>
    </Link>
  );
}
