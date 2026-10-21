import 'server-only';
import { FieldValue, type DocumentSnapshot } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin';
import { badRequest, conflict, forbidden, notFound } from '../http';
import { toIso } from '../serialize';
import { profileFromDoc, reviewerCanReview, type AuthContext } from '../auth';
import { ASSIGNMENTS, RESOURCES, docToResource, invalidateCatalogue } from './resources';
import type { ReviewAssignment, ReviewDecision, Resource } from '@/lib/resources/types';

export function docToAssignment(snap: DocumentSnapshot): ReviewAssignment {
  const d = snap.data() ?? {};
  return {
    id: snap.id,
    resourceId: d.resourceId,
    resourceTitle: d.resourceTitle ?? '',
    reviewerUid: d.reviewerUid,
    reviewerName: d.reviewerName ?? '',
    assignedBy: d.assignedBy,
    status: d.status,
    decision: d.decision ?? null,
    comments: d.comments ?? null,
    createdAt: toIso(d.createdAt) ?? new Date(0).toISOString(),
    completedAt: toIso(d.completedAt),
  };
}

/** Admin assigns a reviewer. Enforces: real reviewer, not the uploader, within scope. */
export async function assignReviewer(admin: AuthContext, resourceId: string, reviewerUid: string) {
  const db = adminDb();
  const resourceRef = db.collection(RESOURCES).doc(resourceId);
  const reviewerRef = db.collection('users').doc(reviewerUid);
  const assignmentRef = db.collection(ASSIGNMENTS).doc();

  await db.runTransaction(async (tx) => {
    const [resourceSnap, reviewerSnap] = await Promise.all([tx.get(resourceRef), tx.get(reviewerRef)]);
    if (!resourceSnap.exists) throw notFound('Resource not found');
    if (!reviewerSnap.exists) throw notFound('Reviewer not found');
    const resource = docToResource(resourceSnap);
    const reviewer = profileFromDoc(reviewerUid, reviewerSnap.data() ?? {});

    if (reviewer.role !== 'reviewer' && reviewer.role !== 'admin') {
      throw badRequest('That user does not have reviewer permissions.', 'not_a_reviewer');
    }
    if (reviewer.uid === resource.uploadedBy) {
      throw forbidden('Reviewers cannot review their own submissions.');
    }
    if (!reviewerCanReview(reviewer, resource)) {
      throw forbidden("This resource is outside the reviewer's department or subject scope.");
    }
    if (resource.publicationStatus === 'published') {
      throw conflict('Unpublish this resource before sending it for review again.');
    }
    if (resource.verificationStatus === 'approved') {
      throw conflict('This resource is already approved.');
    }

    const open = await tx.get(
      db.collection(ASSIGNMENTS).where('resourceId', '==', resourceId).where('status', '==', 'assigned')
    );
    for (const doc of open.docs) {
      tx.update(doc.ref, { status: 'cancelled', completedAt: FieldValue.serverTimestamp() });
    }
    tx.create(assignmentRef, {
      resourceId,
      resourceTitle: resource.title,
      reviewerUid,
      reviewerName: reviewer.displayName,
      assignedBy: admin.uid,
      status: 'assigned',
      decision: null,
      comments: null,
      createdAt: FieldValue.serverTimestamp(),
      completedAt: null,
    });
    tx.update(resourceRef, {
      verificationStatus: 'under_review',
      rejectionReason: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  return docToAssignment(await assignmentRef.get());
}

/** A reviewer records a decision on an assignment that belongs to them. */
export async function submitDecision(
  reviewer: AuthContext,
  assignmentId: string,
  decision: ReviewDecision,
  comments: string | null
) {
  if (reviewer.role !== 'reviewer' && reviewer.role !== 'admin') throw forbidden();
  const db = adminDb();
  const assignmentRef = db.collection(ASSIGNMENTS).doc(assignmentId);

  await db.runTransaction(async (tx) => {
    const assignmentSnap = await tx.get(assignmentRef);
    if (!assignmentSnap.exists) throw notFound('Review not found');
    const assignment = docToAssignment(assignmentSnap);
    if (assignment.reviewerUid !== reviewer.uid) throw forbidden('This review is assigned to someone else.');
    if (assignment.status !== 'assigned') throw conflict('This review is already closed.');

    const resourceRef = db.collection(RESOURCES).doc(assignment.resourceId);
    const resourceSnap = await tx.get(resourceRef);
    if (!resourceSnap.exists) throw notFound('Resource not found');
    const resource = docToResource(resourceSnap);
    if (resource.uploadedBy === reviewer.uid) throw forbidden('Reviewers cannot review their own submissions.');
    if (!reviewerCanReview(reviewer, resource)) {
      throw forbidden('This resource is outside your review scope.');
    }
    if (resource.verificationStatus !== 'under_review') {
      throw conflict('This resource is no longer awaiting review.');
    }

    tx.update(assignmentRef, {
      status: 'completed',
      decision,
      comments,
      completedAt: FieldValue.serverTimestamp(),
    });
    // The reviewer only changes verification. Publication stays with administrators.
    tx.update(resourceRef, {
      verificationStatus: decision === 'approve' ? 'approved' : 'rejected',
      approval:
        decision === 'approve'
          ? { reviewerUid: reviewer.uid, assignmentId, decidedAt: new Date().toISOString() }
          : null,
      rejectionReason: decision === 'reject' ? comments : null,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  invalidateCatalogue();
  return docToAssignment(await assignmentRef.get());
}

export async function listAssignmentsForReviewer(
  reviewer: AuthContext
): Promise<Array<ReviewAssignment & { resource: Resource | null }>> {
  if (reviewer.role !== 'reviewer' && reviewer.role !== 'admin') throw forbidden();
  const db = adminDb();
  const snap = await db
    .collection(ASSIGNMENTS)
    .where('reviewerUid', '==', reviewer.uid)
    .orderBy('createdAt', 'desc')
    .limit(100)
    .get();
  const assignments = snap.docs.map(docToAssignment);
  const resourceIds = [...new Set(assignments.map((a) => a.resourceId))];
  const resourceSnaps = resourceIds.length
    ? await db.getAll(...resourceIds.map((id) => db.collection(RESOURCES).doc(id)))
    : [];
  const byId = new Map(resourceSnaps.filter((s) => s.exists).map((s) => [s.id, docToResource(s)]));
  return assignments.map((a) => ({ ...a, resource: byId.get(a.resourceId) ?? null }));
}

export async function listAssignmentsForResource(resourceId: string): Promise<ReviewAssignment[]> {
  const snap = await adminDb()
    .collection(ASSIGNMENTS)
    .where('resourceId', '==', resourceId)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  return snap.docs.map(docToAssignment);
}
