import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { setUserRole } from '@/lib/server/services/users';
import { updateUserRoleSchema } from '@/lib/resources/validation';

/** Admin: grant/revoke reviewer access and set the reviewer's scope. Cannot create admins. */
export const PATCH = handle(async (req: NextRequest, ctx: { params: Promise<{ uid: string }> }) => {
  const admin = await requireAdmin(req);
  const { uid } = await ctx.params;
  const { role, reviewerScope } = await parseBody(req, updateUserRoleSchema);
  return json({ profile: await setUserRole(admin, uid, role, reviewerScope) });
});
