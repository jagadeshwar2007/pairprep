import 'server-only';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

/**
 * Cookie-less, session-less client for reading PUBLIC data (published resources, catalog,
 * public settings) from Server Components without touching request cookies, so those pages
 * can keep their static shell. Anything it can read is readable by an anonymous visitor.
 */
export function createPublicClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createSupabaseClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
