'use server';

import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { actionContext } from '@/lib/auth/action-context';
import { fail, logServerError, type ActionResult } from '@/lib/errors';
import { parseSafeHttpsUrl } from '@/lib/files/urls';
import { firstError, resourceInput } from '@/lib/validation';

const idInput = z.object({ id: z.string().uuid() });

function sourceArgs(source: z.infer<typeof resourceInput>['source']): { url: string | null; path: string | null } | { error: string } {
  if (source.mode === 'keep') return { url: null, path: null };
  if (source.mode === 'file') return { url: null, path: source.path };
  const url = parseSafeHttpsUrl(source.url);
  return url ? { url, path: null } : { error: 'External links must be public https:// URLs.' };
}

async function subjectId(supabase: SupabaseClient, slug: string): Promise<string | null> {
  const { data } = await supabase.from('subjects').select('id').eq('slug', slug).maybeSingle();
  return data?.id ?? null;
}

function revalidate() {
  revalidatePath('/admin/resources', 'layout');
  revalidatePath('/resources', 'layout');
}

export async function createResource(raw: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = z.object({ publish: z.boolean().default(false) }).extend(resourceInput.shape).safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), code: 'invalid_input' };
  const input = parsed.data;
  if (input.source.mode === 'keep') return { ok: false, error: 'Choose a file or a link.', code: 'invalid_input' };

  const ctx = await actionContext({ anyOf: ['resources.create'] });
  if (!ctx.ok) return ctx;
  const src = sourceArgs(input.source);
  if ('error' in src) return { ok: false, error: src.error, code: 'invalid_url' };
  const sid = await subjectId(ctx.supabase, input.subjectSlug);
  if (!sid) return { ok: false, error: 'Choose a valid subject.', code: 'invalid_input' };

  const { data, error } = await ctx.supabase.rpc('create_resource', {
    p_subject_id: sid,
    p_title: input.title,
    p_description: input.description ?? null,
    p_resource_type: input.category,
    p_external_url: src.url,
    p_storage_path: src.path,
    p_tags: input.tags,
    p_credit: input.credit ?? null,
    p_publish: input.publish,
  });
  if (error) return fail(error, 'resources.create');
  revalidate();
  return { ok: true, data: { id: data as string }, message: input.publish ? 'Resource published.' : 'Draft saved.' };
}

export async function updateResource(raw: unknown): Promise<ActionResult> {
  const parsed = z.object({ id: z.string().uuid() }).extend(resourceInput.shape).safeParse(raw);
  if (!parsed.success) return { ok: false, error: firstError(parsed.error), code: 'invalid_input' };
  const input = parsed.data;

  const ctx = await actionContext({ anyOf: ['resources.edit'] });
  if (!ctx.ok) return ctx;
  const src = sourceArgs(input.source);
  if ('error' in src) return { ok: false, error: src.error, code: 'invalid_url' };
  const sid = await subjectId(ctx.supabase, input.subjectSlug);
  if (!sid) return { ok: false, error: 'Choose a valid subject.', code: 'invalid_input' };

  const { data: replacedPath, error } = await ctx.supabase.rpc('update_resource', {
    p_id: input.id,
    p_subject_id: sid,
    p_title: input.title,
    p_description: input.description ?? null,
    p_resource_type: input.category,
    p_tags: input.tags,
    p_credit: input.credit ?? null,
    p_verified: input.verified ?? null,
    p_external_url: src.url,
    p_storage_path: src.path,
  });
  if (error) return fail(error, 'resources.update');

  // The old file is now unreferenced; Storage policy lets resources.edit holders remove it.
  if (typeof replacedPath === 'string') {
    const { error: removeError } = await ctx.supabase.storage.from('resources-published').remove([replacedPath]);
    if (removeError) logServerError('resources.update.remove-old', removeError); // retention job will collect it
  }
  revalidate();
  return { ok: true, message: 'Resource updated.' };
}

export async function setResourceStatus(raw: unknown): Promise<ActionResult> {
  const parsed = idInput.extend({ status: z.enum(['draft', 'published', 'archived']) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: [parsed.data.status === 'archived' ? 'resources.archive' : 'resources.publish'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('set_resource_status', { p_id: parsed.data.id, p_status: parsed.data.status });
  if (error) return fail(error, 'resources.status');
  revalidate();
  const labels = { draft: 'Moved to drafts.', published: 'Resource published.', archived: 'Resource archived.' } as const;
  return { ok: true, message: labels[parsed.data.status] };
}

export async function deleteResource(raw: unknown): Promise<ActionResult> {
  const parsed = idInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['resources.delete'] });
  if (!ctx.ok) return ctx;

  const { data: path, error } = await ctx.supabase.rpc('delete_resource', { p_id: parsed.data.id });
  if (error) return fail(error, 'resources.delete');
  if (typeof path === 'string') {
    const { error: removeError } = await ctx.supabase.storage.from('resources-published').remove([path]);
    if (removeError) logServerError('resources.delete.remove-file', removeError);
  }
  revalidate();
  return { ok: true, message: 'Resource deleted.' };
}

export async function resolveReport(raw: unknown): Promise<ActionResult> {
  const parsed = idInput.extend({ status: z.enum(['resolved', 'dismissed']) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['resources.edit'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('resolve_report', { p_id: parsed.data.id, p_status: parsed.data.status });
  if (error) return fail(error, 'reports.resolve');
  revalidatePath('/admin/reports', 'layout');
  return { ok: true, message: parsed.data.status === 'resolved' ? 'Report resolved.' : 'Report dismissed.' };
}

export async function resolveFeedback(raw: unknown): Promise<ActionResult> {
  const parsed = idInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['resources.edit'], writes: false });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('resolve_feedback', { p_id: parsed.data.id });
  if (error) return fail(error, 'feedback.resolve');
  revalidatePath('/admin/reports', 'layout');
  return { ok: true, message: 'Marked as handled.' };
}
