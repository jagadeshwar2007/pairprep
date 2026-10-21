import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { importDriveFolder } from '@/lib/server/services/importer';
import { importFolderSchema } from '@/lib/resources/validation';

export const maxDuration = 60;

/** Admin: register every supported file in a Drive folder as pending. Never publishes. */
export const POST = handle(async (req: NextRequest) => {
  const admin = await requireAdmin(req);
  const input = await parseBody(req, importFolderSchema);
  return json(await importDriveFolder(admin, input));
});
