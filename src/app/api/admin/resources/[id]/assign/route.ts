import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { assignReviewer } from '@/lib/server/services/reviews';
import { assignReviewerSchema } from '@/lib/resources/validation';

export const POST = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin(req);
  const { id } = await ctx.params;
  const { reviewerUid } = await parseBody(req, assignReviewerSchema);
  return json({ assignment: await assignReviewer(admin, id, reviewerUid) }, { status: 201 });
});
