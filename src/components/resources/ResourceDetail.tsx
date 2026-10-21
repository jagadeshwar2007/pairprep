'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, ExternalLink, FileX2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ResourceTypeBadge } from './ResourceCard';
import { api, ApiRequestError } from '@/lib/api/client';
import {
  RESOURCE_TYPE_INFO,
  departmentName,
  fileFormatLabel,
  formatFileSize,
} from '@/lib/resources/constants';
import type { DriveAvailability, PublicResource } from '@/lib/resources/types';

interface DetailResponse {
  resource: PublicResource;
  availability: DriveAvailability;
  availabilityMessage: string | null;
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <dt className="text-xs text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-slate-800 dark:text-slate-200">{value}</dd>
    </div>
  );
}

export function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DetailResponse | null>(null);
  const [error, setError] = useState<ApiRequestError | Error | null>(null);
  const [previewLoaded, setPreviewLoaded] = useState(false);

  useEffect(() => {
    api<DetailResponse>(`/api/resources/${encodeURIComponent(id)}`, { auth: false })
      .then((d) => {
        setData(d);
        document.title = `${d.resource.title} | PairPrep`;
      })
      .catch(setError);
  }, [id]);

  const back = (
    <Link href="/library" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
      <ArrowLeft className="h-4 w-4" /> Back to library
    </Link>
  );

  if (error) {
    const missing = error instanceof ApiRequestError && error.status === 404;
    return (
      <div className="space-y-6">
        {back}
        <EmptyState
          tone={missing ? 'neutral' : 'error'}
          icon={missing ? <FileX2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          title={missing ? 'This resource is not available' : 'The resource could not be loaded'}
          description={missing ? 'It may have been unpublished or the link is incorrect.' : error.message}
          action={
            <Link href="/library">
              <Button variant="outline" size="sm">Browse the library</Button>
            </Link>
          }
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }

  const { resource: r, availability, availabilityMessage } = data;
  const unavailable = availability !== 'available' && availability !== 'not_configured';
  const typeInfo = RESOURCE_TYPE_INFO[r.resourceType];

  return (
    <div className="space-y-6">
      {back}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5 min-w-0">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ResourceTypeBadge type={r.resourceType} />
              {r.verificationStatus === 'approved' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Reviewed and approved
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white break-words">{r.title}</h1>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {r.subject}
              {r.subjectCode ? ` (${r.subjectCode})` : ''} · {departmentName(r.department)} · Semester {r.semester}
            </p>
          </div>

          {unavailable ? (
            <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30 p-5 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-sm text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold">The document can&apos;t be opened right now</p>
                <p>{availabilityMessage ?? 'The file is no longer reachable on Google Drive.'}</p>
                <p className="text-xs">The PairPrep team has the original reference and can restore it. You can try opening it in Drive directly.</p>
              </div>
            </div>
          ) : (
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900">
              {!previewLoaded && <Skeleton className="absolute inset-0 rounded-none" />}
              <iframe
                src={r.links.preview}
                title={`Preview of ${r.title}`}
                className="relative w-full h-[70vh] min-h-[420px]"
                allow="autoplay"
                referrerPolicy="no-referrer"
                onLoad={() => setPreviewLoaded(true)}
              />
            </div>
          )}

          {r.description && (
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">About this resource</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-line">{r.description}</p>
            </div>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 self-start">
          <Card className="p-5 space-y-3">
            <a href={r.links.open} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="primary" className="w-full">
                <ExternalLink className="h-4 w-4" /> Open in Google Drive
              </Button>
            </a>
            {r.links.download ? (
              <a href={r.links.download} target="_blank" rel="noopener noreferrer" className="block">
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4" /> Download
                </Button>
              </a>
            ) : (
              <p className="text-xs text-slate-500 text-center">
                {unavailable ? 'Download is unavailable while the file is unreachable.' : 'The owner has disabled downloads for this file.'}
              </p>
            )}
          </Card>
          <Card className="p-5">
            <dl className="grid grid-cols-2 gap-4">
              <Meta label="Type" value={typeInfo.label} />
              <Meta label="Academic year" value={r.academicYear} />
              <Meta label="Department" value={departmentName(r.department)} />
              <Meta label="Semester" value={r.semester} />
              <Meta label="Unit" value={r.unit} />
              <Meta label="Format" value={fileFormatLabel(r.mimeType)} />
              <Meta label="Size" value={formatFileSize(r.fileSizeBytes)} />
              <Meta label="Contributed by" value={r.uploaderName} />
              <Meta
                label="Published"
                value={r.publishedAt ? new Date(r.publishedAt).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : null}
              />
            </dl>
            {r.keywords.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                {r.keywords.map((k) => (
                  <Link
                    key={k}
                    href={`/library?q=${encodeURIComponent(k)}`}
                    className="text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600"
                  >
                    {k}
                  </Link>
                ))}
              </div>
            )}
          </Card>
          <p className="text-xs text-slate-500 px-1">
            Files stay in their owners&apos; Google Drive. Access follows the file&apos;s Drive sharing settings.
          </p>
        </aside>
      </div>
    </div>
  );
}
