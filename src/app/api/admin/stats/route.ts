import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { adminStats } from '@/lib/server/services/resources';

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  return json(await adminStats());
});
