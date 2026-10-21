'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { resolveReport } from '@/actions/resources';

export function ReportActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (status: 'resolved' | 'dismissed') =>
    start(async () => {
      setError(null);
      const result = await resolveReport({ id, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1.5">
        <Button size="sm" variant="primary" onClick={() => run('resolved')} isLoading={pending}>Mark resolved</Button>
        <Button size="sm" variant="outline" onClick={() => run('dismissed')} disabled={pending}>Dismiss</Button>
      </div>
      {error && <span role="alert" className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
