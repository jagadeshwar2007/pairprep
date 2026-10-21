'use client';

import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { ResourceItem } from '@/types';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import {
  Download,
  FileText,
  CheckCircle2,
  Calendar,
  User,
  HardDrive,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

interface ResourcePreviewModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onDownload: (res: ResourceItem) => void;
}

export function ResourcePreviewModal({
  resource,
  isOpen,
  onClose,
  onDownload,
}: ResourcePreviewModalProps) {
  if (!resource) return null;

  const categoryInfo = CATEGORY_LABELS[resource.category];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resource.title}
      description={`${resource.subjectCode} • ${resource.subjectName}`}
      maxWidth="2xl"
    >
      <div className="space-y-5">
        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{categoryInfo?.label || resource.category}</Badge>
          <Badge variant="outline">{resource.fileType.toUpperCase()}</Badge>
          {resource.fileSize && <Badge variant="neutral">{resource.fileSize}</Badge>}
          {resource.verified && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
              <CheckCircle2 className="h-3 w-3" /> Peer Verified
            </span>
          )}
        </div>

        {/* Mock Document Viewer Panel */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 text-center space-y-4">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-indigo-600 shadow-sm">
            <FileText className="h-8 w-8" />
          </div>

          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200">
              Interactive PDF Document Preview
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
              {resource.description ||
                'High-resolution PDF scan optimized for mobile and desktop reading. Verified for MNNIT academic standards.'}
            </p>
          </div>

          {/* Document metadata table */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left pt-2">
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                <User className="h-2.5 w-2.5" /> Contributor
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
                {resource.author}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" /> Uploaded
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
                {resource.uploadedAt}
              </span>
            </div>
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block flex items-center gap-1">
                <HardDrive className="h-2.5 w-2.5" /> Size / Format
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
                {resource.fileSize || 'Standard'} • {resource.fileType.toUpperCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Notice */}
        <div className="text-[11px] text-slate-400 bg-slate-100 dark:bg-slate-800/50 p-2.5 rounded-lg">
          Note: In production with Firebase Storage connected, this viewer embeds PDF.js with page navigation, bookmarking, and search.
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <Button
            variant="primary"
            className="flex-1"
            onClick={() => onDownload(resource)}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Resource ({resource.fileSize || 'PDF'})
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close Preview
          </Button>
        </div>
      </div>
    </Modal>
  );
}
