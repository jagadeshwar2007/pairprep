import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '../firebaseAdmin';
import { badRequest, forbidden, notFound } from '../http';
import { profileFromDoc, type AuthContext } from '../auth';
import { ASSIGNMENTS, RESOURCES, invalidateCatalogue } from './resources';
import type { ReviewerScope, UserProfile, UserRole } from '@/lib/resources/types';

export async function getProfile(uid: string): Promise<UserProfile> {
  const snap = await adminDb().collection('users').doc(uid).get();
  if (!snap.exists) throw notFound('User not found');
  return profileFromDoc(uid, snap.data() ?? {});
}

export async function listUsers(): Promise<UserProfile[]> {
  const snap = await adminDb().collection('users').orderBy('createdAt', 'desc').limit(500).get();
  return snap.docs.map((d) => profileFromDoc(d.id, d.data()));
}

/**
 * Grants or revokes reviewer permissions. The API can only move users between
 * `student` and `reviewer`; administrators are provisioned with the trusted
 * `scripts/set-admin.ts` script, so no HTTP request can create an admin.
 */
export async function setUserRole(
  admin: AuthContext,
  targetUid: string,
  role: UserRole,
  scope: ReviewerScope | undefined
): Promise<UserProfile> {
  if (admin.role !== 'admin') throw forbidden();
  if (targetUid === admin.uid) throw forbidden('You cannot change your own role.');
  if (role === 'admin') {
    throw forbidden('Administrator access can only be granted with the server-side setup script.');
  }
  const db = adminDb();
  const ref = db.collection('users').doc(targetUid);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw notFound('User not found');
    const current = profileFromDoc(targetUid, snap.data() ?? {});
    if (current.role === 'admin') {
      throw forbidden('Administrator roles can only be changed with the server-side setup script.');
    }
    if (role === 'student' && scope && (scope.departments.length || scope.subjects.length)) {
      throw badRequest('Students cannot have a reviewer scope.');
    }

    // Revoking reviewer access hands their open reviews back to the queue.
    if (current.role === 'reviewer' && role === 'student') {
      const open = await tx.get(
        db.collection(ASSIGNMENTS).where('reviewerUid', '==', targetUid).where('status', '==', 'assigned')
      );
      for (const a of open.docs) {
        tx.update(a.ref, { status: 'cancelled', completedAt: FieldValue.serverTimestamp() });
        tx.update(db.collection(RESOURCES).doc(a.get('resourceId')), {
          verificationStatus: 'pending',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }

    tx.update(ref, {
      role,
      reviewerScope:
        role === 'reviewer'
          ? {
              departments: scope?.departments ?? [],
              subjects: (scope?.subjects ?? []).map((s) => s.toLowerCase()),
            }
          : { departments: [], subjects: [] },
      roleUpdatedBy: admin.uid,
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  invalidateCatalogue();
  return getProfile(targetUid);
}
