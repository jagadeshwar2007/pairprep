import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/server/http';
import { getPublishedResource } from '@/lib/server/services/resources';

/** Public: one published resource plus a live check that its Drive file is still reachable. */
export const GET = handle(async (_req: NextRequest, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  return json(await getPublishedResource(id));
});
