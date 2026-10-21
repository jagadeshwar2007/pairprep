'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { actionContext } from '@/lib/auth/action-context';
import { createAdminClient, isAdminClientConfigured } from '@/lib/supabase/admin';
import { fail, logServerError, type ActionResult } from '@/lib/errors';
import { ASSIGNABLE_ROLES, NON_DELEGABLE_PERMISSIONS, PERMISSION_KEYS } from '@/lib/auth/permissions';

const userId = z.string().uuid();

function revalidate() {
  revalidatePath('/admin/users', 'layout');
}

export async function setUserRole(raw: unknown): Promise<ActionResult> {
  const parsed = z.object({ userId, role: z.enum(ASSIGNABLE_ROLES as [string, ...string[]]) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'That role cannot be assigned.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['roles.manage'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('set_user_role', { p_user: parsed.data.userId, p_role: parsed.data.role });
  if (error) return fail(error, 'users.role');
  revalidate();
  return { ok: true, message: 'Role updated.' };
}

export async function grantPermission(raw: unknown): Promise<ActionResult> {
  const parsed = z.object({ userId, permission: z.enum(PERMISSION_KEYS) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid permission.', code: 'invalid_input' };
  if (NON_DELEGABLE_PERMISSIONS.includes(parsed.data.permission)) {
    return { ok: false, error: 'That permission is reserved for the super admin role.', code: 'forbidden' };
  }
  const ctx = await actionContext({ anyOf: ['roles.manage'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('grant_user_permission', { p_user: parsed.data.userId, p_permission: parsed.data.permission });
  if (error) return fail(error, 'users.grant');
  revalidate();
  return { ok: true, message: 'Permission granted.' };
}

export async function revokePermission(raw: unknown): Promise<ActionResult> {
  const parsed = z.object({ userId, permission: z.enum(PERMISSION_KEYS) }).safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid permission.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['roles.manage'], writes: false });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('revoke_user_permission', { p_user: parsed.data.userId, p_permission: parsed.data.permission });
  if (error) return fail(error, 'users.revoke');
  revalidate();
  return { ok: true, message: 'Permission revoked.' };
}

/**
 * Suspension is enforced in the database immediately (every policy and RPC checks the account
 * status). We additionally ban the user in Supabase Auth so they cannot refresh tokens or sign
 * in again. If the Auth call fails the account is still locked out by the database.
 */
export async function setAccountStatus(raw: unknown): Promise<ActionResult> {
  const parsed = z
    .object({ userId, status: z.enum(['active', 'suspended']), reason: z.string().trim().max(500).optional() })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['users.suspend'], writes: false });
  if (!ctx.ok) return ctx;
  if (parsed.data.status === 'suspended' && !parsed.data.reason) {
    return { ok: false, error: 'A reason is required to suspend an account.', code: 'feedback_required' };
  }

  const { error } = await ctx.supabase.rpc('set_account_status', {
    p_user: parsed.data.userId,
    p_status: parsed.data.status,
    p_reason: parsed.data.reason ?? null,
  });
  if (error) return fail(error, 'users.status');

  let warning = '';
  if (isAdminClientConfigured()) {
    const { error: banError } = await createAdminClient().auth.admin.updateUserById(parsed.data.userId, {
      ban_duration: parsed.data.status === 'suspended' ? '876000h' : 'none',
    });
    if (banError) {
      logServerError('users.status.auth-ban', banError);
      warning = ' The database lockout is active, but blocking the Auth sign-in failed; check the server logs.';
    }
  } else {
    warning = ' The database lockout is active; set SUPABASE_SERVICE_ROLE_KEY to also block sign-in at the Auth layer.';
  }
  revalidate();
  return { ok: true, message: `${parsed.data.status === 'suspended' ? 'Account suspended.' : 'Account reactivated.'}${warning}` };
}

export async function transferSuperAdmin(raw: unknown): Promise<ActionResult> {
  const parsed = z
    .object({
      newOwner: userId,
      demoteTo: z.enum(['student', 'file_moderator', 'content_admin']),
      confirmation: z.string(),
    })
    .safeParse(raw);
  if (!parsed.success) return { ok: false, error: 'Invalid request.', code: 'invalid_input' };
  const ctx = await actionContext({ anyOf: ['roles.manage'] });
  if (!ctx.ok) return ctx;

  const { error } = await ctx.supabase.rpc('transfer_super_admin', {
    p_new_owner: parsed.data.newOwner,
    p_demote_to: parsed.data.demoteTo,
    p_confirmation: parsed.data.confirmation,
  });
  if (error) return fail(error, 'users.transfer');
  revalidatePath('/admin', 'layout');
  return { ok: true, message: 'Ownership transferred. You are no longer the super admin.' };
}
