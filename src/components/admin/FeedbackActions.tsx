'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { resolveFeedback } from '@/actions/resources';

export function FeedbackActions({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        isLoading={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const result = await resolveFeedback({ id });
            if (!result.ok) setError(result.error);
            else router.refresh();
          })
        }
      >
        Mark handled
      </Button>
      {error && <span role="alert" className="text-xs text-rose-600">{error}</span>}
    </div>
  );
}
