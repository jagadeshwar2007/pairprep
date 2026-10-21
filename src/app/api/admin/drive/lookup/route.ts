import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { lookupDriveFile } from '@/lib/server/services/resources';
import { driveLookupSchema } from '@/lib/resources/validation';
import { adminDb } from '@/lib/server/firebaseAdmin';
import { DRIVE_INDEX } from '@/lib/server/services/resources';

/** Admin: fetch Drive metadata for a link before registering it. */
export const POST = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const { driveRef } = await parseBody(req, driveLookupSchema);
  const file = await lookupDriveFile(driveRef);
  const indexed = await adminDb().collection(DRIVE_INDEX).doc(file.id).get();
  return json({ file, alreadyRegistered: indexed.exists, resourceId: indexed.exists ? indexed.get('resourceId') : null });
});
