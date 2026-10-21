import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv, isSupabaseConfigured } from './env';

/** Paths that need a signed-in user. Real authorization still happens server-side, per page/action. */
const PROTECTED_PREFIXES = ['/account', '/submit', '/admin'];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** True if the request carries Supabase auth cookies (used to tell "expired" from "never signed in"). */
function hasAuthCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => c.name.startsWith('sb-') && c.name.includes('auth-token'));
}

/**
 * Refreshes the Supabase session cookies on every matched request and applies the optimistic
 * redirect for protected pages. Per the Next.js guidance this is NOT the security boundary:
 * every page, action and route handler re-verifies the user and the database enforces RLS.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    // Without configuration there is no session to refresh; protected pages show a setup notice.
    return response;
  }

  const { url, anonKey } = getSupabaseEnv();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        // Responses that set auth cookies must never be cached by a CDN or shared proxy.
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // getClaims() verifies the JWT signature and refreshes expired tokens.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  if (!signedIn && isProtectedPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    redirectUrl.search = '';
    redirectUrl.searchParams.set('next', `${pathname}${search}`);
    redirectUrl.searchParams.set('reason', hasAuthCookie(request) ? 'expired' : 'signin');
    const redirect = NextResponse.redirect(redirectUrl);
    // Carry over any cookies the refresh attempt cleared.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return response;
}
