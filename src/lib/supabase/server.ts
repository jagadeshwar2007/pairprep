import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from './env';

/**
 * Per-request server client bound to the caller's session cookies. It acts AS THE USER
 * (anon key + their JWT), so Row Level Security applies exactly as it does in the browser.
 * Create a new one for every request; never cache or share it.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy refreshes
          // the session on every protected request, so this is safe to ignore.
        }
      },
    },
  });
}
