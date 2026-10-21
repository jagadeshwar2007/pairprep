'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Lock, ShieldOff, Settings2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import type { UserRole } from '@/lib/resources/types';

export function NotConfigured() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-12">
      <EmptyState
        icon={<Settings2 className="h-6 w-6" />}
        title="Sign-in is not configured yet"
        description="This deployment has no Firebase web configuration. Set the NEXT_PUBLIC_FIREBASE_* variables described in the README. Browsing the library does not need an account."
        action={
          <Link href="/library">
            <Button variant="outline" size="sm">Browse the library</Button>
          </Link>
        }
      />
    </div>
  );
}

/**
 * Client-side gate for signed-in pages. This only controls what is *shown*; every API
 * these pages call re-verifies the user's identity and role on the server.
 */
export function RequireAuth({ roles, children }: { roles?: UserRole[]; children: React.ReactNode }) {
  const { configured, loading, user, profile, profileError } = useAuth();
  const pathname = usePathname();

  if (!configured) return <NotConfigured />;
  if (loading || (user && !profile && !profileError)) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-4" aria-busy="true">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (!user) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <EmptyState
          icon={<Lock className="h-6 w-6" />}
          title="Sign in to continue"
          description="You need an account for this page. Browsing published resources doesn't require one."
          action={
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>
              <Button variant="primary" size="sm">Sign in</Button>
            </Link>
          }
        />
      </div>
    );
  }
  if (profileError) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <EmptyState tone="error" icon={<ShieldOff className="h-6 w-6" />} title="Your account could not be loaded" description={profileError} />
      </div>
    );
  }
  if (roles && profile && !roles.includes(profile.role)) {
    return (
      <div className="mx-auto w-full max-w-xl px-4 py-12">
        <EmptyState
          icon={<ShieldOff className="h-6 w-6" />}
          title="Access denied"
          description="Your account doesn't have permission to view this page. If you think it should, ask a PairPrep administrator."
          action={
            <Link href="/library">
              <Button variant="outline" size="sm">Go to the library</Button>
            </Link>
          }
        />
      </div>
    );
  }
  return <>{children}</>;
}
