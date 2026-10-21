import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireRole } from '@/lib/server/auth';
import { submitDecision } from '@/lib/server/services/reviews';
import { reviewDecisionSchema } from '@/lib/resources/validation';

export const POST = handle(async (req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const reviewer = await requireRole(req, ['reviewer', 'admin']);
  const { id } = await ctx.params;
  const { decision, comments } = await parseBody(req, reviewDecisionSchema);
  return json({ assignment: await submitDecision(reviewer, id, decision, comments) });
});
