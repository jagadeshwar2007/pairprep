'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, FileText, Flag, FileArchive, Link2 } from 'lucide-react';
import { ResourceItem } from '@/types';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DemoBadge } from './DemoBadge';
import { ResourcePreviewModal } from './ResourcePreviewModal';
import { ReportResourceModal } from './ReportResourceModal';

const FILE_ICONS: Record<ResourceItem['fileType'], React.ElementType> = {
  pdf: FileText,
  doc: FileText,
  zip: FileArchive,
  link: Link2,
};

interface ResourceCardProps {
  resource: ResourceItem;
  /** Show the subject name as a link (used in library results, hidden on a subject's own page). */
  showSubject?: boolean;
}

export function ResourceCard({ resource, showSubject = false }: ResourceCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const category = CATEGORY_LABELS[resource.category]?.label ?? resource.category;
  const Icon = FILE_ICONS[resource.fileType] ?? FileText;
  const subjectHref = `/resources/${resource.yearId}/${resource.branchId}/${resource.semester}/${resource.subjectId}`;

  return (
    <>
      <article className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(20,23,31,0.04)] transition-colors hover:border-slate-300">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
              {resource.isDemo && <DemoBadge />}
              <Badge variant="primary" size="sm">
                {category}
              </Badge>
              <Badge variant="neutral" size="sm">
                {resource.fileType.toUpperCase()}
              </Badge>
            </div>
            <h3 className="text-[15px] font-semibold leading-snug text-slate-900 line-clamp-2">{resource.title}</h3>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-600">
          {showSubject ? (
            <Link href={subjectHref} className="font-medium text-indigo-700 hover:underline">
              {resource.subjectName}
            </Link>
          ) : (
            resource.subjectName
          )}
          <span className="text-slate-400">
            {' '}
            · {resource.branchCode} · Sem {resource.semester}
            {resource.subjectCode ? ` · ${resource.subjectCode}` : ''}
          </span>
        </p>

        {resource.description && (
          <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">{resource.description}</p>
        )}

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="truncate text-[11px] text-slate-400" title={resource.author}>
            {resource.author} · {resource.uploadedAt}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={() => setReportOpen(true)}
              className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600 cursor-pointer"
              aria-label={`Report a problem with ${resource.title}`}
            >
              <Flag className="h-3.5 w-3.5" />
            </button>
            <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5" /> Preview
            </Button>
          </div>
        </div>
      </article>

      <ResourcePreviewModal
        resource={resource}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onReport={() => {
          setPreviewOpen(false);
          setReportOpen(true);
        }}
      />
      <ReportResourceModal resource={resource} isOpen={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}
