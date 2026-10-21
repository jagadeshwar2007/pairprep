'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Send, Eye, EyeOff, Ban, Trash2, Pencil, CheckCircle2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { Badge } from '@/components/ui/Badge';
import { PublicationBadge, VerificationBadge } from '@/components/ui/StatusBadge';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/components/auth/AuthProvider';
import { ResourceForm, formErrorsFrom, toPayload, valuesFromResource } from '@/components/resources/ResourceForm';
import { api } from '@/lib/api/client';
import { buildDriveLinks } from '@/lib/drive/fileId';
import { RESOURCE_TYPE_INFO, departmentName, fileFormatLabel, formatFileSize } from '@/lib/resources/constants';
import type { Resource, ReviewAssignment, UserProfile } from '@/lib/resources/types';

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '–');

function inScope(u: UserProfile, r: Resource) {
  if (u.role === 'admin') return true;
  const { departments, subjects } = u.reviewerScope;
  const deptOk = departments.length === 0 || departments.includes(r.department);
  const subjOk =
    subjects.length === 0 ||
    subjects.includes(r.subject.toLowerCase()) ||
    (!!r.subjectCode && subjects.includes(r.subjectCode.toLowerCase()));
  return deptOk && subjOk;
}

export function ResourceManageModal({ resourceId, onClose, onChanged }: { resourceId: string; onClose(): void; onChanged(): void }) {
  const toast = useToast();
  const { user } = useAuth();
  const [resource, setResource] = useState<Resource | null>(null);
  const [assignments, setAssignments] = useState<ReviewAssignment[]>([]);
  const [reviewers, setReviewers] = useState<UserProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'reject' | 'delete'>('view');
  const [reviewerUid, setReviewerUid] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const load = useCallback(
    () =>
      api<{ resource: Resource; assignments: ReviewAssignment[] }>(`/api/admin/resources/${resourceId}`)
        .then((d) => {
          setResource(d.resource);
          setAssignments(d.assignments);
        })
        .catch((e: Error) => setError(e.message)),
    [resourceId]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api<{ items: UserProfile[] }>('/api/admin/users')
      .then((d) => setReviewers(d.items.filter((u) => u.role === 'reviewer' || u.role === 'admin')))
      .catch(() => setReviewers([]));
  }, []);

  const run = async (key: string, fn: () => Promise<unknown>, success: string) => {
    setBusy(key);
    try {
      await fn();
      toast(success, 'success');
      onChanged();
      await load();
      setMode('view');
      return true;
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Action failed', 'error');
      return false;
    } finally {
      setBusy(null);
    }
  };

  const action = (a: 'publish' | 'unpublish' | 'reject', msg: string, r?: string) =>
    run(a, () => api(`/api/admin/resources/${resourceId}/actions`, { body: { action: a, reason: r } }), msg);

  const r = resource;
  const eligible = r ? reviewers.filter((u) => u.uid !== r.uploadedBy) : [];
  const canAssign = r && r.publicationStatus !== 'published' && (r.verificationStatus === 'pending' || r.verificationStatus === 'under_review' || r.verificationStatus === 'rejected');
  const canPublish = r && r.verificationStatus === 'approved' && r.publicationStatus !== 'published' && r.approval && r.approval.reviewerUid !== r.uploadedBy;
  const links = r ? buildDriveLinks(r.driveFileId, r.mimeType, r.downloadAllowed) : null;

  return (
    <Modal isOpen onClose={onClose} title={r?.title ?? 'Resource'} description={r ? `${r.subject} · ${departmentName(r.department)} · Semester ${r.semester}` : undefined} maxWidth="2xl">
      {error ? (
        <p className="text-sm text-rose-600">{error}</p>
      ) : !r ? (
        <Skeleton className="h-64 w-full" />
      ) : mode === 'edit' ? (
        <ResourceForm
          mode="edit"
          initial={valuesFromResource(r)}
          errors={formErrors}
          busy={busy === 'edit'}
          submitLabel="Save changes"
          driveHint="Changing the file resets review and unpublishes the resource."
          onCancel={() => setMode('view')}
          onSubmit={async (values) => {
            setFormErrors({});
            const payload = toPayload(values, 'edit');
            if (payload.driveRef === r.driveFileId) delete payload.driveRef;
            setBusy('edit');
            try {
              await api(`/api/admin/resources/${resourceId}`, { method: 'PATCH', body: payload });
              toast('Saved', 'success');
              onChanged();
              await load();
              setMode('view');
            } catch (e) {
              setFormErrors(formErrorsFrom(e));
            } finally {
              setBusy(null);
            }
          }}
        />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <VerificationBadge status={r.verificationStatus} />
            <PublicationBadge status={r.publicationStatus} />
            <Badge variant="outline" size="sm">{RESOURCE_TYPE_INFO[r.resourceType].label}</Badge>
            <Badge variant="neutral" size="sm">{fileFormatLabel(r.mimeType)}{formatFileSize(r.fileSizeBytes) ? ` · ${formatFileSize(r.fileSizeBytes)}` : ''}</Badge>
            {!r.downloadAllowed && <Badge variant="warning" size="sm">Download disabled by owner</Badge>}
          </div>

          <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div><dt className="text-xs text-slate-500">Drive file</dt><dd className="truncate" title={r.fileName}>{r.fileName}</dd></div>
            <div><dt className="text-xs text-slate-500">Academic year</dt><dd>{r.academicYear ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Unit</dt><dd>{r.unit ?? '–'}</dd></div>
            <div><dt className="text-xs text-slate-500">Uploaded by</dt><dd>{r.uploaderName} ({r.source})</dd></div>
            <div><dt className="text-xs text-slate-500">Created</dt><dd>{fmt(r.createdAt)}</dd></div>
            <div><dt className="text-xs text-slate-500">Published</dt><dd>{fmt(r.publishedAt)}</dd></div>
          </dl>
          {r.description && <p className="text-sm text-slate-600 dark:text-slate-300">{r.description}</p>}
          {r.contributorNote && <p className="text-xs bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2.5">Contributor note: {r.contributorNote}</p>}
          {r.rejectionReason && r.verificationStatus === 'rejected' && <p className="text-xs text-rose-600">Rejection reason: {r.rejectionReason}</p>}

          {links && (
            <div className="flex flex-wrap gap-2">
              <a href={links.open} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><ExternalLink className="h-3.5 w-3.5" /> Open in Drive</Button></a>
              {r.publicationStatus === 'published' && (
                <a href={`/library/${r.id}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><Eye className="h-3.5 w-3.5" /> View in library</Button></a>
              )}
              <Button variant="ghost" size="sm" onClick={() => setMode('edit')}><Pencil className="h-3.5 w-3.5" /> Edit metadata</Button>
            </div>
          )}

          {/* Review assignment */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
            <h4 className="text-sm font-semibold">Review</h4>
            {canAssign ? (
              <div className="flex flex-col sm:flex-row gap-2">
                <Select aria-label="Reviewer" value={reviewerUid} onChange={(e) => setReviewerUid(e.target.value)}>
                  <option value="">Choose a reviewer…</option>
                  {eligible.map((u) => (
                    <option key={u.uid} value={u.uid} disabled={!inScope(u, r)}>
                      {u.displayName} {u.role === 'admin' ? '(admin)' : ''}{u.uid === user?.uid ? ' (you)' : ''}{!inScope(u, r) ? ' · out of scope' : ''}
                    </option>
                  ))}
                </Select>
                <Button
                  variant="primary"
                  size="md"
                  disabled={!reviewerUid}
                  isLoading={busy === 'assign'}
                  onClick={() => run('assign', () => api(`/api/admin/resources/${resourceId}/assign`, { body: { reviewerUid } }), 'Reviewer assigned')}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" /> Assign
                </Button>
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {r.publicationStatus === 'published' ? 'Unpublish to send it for review again.' : r.verificationStatus === 'approved' ? 'Approved by a reviewer.' : ''}
              </p>
            )}
            {eligible.length === 0 && canAssign && (
              <p className="text-xs text-amber-700 dark:text-amber-400">No eligible reviewers. Grant reviewer access in the Users tab. The uploader cannot review their own resource.</p>
            )}
            {assignments.length > 0 && (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                {assignments.map((a) => (
                  <li key={a.id} className="py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{a.reviewerName}</span>
                      <Badge size="sm" variant={a.status === 'assigned' ? 'primary' : a.status === 'cancelled' ? 'neutral' : a.decision === 'approve' ? 'success' : 'danger'}>
                        {a.status === 'assigned' ? 'Awaiting decision' : a.status === 'cancelled' ? 'Cancelled' : a.decision === 'approve' ? 'Approved' : 'Rejected'}
                      </Badge>
                      <span className="text-xs text-slate-400">{fmt(a.completedAt ?? a.createdAt)}</span>
                    </div>
                    {a.comments && <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">“{a.comments}”</p>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Publication */}
          {mode === 'reject' ? (
            <div className="space-y-2">
              <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to the contributor" aria-label="Rejection reason" />
              <div className="flex gap-2">
                <Button variant="danger" size="sm" disabled={!reason.trim()} isLoading={busy === 'reject'} onClick={() => action('reject', 'Rejected', reason.trim())}>Reject resource</Button>
                <Button variant="outline" size="sm" onClick={() => setMode('view')}>Cancel</Button>
              </div>
            </div>
          ) : mode === 'delete' ? (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-4 space-y-2">
              <p className="text-sm text-rose-800 dark:text-rose-200">Delete this record and its review history? The Drive file itself is not touched.</p>
              <div className="flex gap-2">
                <Button
                  variant="danger"
                  size="sm"
                  isLoading={busy === 'delete'}
                  onClick={async () => {
                    const ok = await run('delete', () => api(`/api/admin/resources/${resourceId}`, { method: 'DELETE' }), 'Deleted');
                    if (ok) onClose();
                  }}
                >
                  Delete permanently
                </Button>
                <Button variant="outline" size="sm" onClick={() => setMode('view')}>Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 pt-4">
              {r.publicationStatus === 'published' ? (
                <Button variant="outline" size="sm" isLoading={busy === 'unpublish'} onClick={() => action('unpublish', 'Unpublished')}>
                  <EyeOff className="h-3.5 w-3.5" /> Unpublish
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canPublish}
                  title={canPublish ? undefined : 'Needs approval from a reviewer who is not the uploader'}
                  isLoading={busy === 'publish'}
                  onClick={() => action('publish', 'Published to the library')}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" /> Publish
                </Button>
              )}
              {r.publicationStatus !== 'published' && r.verificationStatus !== 'rejected' && (
                <Button variant="outline" size="sm" onClick={() => setMode('reject')}><Ban className="h-3.5 w-3.5" /> Reject</Button>
              )}
              <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setMode('delete')}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
              {!canPublish && r.publicationStatus !== 'published' && (
                <p className="w-full text-xs text-slate-500">Publishing unlocks after a reviewer other than the uploader approves it.</p>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
