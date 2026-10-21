import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { logServerError } from '@/lib/errors';

const SIGNED_URL_TTL_SECONDS = 60;

/**
 * GET /api/resources/:id/file[?download=1]
 *
 * Hosted files live in a PRIVATE bucket. This route resolves the resource's file (published
 * resources for everyone; drafts only for content staff, decided by the database), then issues
 * a 60-second signed URL as the caller and redirects to it. Nothing is redirected to a
 * user-supplied URL: external links are rendered as plain links in the UI, never proxied here.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) return new NextResponse('Not found', { status: 404 });
  if (!isSupabaseConfigured()) return new NextResponse('Service unavailable', { status: 503 });

  const download = request.nextUrl.searchParams.get('download') === '1';
  const supabase = await createClient();

  const { data: path, error: pathError } = await supabase.rpc('resource_file_path', { p_id: id });
  if (pathError) {
    logServerError('files.resource.path', pathError);
    return new NextResponse('Something went wrong', { status: 500 });
  }
  if (typeof path !== 'string') return new NextResponse('Not found', { status: 404 });

  const { data: meta } = await supabase.from('resources').select('file_name').eq('id', id).maybeSingle();
  const { data: signed, error: signError } = await supabase.storage
    .from('resources-published')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, download ? { download: meta?.file_name ?? true } : undefined);
  if (signError || !signed?.signedUrl) {
    logServerError('files.resource.sign', signError);
    return new NextResponse('Not found', { status: 404 });
  }

  if (download) {
    const { error } = await supabase.rpc('record_download', { p_resource_id: id });
    if (error) logServerError('files.resource.count', error);
  }

  const response = NextResponse.redirect(signed.signedUrl, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
