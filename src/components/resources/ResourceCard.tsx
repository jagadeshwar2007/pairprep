'use client';

import React, { useState } from 'react';
import { ResourceItem } from '@/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import {
  Download,
  Eye,
  CheckCircle2,
  Flag,
} from 'lucide-react';
import { ResourcePreviewModal } from './ResourcePreviewModal';
import { ReportResourceModal } from './ReportResourceModal';

interface ResourceCardProps {
  resource: ResourceItem;
  showSubjectBadge?: boolean;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const categoryInfo = CATEGORY_LABELS[resource.category] || {
    label: resource.category,
    badgeColor: 'bg-slate-100 text-slate-800',
  };

  const handleDownload = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  return (
    <>
      <Card
        hoverEffect
        className="flex flex-col justify-between border-slate-200/90 dark:border-slate-800 transition-all duration-200 hover:border-indigo-400 group relative"
      >
        <div>
          {/* Header Row: Category Badge + File Type + Verification */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${categoryInfo.badgeColor}`}
            >
              {categoryInfo.label}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono uppercase font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {resource.fileType}
              </span>
              {resource.verified && (
                <span
                  title="Verified by MNNIT Student Reviewers"
                  className="text-emerald-600 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4" />
                </span>
              )}
            </div>
          </div>

          {/* Title */}
          <h4 className="text-base font-bold text-slate-900 dark:text-white line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {resource.title}
          </h4>

          {/* Subject & Branch Info */}
          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {resource.branchCode} • Sem {resource.semester}
            </span>
            <span>•</span>
            <span className="truncate max-w-[220px]">
              {resource.subjectName} ({resource.subjectCode})
            </span>
          </div>

          {resource.description && (
            <p className="mt-2 text-xs text-slate-500 line-clamp-2">
              {resource.description}
            </p>
          )}

          {/* Tags */}
          {resource.tags && resource.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {resource.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="text-[10px] px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800/60 text-slate-500 border border-slate-200/50 dark:border-slate-800"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer Meta & Actions */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-3">
            <span>
              {resource.fileSize ? `${resource.fileSize} • ` : ''}
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

          {downloadSuccess && (
            <div className="mb-2 p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-center text-xs font-medium animate-pulse">
              Download initiated! (Demo storage link)
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => setPreviewOpen(true)}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5 text-indigo-500" />
              Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="flex-1 text-xs"
              onClick={handleDownload}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Download
            </Button>
          </div>
        </div>
      </Card>

      {/* Preview Modal */}
      <ResourcePreviewModal
        resource={resource}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onDownload={handleDownload}
      />

      {/* Report Modal */}
      <ReportResourceModal
        resource={resource}
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </>
  );
}
