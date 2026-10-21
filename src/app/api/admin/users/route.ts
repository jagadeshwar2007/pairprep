import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { listUsers } from '@/lib/server/services/users';

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  return json({ items: await listUsers() });
});
