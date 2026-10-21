import React from 'react';
import { ExternalLink, FileX } from 'lucide-react';
import type { ResourceItem } from '@/types';
import { EmptyState } from '@/components/ui/Feedback';

/**
 * Where a resource's document comes from. Today only same-site PDFs exist.
 * Phase 3 (Google Drive) should add another `kind` here and a branch in getViewerSource;
 * the card, dialog and layout around the viewer do not need to change.
 */
export type ViewerSource =
  | { kind: 'pdf'; url: string }
  | { kind: 'none'; reason: string };

export function getViewerSource(resource: ResourceItem): ViewerSource {
  const url = resource.previewUrl;
  if (url && url.startsWith('/') && url.toLowerCase().endsWith('.pdf')) {
    return { kind: 'pdf', url };
  }
  return { kind: 'none', reason: 'No document is attached to this resource yet.' };
}

export function ResourceViewer({ resource }: { resource: ResourceItem }) {
  const source = getViewerSource(resource);

  if (source.kind === 'none') {
    return <EmptyState icon={FileX} title="Preview unavailable" description={source.reason} />;
  }

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <iframe
          src={source.url}
          title={`Preview of ${resource.title}`}
          className="h-[50vh] min-h-[320px] w-full bg-white"
        />
        {resource.isDemo && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-md border border-amber-300 bg-amber-50/95 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-900 shadow-sm">
            Sample document, not real content
          </span>
        )}
      </div>
      <p className="flex items-center justify-between gap-3 text-xs text-slate-500">
        <span>Some mobile browsers cannot show PDFs inline.</span>
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-indigo-700 hover:underline"
        >
          Open in new tab <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
    </div>
  );
}
