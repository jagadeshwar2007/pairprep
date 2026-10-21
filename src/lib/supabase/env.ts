// NOTE: Next.js only inlines NEXT_PUBLIC_* variables when they are referenced literally,
// so keep these as direct `process.env.NEXT_PUBLIC_...` reads.

export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (see .env.example).',
    );
  }
  return { url, anonKey };
}

/** Public origin of the app, used to build OAuth redirect URLs on the server. */
export function getSiteUrl(fallbackOrigin?: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '');
  return configured || fallbackOrigin || 'http://localhost:3000';
}
