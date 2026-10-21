import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { logServerError } from '@/lib/errors';

const BATCH = 100;

function authorised(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get('authorization') ?? '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Retention job (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`).
 *
 * Removes, per the retention settings: uploads that never became a submission, orphaned
 * published copies, files of rejected submissions past retention and superseded revisions.
 * It NEVER removes a file that is referenced by a live contribution or resource: the candidate
 * list comes from public.list_purgeable_files(), which excludes them by construction.
 */
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Cleanup job is not configured' }, { status: 503 });
  if (!authorised(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isSupabaseConfigured() || !isAdminClientConfigured()) {
    return NextResponse.json({ error: 'Supabase is not fully configured' }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: candidates, error } = await admin.rpc('list_purgeable_files');
  if (error) {
    logServerError('cron.cleanup.list', error);
    return NextResponse.json({ error: 'Could not list files' }, { status: 500 });
  }

  const byBucket = new Map<string, string[]>();
  for (const row of (candidates ?? []) as { bucket: string; path: string }[]) {
    byBucket.set(row.bucket, [...(byBucket.get(row.bucket) ?? []), row.path]);
  }

  const summary: Record<string, { removed: number; failed: number }> = {};
  for (const [bucket, paths] of byBucket) {
    summary[bucket] = { removed: 0, failed: 0 };
    for (let i = 0; i < paths.length; i += BATCH) {
      const chunk = paths.slice(i, i + BATCH);
      const { data: removed, error: removeError } = await admin.storage.from(bucket).remove(chunk);
      if (removeError) {
        logServerError('cron.cleanup.remove', removeError);
        summary[bucket].failed += chunk.length;
        continue;
      }
      // Only record what Storage confirmed deleted.
      const confirmed = (removed ?? []).map((o) => o.name);
      summary[bucket].removed += confirmed.length;
      summary[bucket].failed += chunk.length - confirmed.length;
      if (confirmed.length > 0) {
        const { error: markError } = await admin.rpc('mark_files_purged', { p_bucket: bucket, p_paths: confirmed });
        if (markError) logServerError('cron.cleanup.mark', markError);
      }
    }
  }

  return NextResponse.json({ ok: true, summary });
}
