import type { NextRequest } from 'next/server';
import { handle, json, parseBody } from '@/lib/server/http';
import { requireUser } from '@/lib/server/auth';
import { listSubmissionsBy, registerResource } from '@/lib/server/services/resources';
import { submitResourceSchema } from '@/lib/resources/validation';

/** Signed-in contributors: their own submissions and the review outcome. */
export const GET = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const items = await listSubmissionsBy(user.uid);
  return json({
    items: items.map((r) => ({
      id: r.id,
      title: r.title,
      subject: r.subject,
      department: r.department,
      semester: r.semester,
      resourceType: r.resourceType,
      verificationStatus: r.verificationStatus,
      publicationStatus: r.publicationStatus,
      rejectionReason: r.rejectionReason,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    })),
  });
});

/** Signed-in contributors submit an existing Drive file for review. It starts pending and unpublished. */
export const POST = handle(async (req: NextRequest) => {
  const user = await requireUser(req);
  const input = await parseBody(req, submitResourceSchema);
  const { contributorNote, ...rest } = input;
  const resource = await registerResource(user, rest, 'contribution', contributorNote);
  return json(
    { id: resource.id, verificationStatus: resource.verificationStatus, publicationStatus: resource.publicationStatus },
    { status: 201 }
  );
});
