'use server';

import { z } from 'zod';
import { actionContext } from '@/lib/auth/action-context';
import { isAdminClientConfigured } from '@/lib/supabase/admin';
import { validateAndRecordUpload } from '@/lib/files/validate';
import type { ActionResult } from '@/lib/errors';
import { firstError } from '@/lib/validation';

const input = z.object({
  bucket: z.enum(['contributions-private', 'resources-published']),
  path: z.string().min(1).max(300),
  originalName: z.string().min(1).max(255),
});

/**
 * Step 2 of an upload. The browser has already stored the object (Storage RLS lets it write
 * only into its own folder). Here the SERVER downloads it, identifies it by content, and records
 * the verdict that submit_contribution / create_resource require. A rejected file is deleted.
 */
export async function finalizeUpload(raw: unknown): Promise<ActionResult<{ name: string; size: number; kind: string }>> {
  const parsed = input.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), code: 'invalid_input' };
  const { bucket, path, originalName } = parsed.data;

  const ctx = await actionContext({
    anyOf: bucket === 'resources-published' ? ['resources.create', 'resources.edit'] : undefined,
  });
  if (!ctx.ok) return ctx;

  if (!isAdminClientConfigured()) {
    console.error('[uploads] SUPABASE_SERVICE_ROLE_KEY is not configured; file uploads are disabled.');
    return { ok: false, code: 'not_configured', error: 'File uploads are not available right now. You can share an external link instead.' };
  }

  const result = await validateAndRecordUpload({ bucket, path, userId: ctx.access.userId, originalName });
  if (!result.ok) return { ok: false, error: result.error, code: result.code };
  return { ok: true, data: { name: result.name, size: result.size, kind: result.kind } };
}
