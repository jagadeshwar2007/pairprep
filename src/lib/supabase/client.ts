import { createBrowserClient } from '@supabase/ssr';
import { getSupabaseEnv } from './env';

/**
 * Browser client. Uses only the public anon key, so every query it makes is subject to
 * Row Level Security. createBrowserClient already returns a singleton in the browser.
 */
export function getBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
