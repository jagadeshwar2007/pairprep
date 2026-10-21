// Verifies firestore.rules against the emulator using the *client* SDK, i.e. exactly what a
// browser (or an attacker with the public web config) could do.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { deleteApp, initializeApp, type FirebaseApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  collection,
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { admin, createUser, resetEmulators, type TestUser } from '../helpers/fixtures';

let app: FirebaseApp;
let db: Firestore;
let student: TestUser;
let adminU: TestUser;

async function loadRules() {
  const rules = readFileSync('firestore.rules', 'utf8');
  const res = await fetch(
    `http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${process.env.FIREBASE_PROJECT_ID}:securityRules`,
    { method: 'PUT', body: JSON.stringify({ rules: { files: [{ name: 'firestore.rules', content: rules }] } }) }
  );
  expect(res.ok).toBe(true);
}

async function signIn(user: TestUser | null) {
  const auth = getAuth(app);
  if (!user) return signOut(auth);
  await signInWithEmailAndPassword(auth, user.email, 'correct-horse-battery');
}

const denied = async (p: Promise<unknown>) => {
  await expect(p).rejects.toMatchObject({ code: 'permission-denied' });
};

beforeAll(async () => {
  await resetEmulators();
  await loadRules();
  student = await createUser('rules-student', 'student');
  adminU = await createUser('rules-admin', 'admin');
  const { db: adb } = admin();
  const base = { title: 't', department: 'cse', semester: 1, subject: 's', uploadedBy: 'someone-else' };
  await adb.collection('resources').doc('pub').set({ ...base, publicationStatus: 'published', verificationStatus: 'approved' });
  await adb.collection('resources').doc('draft').set({ ...base, publicationStatus: 'draft', verificationStatus: 'pending' });
  await adb.collection('resources').doc('approvedDraft').set({ ...base, publicationStatus: 'draft', verificationStatus: 'approved' });
  await adb.collection('resources').doc('mine').set({ ...base, uploadedBy: student.uid, publicationStatus: 'draft', verificationStatus: 'pending' });
  await adb.collection('reviewAssignments').doc('a1').set({ resourceId: 'draft', reviewerUid: 'other-reviewer', status: 'assigned' });

  app = initializeApp({ apiKey: 'fake-key', projectId: process.env.FIREBASE_PROJECT_ID }, 'rules-test');
  connectAuthEmulator(getAuth(app), `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`, { disableWarnings: true });
  db = getFirestore(app);
  const [host, port] = process.env.FIRESTORE_EMULATOR_HOST!.split(':');
  connectFirestoreEmulator(db, host, Number(port));
});

afterAll(async () => {
  await deleteApp(app);
});

describe('firestore.rules', () => {
  it('anonymous visitors can read only published + approved resources', async () => {
    await signIn(null);
    expect((await getDoc(doc(db, 'resources/pub'))).exists()).toBe(true);
    await denied(getDoc(doc(db, 'resources/draft')));
    await denied(getDoc(doc(db, 'resources/approvedDraft')));
    const q = query(collection(db, 'resources'), where('publicationStatus', '==', 'published'), where('verificationStatus', '==', 'approved'));
    expect((await getDocs(q)).size).toBe(1);
    await denied(getDocs(collection(db, 'resources')));
  });

  it('nobody can write resources from a client, including publishing', async () => {
    await signIn(student);
    await denied(updateDoc(doc(db, 'resources/mine'), { publicationStatus: 'published', verificationStatus: 'approved' }));
    await denied(setDoc(doc(db, 'resources/new'), { title: 'x', publicationStatus: 'published', verificationStatus: 'approved' }));
    await signIn(adminU);
    await denied(updateDoc(doc(db, 'resources/draft'), { publicationStatus: 'published' }));
  });

  it('contributors can read their own submissions but not others\' drafts', async () => {
    await signIn(student);
    expect((await getDoc(doc(db, 'resources/mine'))).exists()).toBe(true);
    await denied(getDoc(doc(db, 'resources/draft')));
  });

  it('a user cannot make themselves an admin by writing their profile', async () => {
    await signIn(student);
    expect((await getDoc(doc(db, `users/${student.uid}`))).get('role')).toBe('student');
    await denied(updateDoc(doc(db, `users/${student.uid}`), { role: 'admin' }));
    await denied(setDoc(doc(db, `users/${student.uid}`), { role: 'admin' }));
    await denied(getDoc(doc(db, `users/${adminU.uid}`)));
  });

  it('review assignments are visible only to their reviewer and admins', async () => {
    await signIn(student);
    await denied(getDoc(doc(db, 'reviewAssignments/a1')));
    await denied(setDoc(doc(db, 'reviewAssignments/a2'), { reviewerUid: student.uid, resourceId: 'draft' }));
    await signIn(adminU);
    expect((await getDoc(doc(db, 'reviewAssignments/a1'))).exists()).toBe(true);
    expect((await getDoc(doc(db, 'resources/draft'))).exists()).toBe(true);
  });

  it('the Drive de-duplication index is server-only', async () => {
    await signIn(adminU);
    await denied(getDoc(doc(db, 'driveFileIndex/anything')));
  });
});
