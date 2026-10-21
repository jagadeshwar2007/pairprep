'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, EyeOff, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { deleteResource, setResourceStatus } from '@/actions/resources';

interface Props {
  id: string;
  status: 'draft' | 'published' | 'archived';
  can: { publish: boolean; archive: boolean; delete: boolean };
  /** Compact icon buttons for table rows; full-width buttons on the detail page. */
  size?: 'sm' | 'md';
  onDeleted?: string;
}

export function ResourceRowActions({ id, status, can, size = 'sm', onDeleted }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState<'archive' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (task: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) =>
    start(async () => {
      setError(null);
      const result = await task();
      if (!result.ok) {
        setError(result.error ?? 'Something went wrong.');
        return;
      }
      setConfirm(null);
      if (after) after();
      else router.refresh();
    });

  const setStatus = (next: 'draft' | 'published' | 'archived') => run(() => setResourceStatus({ id, status: next }));

  if (confirm) {
    return (
      <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label={`Confirm ${confirm}`}>
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {confirm === 'archive' ? 'Archive this resource? It disappears from the public hub.' : 'Delete permanently? The file is removed too.'}
        </span>
        <Button size="sm" variant="danger" isLoading={pending} onClick={() => (confirm === 'archive' ? setStatus('archived') : run(() => deleteResource({ id }), () => router.push(onDeleted ?? '/admin/resources')))}>
          {confirm === 'archive' ? 'Archive' : 'Delete'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirm(null)} disabled={pending}>Cancel</Button>
        {error && <span role="alert" className="w-full text-xs text-rose-600">{error}</span>}
      </div>
    );
  }

  const iconOnly = size === 'sm';
  const btn = (text: string, Icon: React.ComponentType<{ className?: string }>, onClick: () => void, danger = false) => (
    <Button size="sm" variant={danger ? 'outline' : 'subtle'} onClick={onClick} disabled={pending} title={text} aria-label={text} className={danger ? 'hover:text-rose-600 hover:border-rose-300' : undefined}>
      <Icon className={iconOnly ? 'h-3.5 w-3.5' : 'mr-1.5 h-3.5 w-3.5'} />
      {!iconOnly && text}
    </Button>
  );

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {can.publish && status !== 'published' && btn(status === 'archived' ? 'Restore & publish' : 'Publish', Upload, () => setStatus('published'))}
      {can.publish && status === 'published' && btn('Unpublish (to draft)', EyeOff, () => setStatus('draft'))}
      {can.archive && status !== 'archived' && btn('Archive', Archive, () => setConfirm('archive'))}
      {can.delete && status !== 'published' && btn('Delete permanently', Trash2, () => setConfirm('delete'), true)}
      {error && <span role="alert" className="w-full text-xs text-rose-600">{error}</span>}
    </div>
  );
}
