import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { getAccess } from './session';
import { canAny, type Access, type PermissionKey } from './permissions';

export type ActionContext =
  | { ok: true; supabase: SupabaseClient; access: Access }
  | { ok: false; error: string; code: string };

/**
 * Every server action starts here. It re-verifies the session (never trusts the client),
 * optionally requires a permission, and hands back a user-scoped client. The database repeats
 * every one of these checks, so this layer exists for fast, clear errors, not as the only gate.
 */
export async function actionContext(options: { anyOf?: readonly PermissionKey[]; writes?: boolean } = {}): Promise<ActionContext> {
  if (!isSupabaseConfigured()) {
    return { ok: false, code: 'not_configured', error: 'The backend is not configured yet.' };
  }
  const access = await getAccess();
  if (!access) return { ok: false, code: 'unauthenticated', error: 'Your session expired. Please sign in again.' };
  if (options.writes !== false && !access.loginAllowed) {
    return { ok: false, code: 'account_inactive', error: 'Your account is suspended or not permitted to do this.' };
  }
  if (options.anyOf && !canAny(access, options.anyOf)) {
    return { ok: false, code: 'forbidden', error: "You don't have permission to do that." };
  }
  const supabase = await createClient();
  return { ok: true, supabase, access };
}
