/**
 * Trusted, server-side provisioning of PairPrep administrators.
 *
 * Admin access can never be granted through the website or API. Run this script from a
 * machine that holds the Firebase service-account credentials:
 *
 *   npm run set-admin -- --email you@example.com          # grant
 *   npm run set-admin -- --email you@example.com --revoke # revoke (back to student)
 *
 * The user must have signed up on the site first (so a Firebase Auth account exists).
 * Credentials come from FIREBASE_SERVICE_ACCOUNT_KEY in .env.local, or from
 * GOOGLE_APPLICATION_CREDENTIALS, or the emulators when FIRESTORE_EMULATOR_HOST is set.
 */
import { cert, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const email = arg('email');
  const uidArg = arg('uid');
  const revoke = process.argv.includes('--revoke');
  if (!email && !uidArg) {
    console.error('Usage: npm run set-admin -- --email <email> [--revoke]  (or --uid <uid>)');
    process.exit(1);
  }

  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (key) {
    const text = key.trim().startsWith('{') ? key : Buffer.from(key, 'base64').toString('utf8');
    const sa = JSON.parse(text);
    initializeApp({
      credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
      projectId: projectId || sa.project_id,
    });
  } else {
    initializeApp({ projectId });
  }

  const auth = getAuth();
  const user = uidArg ? await auth.getUser(uidArg) : await auth.getUserByEmail(email!);
  const db = getFirestore();
  const ref = db.collection('users').doc(user.uid);
  const snap = await ref.get();
  const role = revoke ? 'student' : 'admin';
  const base = {
    role,
    reviewerScope: { departments: [], subjects: [] },
    roleUpdatedBy: 'set-admin-script',
    updatedAt: FieldValue.serverTimestamp(),
  };
  if (snap.exists) {
    await ref.update(base);
  } else {
    await ref.set({
      uid: user.uid,
      email: user.email ?? null,
      displayName: user.displayName || user.email?.split('@')[0] || 'PairPrep admin',
      createdAt: FieldValue.serverTimestamp(),
      ...base,
    });
  }
  // Roles are read from Firestore on every API request, so this takes effect immediately.
  console.log(`${user.email ?? user.uid} is now: ${role}.`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
