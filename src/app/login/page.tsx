import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { LoginCard } from '@/components/auth/LoginCard';
import { getAccess } from '@/lib/auth/session';
import { postLoginPath } from '@/lib/auth/permissions';
import { safeNextPath } from '@/lib/auth/redirects';

export const metadata: Metadata = {
  title: 'Sign in | Pairprep',
  description: 'Sign in to Pairprep with Google to contribute resources, bookmark materials and save your data.',
};

type SearchParams = Promise<{ next?: string; error?: string; reason?: string }>;

export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12 sm:py-20">
      <Suspense fallback={<div className="h-96 w-full max-w-md animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800/50" />}>
        <LoginContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function LoginContent({ searchParams }: { searchParams: SearchParams }) {
  const { next, error, reason } = await searchParams;
  const safeNext = safeNextPath(next, '');

  // Already signed in (and no error to show): go where they were headed.
  if (!error) {
    const access = await getAccess().catch(() => null);
    if (access?.loginAllowed) redirect(postLoginPath(access, safeNext));
  }

  return <LoginCard error={error ?? null} reason={reason ?? null} next={safeNext || undefined} />;
}
