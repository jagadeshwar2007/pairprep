import type { NextRequest } from 'next/server';
import { handle, json } from '@/lib/server/http';
import { requireRole } from '@/lib/server/auth';
import { listAssignmentsForReviewer } from '@/lib/server/services/reviews';
import { toPublicResource } from '@/lib/server/services/resources';

/** Reviewers: only the reviews assigned to them. */
export const GET = handle(async (req: NextRequest) => {
  const reviewer = await requireRole(req, ['reviewer', 'admin']);
  const items = await listAssignmentsForReviewer(reviewer);
  return json({
    items: items.map(({ resource, ...a }) => ({
      ...a,
      resource: resource
        ? {
            ...toPublicResource(resource),
            verificationStatus: resource.verificationStatus,
            publicationStatus: resource.publicationStatus,
            fileName: resource.fileName,
            contributorNote: resource.contributorNote,
          }
        : null,
    })),
  });
});
