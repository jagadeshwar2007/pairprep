import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

// Only routes that read the session on the server. Public pages (resources, calendar, tools)
// use the browser client for auth state, so they stay fully static and fast.
export const config = {
  matcher: [
    '/account/:path*',
    '/submit/:path*',
    '/admin/:path*',
    '/login',
    '/api/resources/:path*',
    '/api/contributions/:path*',
  ],
};
