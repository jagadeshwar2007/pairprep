'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { actionContext } from '@/lib/auth/action-context';
import { fail, type ActionResult } from '@/lib/errors';
import { FILE_KINDS } from '@/lib/files/registry';

const schema = z.discriminatedUnion('key', [
  z.object({
    key: z.literal('allowed_email_domains'),
    // "college.edu, other.ac.in" or one per line; the database re-validates the format.
    value: z.array(z.string().trim().toLowerCase().min(1).max(100)).max(10),
  }),
  z.object({ key: z.literal('allowed_file_types'), value: z.array(z.enum(FILE_KINDS)).min(1) }),
  z.object({ key: z.literal('max_upload_bytes'), value: z.number().int() }),
  z.object({ key: z.literal('max_open_contributions'), value: z.number().int() }),
  z.object({ key: z.literal('rejected_file_retention_days'), value: z.number().int() }),
  z.object({ key: z.literal('abandoned_upload_hours'), value: z.number().int() }),
]);

export async function updateSetting(raw: unknown): Promise<ActionResult> {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid setting value.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['settings.manage'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('set_app_setting', { p_key: parsed.data.key, p_value: parsed.data.value });
  if (error) return fail(error, 'settings.update');
  revalidatePath('/admin/settings');
  return { ok: true, message: 'Setting saved.' };
}
