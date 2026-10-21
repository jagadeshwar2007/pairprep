import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getSiteUrl, isSupabaseConfigured } from '@/lib/supabase/env';
import { safeNextPath } from '@/lib/auth/redirects';
import { parseAccess, postLoginPath } from '@/lib/auth/permissions';

/**
 * OAuth landing route for Google sign-in (PKCE). Order matters:
 *   1. surface provider errors (user cancelled / access_denied) as friendly login errors,
 *   2. exchange the one-time code for a session (cookies are written by the server client),
 *   3. re-check the account on the SERVER: suspended accounts and, if configured, accounts
 *      outside the permitted email domain are signed straight back out,
 *   4. redirect to a validated same-site path (never an arbitrary URL).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const base = getSiteUrl(origin);
  const toLogin = (error: string, next?: string | null) => {
    const url = new URL('/login', base);
    url.searchParams.set('error', error);
    if (next) url.searchParams.set('next', next);
    return NextResponse.redirect(url);
  };

  const next = searchParams.get('next');
  const safeNext = safeNextPath(next, '');

  if (!isSupabaseConfigured()) return toLogin('not_configured');

  const providerError = searchParams.get('error');
  if (providerError) {
    return toLogin(providerError === 'access_denied' ? 'cancelled' : 'provider_error', safeNext || null);
  }

  const code = searchParams.get('code');
  if (!code) return toLogin('missing_code', safeNext || null);

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error('[auth/callback] code exchange failed:', exchangeError.message);
    return toLogin('exchange_failed', safeNext || null);
  }

  const { data: raw, error: accessError } = await supabase.rpc('my_access');
  const access = accessError ? null : parseAccess(raw);
  if (!access) {
    console.error('[auth/callback] no profile for freshly signed-in user', accessError?.message);
    await supabase.auth.signOut();
    return toLogin('no_profile');
  }
  if (access.status === 'suspended') {
    await supabase.auth.signOut();
    return toLogin('suspended');
  }
  if (!access.loginAllowed) {
    await supabase.auth.signOut();
    return toLogin('domain_not_allowed');
  }

  const destination = postLoginPath(access, safeNext);
  return NextResponse.redirect(new URL(destination, base));
}
