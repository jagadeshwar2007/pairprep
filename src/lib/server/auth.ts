import 'server-only';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from './firebaseAdmin';
import { forbidden, unauthorized } from './http';
import { toIso } from './serialize';
import type { ReviewerScope, UserProfile, UserRole } from '@/lib/resources/types';
import { USER_ROLES } from '@/lib/resources/types';

// Authorization model
// - The caller proves identity with a Firebase ID token (Authorization: Bearer <token>).
// - The role is read from `users/{uid}` on every request. Only server code (Admin SDK)
//   writes that document; Firestore rules deny all client writes to it. A role claimed by
//   the browser is never trusted.

export interface AuthContext {
  uid: string;
  email: string | null;
  displayName: string;
  role: UserRole;
  reviewerScope: ReviewerScope;
}

const EMPTY_SCOPE: ReviewerScope = { departments: [], subjects: [] };

function bearerToken(req: Request): string | null {
  const header = req.headers.get('authorization') ?? '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

export function profileFromDoc(uid: string, data: FirebaseFirestore.DocumentData): UserProfile {
  const role = USER_ROLES.includes(data.role) ? (data.role as UserRole) : 'student';
  return {
    uid,
    email: data.email ?? null,
    displayName: data.displayName || data.email || 'PairPrep user',
    role,
    reviewerScope: {
      departments: Array.isArray(data.reviewerScope?.departments) ? data.reviewerScope.departments : [],
      subjects: Array.isArray(data.reviewerScope?.subjects) ? data.reviewerScope.subjects : [],
    },
    createdAt: toIso(data.createdAt) ?? new Date(0).toISOString(),
    updatedAt: toIso(data.updatedAt) ?? new Date(0).toISOString(),
  };
}

/**
 * Verifies the ID token and loads (or lazily creates) the user's profile.
 * New profiles always start as `student`; nothing in the request can choose a role.
 */
export async function getAuthContext(req: Request): Promise<AuthContext | null> {
  const token = bearerToken(req);
  if (!token) return null;

  let decoded;
  try {
    decoded = await adminAuth().verifyIdToken(token, true);
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.');
  }

  const ref = adminDb().collection('users').doc(decoded.uid);
  let snap = await ref.get();
  if (!snap.exists) {
    const displayName = (decoded.name as string | undefined) || decoded.email?.split('@')[0] || 'PairPrep user';
    await ref.create({
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName,
      role: 'student',
      reviewerScope: EMPTY_SCOPE,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }).catch((err: { code?: number }) => {
      // 6 = ALREADY_EXISTS: a concurrent request created it first.
      if (err?.code !== 6) throw err;
    });
    snap = await ref.get();
  }
  const profile = profileFromDoc(decoded.uid, snap.data() ?? {});
  return {
    uid: decoded.uid,
    email: decoded.email ?? null,
    displayName: profile.displayName,
    role: profile.role,
    reviewerScope: profile.reviewerScope,
  };
}

export async function requireUser(req: Request): Promise<AuthContext> {
  const ctx = await getAuthContext(req);
  if (!ctx) throw unauthorized();
  return ctx;
}

export async function requireRole(req: Request, roles: UserRole[]): Promise<AuthContext> {
  const ctx = await requireUser(req);
  if (!roles.includes(ctx.role)) throw forbidden();
  return ctx;
}

export const requireAdmin = (req: Request) => requireRole(req, ['admin']);

/** Admins can review anything; reviewers are limited to their configured scope. */
export function reviewerCanReview(
  reviewer: { role: UserRole; reviewerScope: ReviewerScope },
  resource: { department: string; subject: string; subjectCode: string | null }
): boolean {
  if (reviewer.role === 'admin') return true;
  if (reviewer.role !== 'reviewer') return false;
  const { departments, subjects } = reviewer.reviewerScope;
  const deptOk = departments.length === 0 || departments.includes(resource.department);
  const wanted = subjects.map((s) => s.toLowerCase());
  const subjOk =
    wanted.length === 0 ||
    wanted.includes(resource.subject.toLowerCase()) ||
    (resource.subjectCode !== null && wanted.includes(resource.subjectCode.toLowerCase()));
  return deptOk && subjOk;
}
