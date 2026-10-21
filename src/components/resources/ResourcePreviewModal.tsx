'use client';

import React from 'react';
import { Link2, Flag } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Notice } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { ResourceItem } from '@/types';
import { CATEGORY_LABELS } from '@/data/resourcesData';
import { DemoBadge } from './DemoBadge';
import { ResourceViewer } from './ResourceViewer';

interface ResourcePreviewModalProps {
  resource: ResourceItem | null;
  isOpen: boolean;
  onClose: () => void;
  onReport?: () => void;
}

export function ResourcePreviewModal({ resource, isOpen, onClose, onReport }: ResourcePreviewModalProps) {
  const { notify } = useToast();
  if (!resource) return null;

  const category = CATEGORY_LABELS[resource.category]?.label ?? resource.category;
  const subjectPath = `/resources/${resource.yearId}/${resource.branchId}/${resource.semester}/${resource.subjectId}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${subjectPath}`);
      notify('Link to this subject copied');
    } catch {
      notify('Could not copy the link in this browser', 'error');
    }
  };

  const details: Array<[string, string]> = [
    ['Subject', `${resource.subjectName} (${resource.subjectCode || 'code not listed'})`],
    ['Branch', `${resource.branchCode}, semester ${resource.semester}`],
    ['Type', category],
    ['Format', resource.fileType.toUpperCase()],
    ['Contributor', resource.author],
    ['Added', resource.uploadedAt],
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={resource.title} maxWidth="4xl">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {resource.isDemo && <DemoBadge />}
          <Badge variant="primary">{category}</Badge>
          <Badge variant="outline">{resource.fileType.toUpperCase()}</Badge>
        </div>

        {resource.isDemo && (
          <Notice tone="demo" title="Demonstration resource">
            This entry is a placeholder used to show how the library will look. The PDF below is a generic sample page,
            not an exam paper or notes, and nobody has reviewed or verified this entry.
          </Notice>
        )}

        <ResourceViewer resource={resource} />

        {resource.description && <p className="text-sm leading-relaxed text-slate-600">{resource.description}</p>}

        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
          {details.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="w-24 shrink-0 text-slate-500">{k}</dt>
              <dd className="min-w-0 break-words font-medium text-slate-800">{v}</dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {onReport && (
            <Button variant="ghost" onClick={onReport}>
              <Flag className="h-4 w-4" /> Report a problem
            </Button>
          )}
          <Button variant="outline" onClick={copyLink}>
            <Link2 className="h-4 w-4" /> Copy subject link
          </Button>
          <Button variant="primary" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
