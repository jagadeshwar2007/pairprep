'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { withdrawContribution } from '@/actions/contributions';

export function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () =>
    start(async () => {
      setError(null);
      const result = await withdrawContribution({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace('/account/contributions');
      router.refresh();
    });

  if (!confirming) {
    return (
      <Button variant="outline" size="sm" onClick={() => setConfirming(true)} className="hover:text-rose-600 hover:border-rose-300">
        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Withdraw
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2" role="alertdialog" aria-label="Confirm withdrawal">
      <span className="text-xs text-slate-600 dark:text-slate-300">Withdraw this contribution? Its review history is deleted.</span>
      <Button variant="danger" size="sm" isLoading={pending} onClick={run}>Yes, withdraw</Button>
      <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={pending}>Keep it</Button>
      {error && <span role="alert" className="w-full text-xs text-rose-600">{error}</span>}
    </div>
  );
}
