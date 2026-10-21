'use client';

import React, { useState } from 'react';
import { ResourceItem } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { describeExternalHost } from '@/lib/files/urls';
import { Download, Eye, CheckCircle2, Flag, ExternalLink } from 'lucide-react';
import { ResourcePreviewModal } from './ResourcePreviewModal';
import { ReportResourceModal } from './ReportResourceModal';
import { BookmarkButton } from './BookmarkButton';

interface ResourceCardProps {
  resource: ResourceItem;
  showSubjectBadge?: boolean;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const categoryInfo = CATEGORY_LABELS[resource.category] || {
    label: resource.category,
    badgeColor: 'bg-slate-100 text-slate-800',
  };
  const external = !resource.hosted && resource.externalUrl ? describeExternalHost(resource.externalUrl) : null;

  return (
    <>
      <Card
        hoverEffect
        className="flex flex-col justify-between border-slate-200/90 dark:border-slate-800 transition-all duration-200 hover:border-indigo-400 group relative"
      >
        <div>
          {/* Header Row: Category Badge + File Type + Verification */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${categoryInfo.badgeColor}`}>
              {categoryInfo.label}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {external ? 'external' : resource.fileType}
              </span>
              {resource.verified && (
                <span title="Reviewed and approved by Pairprep moderators" className="text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" aria-label="Verified" />
                </span>
              )}
              <BookmarkButton resourceId={resource.id} />
            </div>
          </div>

          <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {resource.title}
          </h4>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {resource.branchCode} • Sem {resource.semester}
            </span>
            <span>•</span>
            <span className="truncate max-w-[220px]">
              {resource.subjectName} ({resource.subjectCode})
            </span>
          </div>

          {resource.description && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{resource.description}</p>}

          {resource.tags && resource.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-500 border border-slate-200/50 dark:border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <span>
              {external ? `Hosted on ${external.label} • ` : resource.fileSize ? `${resource.fileSize} • ` : ''}
              {resource.downloadsCount.toLocaleString()} downloads
            </span>
            <button
              onClick={() => setReportOpen(true)}
              className="text-slate-400 hover:text-rose-500 transition-colors flex items-center gap-1 text-[11px] cursor-pointer"
              title="Report issue with this file"
            >
              <Flag className="h-3 w-3" />
              <span>Report</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => setPreviewOpen(true)}>
              <Eye className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
              Preview
            </Button>
            {resource.hosted ? (
              <a
                href={`/api/resources/${resource.id}/file?download=1`}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            ) : (
              <a
                href={resource.externalUrl}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open link
              </a>
            )}
          </div>
        </div>
      </Card>

      <ResourcePreviewModal resource={resource} isOpen={previewOpen} onClose={() => setPreviewOpen(false)} />
      <ReportResourceModal resource={resource} isOpen={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}
