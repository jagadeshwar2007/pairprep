import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { performResourceAction } from '@/lib/server/services/resources';
import { resourceActionSchema } from '@/lib/resources/validation';

/** Admin publication controls. Publishing requires an approval from a reviewer other than the uploader. */
export const POST = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const { action, reason } = await parseBody(req, resourceActionSchema);
  return json({ resource: await performResourceAction(admin, id, action, reason) });
});
