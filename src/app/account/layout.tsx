import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountNav } from '@/components/account/AccountNav';
import { PageSkeleton } from '@/components/ui/PageStates';

export const metadata: Metadata = {
  title: 'My account | Pairprep',
  robots: { index: false },
};

// Auth is enforced by the proxy (optimistic redirect) AND by every page (requireUser) AND by the
// database (RLS). This layout only provides the shell, so it never blocks on the session.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      {/* usePathname() inside AccountNav needs a boundary on dynamic routes like /account/contributions/[id]. */}
      <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-800" aria-hidden="true" />}>
        <AccountNav />
      </Suspense>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </div>
  );
}
