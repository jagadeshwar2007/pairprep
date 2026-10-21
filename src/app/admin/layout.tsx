import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AdminNav } from '@/components/admin/AdminNav';
import { PageSkeleton } from '@/components/ui/PageStates';
import { Badge } from '@/components/ui/Badge';
import { getAccess } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { isStaff, visibleAdminSections } from '@/lib/auth/permissions';

export const metadata: Metadata = {
  title: 'Admin | Pairprep',
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
      <Suspense fallback={<div className="h-10 border-b border-slate-200 dark:border-slate-800" aria-hidden="true" />}>
        <AdminHeader />
      </Suspense>
      <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
    </div>
  );
}

/**
 * Navigation is computed on the server from the caller's permissions, so a link the user may not
 * open is never sent to their browser. (Every page and action still re-checks, and RLS is the real lock.)
 */
async function AdminHeader() {
  if (!isSupabaseConfigured()) return null;
  const access = await getAccess().catch(() => null);
  if (!access || !isStaff(access)) return null;

  const items = [
    ...(access.role === 'super_admin' ? [{ href: '/admin', label: 'Overview' }] : []),
    ...visibleAdminSections(access).map(({ href, label }) => ({ href, label })),
  ];
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Pairprep administration</h1>
        <Badge variant="primary" size="sm">{access.roleName}</Badge>
      </div>
      <AdminNav items={items} />
    </div>
  );
}
