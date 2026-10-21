import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { RESOURCE_TYPE_INFO, departmentLabel, fileFormatLabel } from '@/lib/resources/constants';
import type { PublicResource } from '@/lib/resources/types';

export function ResourceTypeBadge({ type }: { type: PublicResource['resourceType'] }) {
  const info = RESOURCE_TYPE_INFO[type];
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${info.badgeClass}`}>
      {info.shortLabel}
    </span>
  );
}

export function ResourceCard({ resource }: { resource: PublicResource }) {
  return (
    <Link href={`/library/${resource.id}`} className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-2xl">
      <Card className="h-full flex flex-col p-5 transition-colors group-hover:border-indigo-300 dark:group-hover:border-indigo-700">
        <div className="flex items-center justify-between gap-2">
          <ResourceTypeBadge type={resource.resourceType} />
          <span className="text-[10px] font-mono uppercase font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {fileFormatLabel(resource.mimeType)}
          </span>
        </div>
        <h3 className="mt-3 text-[15px] font-semibold leading-snug text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
          {resource.title}
        </h3>
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">
          {resource.subject}
          {resource.subjectCode ? ` · ${resource.subjectCode}` : ''}
        </p>
        {resource.description && (
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{resource.description}</p>
        )}
        <div className="mt-auto pt-4 flex items-center justify-between text-xs text-slate-500">
          <span className="flex flex-wrap items-center gap-x-1.5">
            <span className="font-medium text-slate-700 dark:text-slate-300">{departmentLabel(resource.department)}</span>
            <span aria-hidden>·</span>
            <span>Sem {resource.semester}</span>
            {resource.academicYear && (
              <>
                <span aria-hidden>·</span>
                <span>{resource.academicYear}</span>
              </>
            )}
            {resource.unit && (
              <>
                <span aria-hidden>·</span>
                <span>Unit {resource.unit}</span>
              </>
            )}
          </span>
          <ArrowUpRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500" aria-hidden />
        </div>
      </Card>
    </Link>
  );
}

export function ResourceCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-5 space-y-3" aria-hidden>
      <div className="flex justify-between">
        <div className="h-5 w-20 rounded-full bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
        <div className="h-5 w-10 rounded bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
      </div>
      <div className="h-4 w-4/5 rounded bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-slate-200/70 dark:bg-slate-800 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-slate-200/70 dark:bg-slate-800 animate-pulse mt-6" />
    </div>
  );
}

