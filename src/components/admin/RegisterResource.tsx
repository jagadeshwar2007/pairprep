'use client';

import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { ResourceForm, formErrorsFrom, toPayload } from '@/components/resources/ResourceForm';
import { api } from '@/lib/api/client';
import type { Resource } from '@/lib/resources/types';

export function RegisterResource({ onRegistered }: { onRegistered(resource: Resource): void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [last, setLast] = useState<Resource | null>(null);
  const [key, setKey] = useState(0);

  return (
    <Card className="p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Register a Drive file</h2>
        <p className="text-sm text-slate-500">
          The server reads the file&apos;s metadata from Google Drive. New resources start as pending and unpublished; assign a reviewer next.
        </p>
      </div>
      {last && (
        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 p-3 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            Registered “{last.title}” ({last.fileName}). It is pending review.{' '}
            <button className="underline cursor-pointer" onClick={() => onRegistered(last)}>Manage it</button>
          </span>
        </div>
      )}
      <ResourceForm
        key={key}
        mode="register"
        busy={busy}
        errors={errors}
        submitLabel="Register resource"
        onSubmit={async (values) => {
          setBusy(true);
          setErrors({});
          try {
            const { resource } = await api<{ resource: Resource }>('/api/admin/resources', { body: toPayload(values, 'register') });
            toast('Resource registered as pending', 'success');
            setLast(resource);
            setKey((k) => k + 1);
          } catch (err) {
            setErrors(formErrorsFrom(err));
            toast(err instanceof Error ? err.message : 'Registration failed', 'error');
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}
