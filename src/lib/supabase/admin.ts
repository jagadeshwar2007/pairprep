import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

/**
 * Service-role client. BYPASSES Row Level Security. `server-only` makes the build fail if
 * this module is ever imported into client code.
 *
 * Allowed uses (always after the caller was authorised by the user-scoped client):
 *   - validating uploaded files and recording the verdict (src/lib/files/validate.ts)
 *   - copying an approved file into the published bucket
 *   - banning / unbanning a suspended user at the Auth layer
 *   - the retention job (/api/cron/cleanup)
 * Never expose it through an endpoint that takes an arbitrary table, query or user id.
 */
export function createAdminClient() {
  const { url } = getSupabaseEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set. This server-side feature is unavailable.');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function isAdminClientConfigured(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
}
