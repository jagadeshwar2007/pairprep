import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { handle, json } from '@/lib/server/http';
import { searchPublished } from '@/lib/server/services/resources';
import { RESOURCE_TYPES } from '@/lib/resources/types';

const querySchema = z.object({
  q: z.string().trim().max(200).optional(),
  department: z.string().trim().max(40).optional(),
  semester: z.coerce.number().int().min(1).max(8).optional(),
  subject: z.string().trim().max(120).optional(),
  type: z.enum(RESOURCE_TYPES).optional(),
  year: z.string().trim().max(9).optional(),
  sort: z.enum(['newest', 'title']).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
  pageSize: z.coerce.number().int().min(1).max(48).optional(),
});

/** Public: published + approved resources only. No authentication required. */
export const GET = handle(async (req: NextRequest) => {
  const raw = Object.fromEntries(
    [...req.nextUrl.searchParams.entries()].filter(([, v]) => v !== '')
  );
  const p = querySchema.parse(raw);
  const result = await searchPublished({
    q: p.q,
    department: p.department,
    semester: p.semester,
    subject: p.subject,
    resourceType: p.type,
    academicYear: p.year,
    sort: p.sort,
    page: p.page,
    pageSize: p.pageSize,
  });
  return json(result);
});
