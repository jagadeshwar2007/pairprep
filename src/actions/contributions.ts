'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { actionContext } from '@/lib/auth/action-context';
import { fail, type ActionResult } from '@/lib/errors';
import { parseSafeHttpsUrl } from '@/lib/files/urls';
import { firstError, resubmitContributionInput, submitContributionInput } from '@/lib/validation';
import type { SupabaseClient } from '@supabase/supabase-js';

async function resolveSubject(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await supabase.from('subjects').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}

type Source = { mode: 'file'; path: string } | { mode: 'link'; url: string } | { mode: 'keep' };

/** Maps the validated source union to the RPC arguments; links are re-validated here and in SQL. */
function sourceArgs(source: Source): { url: string | null; path: string | null; keep: boolean } | { error: string } {
  if (source.mode === 'keep') return { url: null, path: null, keep: true };
  if (source.mode === 'file') return { url: null, path: source.path, keep: false };
  const url = parseSafeHttpsUrl(source.url);
  if (!url) return { error: 'External links must be public https:// URLs (no localhost, IP addresses or credentials).' };
  return { url, path: null, keep: false };
}

export async function submitContribution(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = submitContributionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), code: 'invalid_input' };
  const ctx = await actionContext();
  if (!ctx.ok) return ctx;

  const input = parsed.data;
  const src = sourceArgs(input.source);
  if ('error' in src) return { ok: false, error: src.error, code: 'invalid_url' };
  const subjectId = await resolveSubject(ctx.supabase, input.subjectSlug);
  if (!subjectId) return { ok: false, error: 'Choose a valid subject.', code: 'invalid_input' };

  const { data, error } = await ctx.supabase.rpc('submit_contribution', {
    p_subject_id: subjectId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_resource_type: input.category,
    p_external_url: src.url,
    p_storage_path: src.path,
    p_credit: input.credit ?? null,
  });
  if (error) return fail(error, 'contributions.submit');

  revalidatePath('/account', 'layout');
  return { ok: true, data: { id: data as string }, message: 'Submitted for review.' };
}

export async function resubmitContribution(raw: unknown): Promise<ActionResult<{ revision: number }>> {
  const parsed = resubmitContributionInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), code: 'invalid_input' };
  const ctx = await actionContext();
  if (!ctx.ok) return ctx;

  const input = parsed.data;
  const src = sourceArgs(input.source);
  if ('error' in src) return { ok: false, error: src.error, code: 'invalid_url' };
  const subjectId = await resolveSubject(ctx.supabase, input.subjectSlug);
  if (!subjectId) return { ok: false, error: 'Choose a valid subject.', code: 'invalid_input' };

  const { data, error } = await ctx.supabase.rpc('resubmit_contribution', {
    p_id: input.contributionId,
    p_subject_id: subjectId,
    p_title: input.title,
    p_description: input.description ?? null,
    p_resource_type: input.category,
    p_keep_source: src.keep,
    p_external_url: src.url,
    p_storage_path: src.path,
    p_credit: input.credit ?? null,
  });
  if (error) return fail(error, 'contributions.resubmit');

  revalidatePath('/account', 'layout');
  return { ok: true, data: { revision: data as number }, message: 'Resubmitted for review.' };
}

const idInput = z.object({ id: z.string().uuid() });

export async function withdrawContribution(raw: unknown): Promise<ActionResult> {
  const parsed = idInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid contribution.', code: 'invalid_input' };
  const ctx = await actionContext({ writes: false });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('withdraw_contribution', { p_id: parsed.data.id });
  if (error) return fail(error, 'contributions.withdraw');

  revalidatePath('/account', 'layout');
  return { ok: true, message: 'Contribution withdrawn.' };
}
