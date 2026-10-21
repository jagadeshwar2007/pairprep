import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/server/http';
import { publishedFacets } from '@/lib/server/services/resources';

/** Public: filter values that exist among published resources. */
export const GET = handle(async (req: NextRequest) => {
  void req;
  return json(await publishedFacets());
});
