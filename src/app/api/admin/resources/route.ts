import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireAdmin } from '@/lib/server/auth';
import { listResourcesForAdmin, registerResource } from '@/lib/server/services/resources';
import { registerResourceSchema } from '@/lib/resources/validation';
import { PUBLICATION_STATUSES, VERIFICATION_STATUSES } from '@/lib/resources/types';

const listSchema = z.object({
  q: z.string().trim().max(200).optional(),
  verificationStatus: z.enum(VERIFICATION_STATUSES).optional(),
  publicationStatus: z.enum(PUBLICATION_STATUSES).optional(),
  department: z.string().trim().max(40).optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const GET = handle(async (req: NextRequest) => {
  await requireAdmin(req);
  const raw = Object.fromEntries([...req.nextUrl.searchParams.entries()].filter(([, v]) => v !== ''));
  return json(await listResourcesForAdmin(listSchema.parse(raw)));
});

/** Admin registers an existing Drive file. It starts pending and unpublished like any other resource. */
export const POST = handle(async (req: NextRequest) => {
  const admin = await requireAdmin(req);
  const input = await parseBody(req, registerResourceSchema);
  return json({ resource: await registerResource(admin, input, 'admin') }, { status: 201 });
});
