import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { getProfile } from '@/lib/server/services/users';

/** The signed-in user's profile, including the server-assigned role. */
export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  return json({ profile: await getProfile(user.uid) });
});
