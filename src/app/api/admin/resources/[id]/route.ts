import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { deleteResource, getResourceForAdmin, updateResource } from '@/lib/server/services/resources';
import { listAssignmentsForResource } from '@/lib/server/services/reviews';
import { updateResourceSchema } from '@/lib/resources/validation';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: NextRequest, ctx: Ctx) => {
  await requireAdmin(req);
  const { id } = await ctx.params;
  const resource = await getResourceForAdmin(id);
  return json({ resource, assignments: await listAssignmentsForResource(id) });
});

export const PATCH = handle(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const patch = await parseBody(req, updateResourceSchema);
  return json({ resource: await updateResource(admin, id, patch) });
});

export const DELETE = handle(async (req: NextRequest, ctx: Ctx) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  await deleteResource(admin, id);
  return json({ deleted: true });
});
