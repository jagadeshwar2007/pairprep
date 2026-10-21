'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { ResourceItem } from '@/types';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { Download, CheckCircle2, Calendar, User, HardDrive, ExternalLink, AlertTriangle, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { LocalDate } from '@/components/ui/LocalDate';
import { describeExternalHost } from '@/lib/files/urls';

interface ResourcePreviewModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ResourcePreviewModal({ resource, isOpen, onClose }: ResourcePreviewModalProps) {
  const [previewFailed, setPreviewFailed] = useState(false);
  if (!resource) return null;

  const categoryInfo = CATEGORY_LABELS[resource.category];
  const external = !resource.hosted && resource.externalUrl ? describeExternalHost(resource.externalUrl) : null;
  const inlineSrc = `/api/resources/${resource.id}/file`;
  const canPreviewInline = resource.hosted && (resource.fileType === 'pdf' || resource.fileType === 'image');

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={resource.title}
      description={`${resource.subjectCode} • ${resource.subjectName}`}
      maxWidth="4xl"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{categoryInfo?.label || resource.category}</Badge>
          <Badge variant="outline">{external ? `External • ${external.label}` : resource.fileType.toUpperCase()}</Badge>
          {resource.fileSize && <Badge variant="neutral">{resource.fileSize}</Badge>}
          {resource.verified && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50">
              <CheckCircle2 className="h-3 w-3" /> Verified by moderators
            </span>
          )}
        </div>

        {resource.description && <p className="text-sm text-slate-600 dark:text-slate-300">{resource.description}</p>}

        {/* Viewer */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 overflow-hidden">
          {canPreviewInline && !previewFailed ? (
            resource.fileType === 'image' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={inlineSrc}
                alt={resource.title}
                className="mx-auto max-h-[60vh] w-auto object-contain"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <iframe
                src={inlineSrc}
                title={`Preview of ${resource.title}`}
                className="h-[60vh] w-full"
                referrerPolicy="no-referrer"
                onError={() => setPreviewFailed(true)}
              />
            )
          ) : external ? (
            <div className="space-y-3 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-indigo-600 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <ExternalLink className="h-7 w-7" />
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">Hosted on {external.label}</h4>
              <p className="mx-auto max-w-md text-xs text-slate-500">
                This material is an external link shared by a contributor, so Pairprep cannot preview it here.
                It opens on <span className="font-medium">{external.host}</span> in a new tab.
              </p>
              {external.mayNeedAccess && (
                <p className="mx-auto flex max-w-md items-start gap-2 rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {external.label} may ask you to request access. If the file cannot be opened, use{' '}
                    <strong>Report</strong> so a moderator can check the link.
                  </span>
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-3 p-6 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white text-indigo-600 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                <FileText className="h-7 w-7" />
              </div>
              <h4 className="font-semibold text-slate-800 dark:text-slate-200">
                {previewFailed ? 'The preview could not be loaded' : 'No in-browser preview for this file type'}
              </h4>
              <p className="mx-auto max-w-md text-xs text-slate-500">Download the file to view it on your device.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left">
          {resource.author && (
            <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
              <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
                <User className="h-2.5 w-2.5" /> Credit
              </span>
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">{resource.author}</span>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" /> Published
            </span>
            <LocalDate iso={resource.uploadedAt} className="text-xs font-medium text-slate-700 dark:text-slate-300 block" />
          </div>
          <div className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-800/60">
            <span className="text-[10px] text-slate-400 uppercase font-semibold flex items-center gap-1">
              <HardDrive className="h-2.5 w-2.5" /> Format
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate block">
              {resource.fileSize ? `${resource.fileSize} • ` : ''}
              {external ? external.label : resource.fileType.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
          {resource.hosted ? (
            <a
              href={`/api/resources/${resource.id}/file?download=1`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <Download className="h-4 w-4" />
              Download {resource.fileSize ? `(${resource.fileSize})` : ''}
            </a>
          ) : (
            <a
              href={resource.externalUrl}
              target="_blank"
              rel="noopener noreferrer nofollow ugc"
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <ExternalLink className="h-4 w-4" />
              Open on {external?.label ?? 'external site'}
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
}
