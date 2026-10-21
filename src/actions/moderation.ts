'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { actionContext } from '@/lib/auth/action-context';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { fail, logServerError, type ActionResult } from '@/lib/errors';
import { reviewInput } from '@/lib/validation';

const idInput = z.object({ id: z.string().uuid() });

export async function claimContribution(raw: unknown): Promise<ActionResult> {
  const parsed = idInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid contribution.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['contributions.review'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('claim_contribution', { p_id: parsed.data.id });
  if (error) return fail(error, 'moderation.claim');
  revalidatePath('/admin/moderation', 'layout');
  return { ok: true, message: 'Moved to review.' };
}

export async function reviewContribution(raw: unknown): Promise<ActionResult> {
  const parsed = reviewInput.safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const { contributionId, action, feedback } = parsed.data;

  const ctx = await actionContext({ anyOf: [action === 'reject' ? 'contributions.reject' : 'contributions.review'] });
  if (!ctx.ok) return ctx;

  if (action !== 'unflag' && (feedback ?? '').length < 3) {
    return { ok: false, error: 'Please write a short explanation (at least 3 characters).', code: 'feedback_required' };
  }
  const { error } = await ctx.supabase.rpc('review_contribution', {
    p_id: contributionId,
    p_action: action,
    p_feedback: feedback ?? null,
  });
  if (error) return fail(error, 'moderation.review');

  revalidatePath('/admin/moderation', 'layout');
  const messages = {
    reject: 'Contribution rejected.',
    request_changes: 'Changes requested. The student has been notified.',
    flag: 'Contribution flagged.',
    unflag: 'Flag removed.',
  } as const;
  return { ok: true, message: messages[action] };
}

/**
 * Approval = (1) copy the file from the private review bucket to the published bucket at the path
 * the DATABASE dictates, then (2) one transactional RPC that creates the resource and marks the
 * contribution approved. Step 1 needs the service role (nobody can write to the published
 * bucket's approved/ folder through the API); we only do it after confirming the caller may
 * approve this specific contribution and that approval can succeed.
 */
export async function approveContribution(raw: unknown): Promise<ActionResult<{ resourceId: string }>> {
  const parsed = z.object({ id: z.string().uuid(), feedback: z.string().trim().max(2000).optional() }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const { id, feedback } = parsed.data;

  const ctx = await actionContext({ anyOf: ['contributions.approve'] });
  if (!ctx.ok) return ctx;

  // Read through RLS: also proves this reviewer is allowed to see the contribution.
  const { data: contribution, error: readError } = await ctx.supabase
    .from('contributions')
    .select('id, status, submitted_by, storage_path, external_url')
    .eq('id', id)
    .maybeSingle();
  if (readError) return fail(readError, 'moderation.approve.read');
  if (!contribution) return { ok: false, error: 'That contribution could not be found.', code: 'not_found' };
  if (contribution.submitted_by === ctx.access.userId) {
    return { ok: false, error: 'You cannot approve your own submission.', code: 'forbidden' };
  }
  if (!['pending', 'in_review'].includes(contribution.status)) {
    return { ok: false, error: 'This contribution has already been reviewed.', code: 'invalid_state' };
  }
  const { data: flag } = await ctx.supabase.from('contribution_flags').select('contribution_id').eq('contribution_id', id).maybeSingle();
  if (flag) return { ok: false, error: 'Resolve the flag on this contribution before approving it.', code: 'flagged' };

  if (contribution.storage_path) {
    if (!isAdminClientConfigured()) {
      console.error('[moderation] SUPABASE_SERVICE_ROLE_KEY missing: cannot publish hosted files.');
      return { ok: false, error: 'Publishing hosted files is not available right now.', code: 'not_configured' };
    }
    const { data: target, error: pathError } = await ctx.supabase.rpc('contribution_publish_path', { p_id: id });
    if (pathError || typeof target !== 'string') return fail(pathError, 'moderation.approve.path');

    const admin = createAdminClient();
    const { error: copyError } = await admin.storage
      .from('contributions-private')
      .copy(contribution.storage_path, target, { destinationBucket: 'resources-published' });
    // An existing object at the deterministic path means an earlier attempt already copied it.
    if (copyError && !/already exists|duplicate/i.test(copyError.message)) {
      logServerError('moderation.approve.copy', copyError);
      return { ok: false, error: 'Could not publish the file. Please try again.', code: 'unknown' };
    }
  }

  const { data: resourceId, error } = await ctx.supabase.rpc('approve_contribution', {
    p_id: id,
    p_feedback: feedback ?? null,
  });
  if (error) return fail(error, 'moderation.approve');

  revalidatePath('/admin/moderation', 'layout');
  revalidatePath('/resources', 'layout');
  return { ok: true, data: { resourceId: resourceId as string }, message: 'Approved and published.' };
}
