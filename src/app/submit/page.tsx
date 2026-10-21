'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Upload } from 'lucide-react';
import { Breadcrumbs } from '@/components/academic/Breadcrumbs';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { ResourceForm, formErrorsFrom, toPayload } from '@/components/resources/ResourceForm';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api/client';

function SubmitForm() {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);

  if (done) {
    return (
      <Card className="text-center p-8 sm:p-10 space-y-4">
        <div className="h-14 w-14 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 mx-auto flex items-center justify-center">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Submitted for review</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto">
            &ldquo;{done}&rdquo; is now pending. A reviewer will check it, and it will appear in the library once an administrator publishes it.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 pt-2">
          <Link href="/dashboard">
            <Button variant="primary">Track my submissions</Button>
          </Link>
          <Button
            variant="outline"
            onClick={() => {
              setDone(null);
              setFormKey((k) => k + 1);
            }}
          >
            Submit another
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-8">
      <ResourceForm
        key={formKey}
        mode="submit"
        busy={busy}
        errors={errors}
        submitLabel="Submit for review"
        onSubmit={async (values) => {
          setBusy(true);
          setErrors({});
          try {
            await api('/api/submissions', { body: toPayload(values, 'submit') });
            toast('Submission received', 'success');
            setDone(values.title);
          } catch (err) {
            setErrors(formErrorsFrom(err));
            toast(err instanceof Error ? err.message : 'Submission failed', 'error');
          } finally {
            setBusy(false);
          }
        }}
      />
    </Card>
  );
}

export default function SubmitPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <Breadcrumbs items={[{ label: 'Contribute' }]} />
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <Upload className="h-6 w-6 text-indigo-600" /> Submit a resource
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Share a question paper, notes or lab manual that is already in Google Drive. PairPrep links to the original file; nothing is copied.
        </p>
      </div>
      <div className="flex gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-sm text-slate-600 dark:text-slate-300">
        <ShieldCheck className="h-5 w-5 text-indigo-600 shrink-0" />
        <p>
          Every submission is checked by a reviewer before an administrator publishes it. You can follow its status on{' '}
          <Link href="/dashboard" className="text-indigo-600 hover:underline">your dashboard</Link>.
        </p>
      </div>
      <RequireAuth>
        <SubmitForm />
      </RequireAuth>
    </div>
  );
}
