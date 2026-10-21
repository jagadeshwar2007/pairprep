import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { logServerError } from '@/lib/errors';

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * GET /api/contributions/:id/file[?download=1]
 *
 * Lets the uploader and permitted reviewers open a PENDING file. Authorization is the database's:
 * the lookup below goes through Row Level Security (own rows, or contributions.read), and the
 * signed URL can only be created if the Storage policy also allows the caller to read the object.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse('Not found', { status: 404 });
  if (!isSupabaseConfigured()) return new NextResponse('Service unavailable', { status: 503 });

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return new NextResponse('Sign in required', { status: 401, headers: { 'Cache-Control': 'private, no-store' } });

  const { data: contribution, error } = await supabase
    .from('contributions')
    .select('storage_path, file_name')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    logServerError('files.contribution.read', error);
    return new NextResponse('Something went wrong', { status: 500 });
  }
  if (!contribution?.storage_path) return new NextResponse('Not found', { status: 404 });

  const download = request.nextUrl.searchParams.get('download') === '1';
  const { data: signed, error: signError } = await supabase.storage
    .from('contributions-private')
    .createSignedUrl(
      contribution.storage_path,
      SIGNED_URL_TTL_SECONDS,
      download ? { download: contribution.file_name ?? true } : undefined,
    );
  if (signError || !signed?.signedUrl) {
    logServerError('files.contribution.sign', signError);
    return new NextResponse('Not found', { status: 404 });
  }

  const response = NextResponse.redirect(signed.signedUrl, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
