import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { can, canAny, parseAccess, type Access, type PermissionKey } from './permissions';

/**
 * Data Access Layer for authentication. Every protected page, server action and route handler
 * resolves the caller through here. It calls getUser(), which validates the token with the
 * Supabase Auth server (cookies alone are never trusted), then loads the role and permissions
 * from the database via my_access(), the single trusted source.
 *
 * Reads request cookies, so call it from inside <Suspense> (Cache Components requirement).
 */
export const getAccess = cache(async (): Promise<Access | null> => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: raw, error: rpcError } = await supabase.rpc('my_access');
  if (rpcError) {
    console.error('[auth] my_access failed:', rpcError.code, rpcError.message);
    throw new Error('Could not load your account. Please try again.');
  }
  return parseAccess(raw);
});

/** Signed-in user or redirect to /login (remembering where they were going). */
export async function requireUser(nextPath: string): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect(`/login?next=${encodeURIComponent(nextPath)}&reason=signin`);
  return access;
}

export type GateResult = { allowed: true; access: Access } | { allowed: false; access: Access };

/**
 * Signed-in user holding at least one of `anyOf`. Callers render an "access denied" state
 * when `allowed` is false; they must not fetch or render any protected data in that case.
 */
export async function gate(nextPath: string, anyOf: readonly PermissionKey[]): Promise<GateResult> {
  const access = await requireUser(nextPath);
  return { allowed: canAny(access, anyOf), access };
}

export { can, canAny };
