/**
 * Seeds the *local Firebase emulators* with demo accounts and clearly labelled demo
 * resources so the UI can be explored without real credentials. Refuses to run against
 * a real project.
 *
 *   npm run emulators            # terminal 1
 *   npm run seed:emulator        # terminal 2
 *
 * Accounts (password: pairprep-demo): admin@pairprep.test, reviewer@pairprep.test,
 * student@pairprep.test
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { buildSearchText } from '../src/lib/resources/search';
import type { ResourceType } from '../src/lib/resources/types';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must point at the emulators.');
  process.exit(1);
}

const PASSWORD = 'pairprep-demo';
initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'demo-pairprep' });
const auth = getAuth();
const db = getFirestore();

async function account(name: string, role: 'admin' | 'reviewer' | 'student') {
  const email = `${role}@pairprep.test`;
  let user = await auth.getUserByEmail(email).catch(() => null);
  if (!user) user = await auth.createUser({ email, password: PASSWORD, displayName: name });
  await db.collection('users').doc(user.uid).set({
    uid: user.uid,
    email,
    displayName: name,
    role,
    reviewerScope: { departments: [], subjects: [] },
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return user.uid;
}

const demo: Array<[string, string, number, string, string | null, ResourceType, string | null, string | null]> = [
  ['Engineering Physics endsem 2023-24 (demo)', 'common', 1, 'Engineering Physics', 'PH11101', 'pyq', '2023-24', null],
  ['Engineering Physics unit 2 notes (demo)', 'common', 1, 'Engineering Physics', 'PH11101', 'notes', null, '2'],
  ['Engineering Mathematics I midsem 2024-25 (demo)', 'common', 1, 'Engineering Mathematics I', 'MA11101', 'pyq', '2024-25', null],
  ['Mathematics I question bank (demo)', 'common', 1, 'Engineering Mathematics I', 'MA11101', 'question_bank', null, null],
  ['C programming lab manual (demo)', 'common', 2, 'Computer Programming', 'CS11101', 'lab_manual', null, null],
  ['Data Structures endsem 2023-24 (demo)', 'cse', 3, 'Data Structures and Algorithms', 'CS13101', 'pyq', '2023-24', null],
  ['Data Structures trees and graphs notes (demo)', 'cse', 3, 'Data Structures and Algorithms', 'CS13101', 'notes', null, '3'],
  ['Data Structures model paper (demo)', 'cse', 3, 'Data Structures and Algorithms', 'CS13101', 'model_paper', null, null],
  ['Operating Systems midsem 2024-25 (demo)', 'cse', 5, 'Operating Systems', 'CS15101', 'pyq', '2024-25', null],
  ['Operating Systems deadlock notes (demo)', 'cse', 5, 'Operating Systems', 'CS15101', 'notes', null, '4'],
  ['Signals and Systems endsem 2022-23 (demo)', 'ece', 3, 'Signals and Systems', 'EC13101', 'pyq', '2022-23', null],
  ['Thermodynamics endsem 2023-24 (demo)', 'me', 3, 'Engineering Thermodynamics', 'ME13101', 'pyq', '2023-24', null],
  ['Thermodynamics question bank (demo)', 'me', 3, 'Engineering Thermodynamics', 'ME13101', 'question_bank', null, null],
  ['Syllabus booklet 2026 (demo)', 'common', 1, 'General', null, 'other', '2026', null],
];

async function main() {
  const adminUid = await account('Demo Admin', 'admin');
  const reviewerUid = await account('Demo Reviewer', 'reviewer');
  const studentUid = await account('Demo Student', 'student');

  for (const [i, [title, department, semester, subject, subjectCode, resourceType, academicYear, unit]] of demo.entries()) {
    const driveFileId = `demoFile${String(i).padStart(3, '0')}NotARealDriveId`;
    const pending = i >= demo.length - 2;
    const base = {
      title,
      description: 'Demo record created by scripts/seed-emulator.ts. It does not point to a real Drive file.',
      department,
      semester,
      subject,
      subjectCode,
      academicYear,
      resourceType,
      unit,
      keywords: ['demo'],
      driveFileId,
      mimeType: 'application/pdf',
      fileName: `${title}.pdf`,
      fileSizeBytes: 250_000 + i * 10_000,
      downloadAllowed: i % 4 !== 0,
    };
    const ref = db.collection('resources').doc(`demo-${i}`);
    await ref.set({
      ...base,
      searchText: buildSearchText(base),
      verificationStatus: pending ? 'pending' : 'approved',
      publicationStatus: pending ? 'draft' : 'published',
      source: pending ? 'contribution' : 'admin',
      uploadedBy: pending ? studentUid : adminUid,
      uploaderName: pending ? 'Demo Student' : 'Demo Admin',
      contributorNote: null,
      approval: pending ? null : { reviewerUid, assignmentId: 'seed', decidedAt: new Date().toISOString() },
      rejectionReason: null,
      createdAt: new Date(Date.UTC(2026, 8, 1 + i)),
      updatedAt: FieldValue.serverTimestamp(),
      publishedAt: pending ? null : new Date(Date.UTC(2026, 8, 1 + i)),
    });
    await db.collection('driveFileIndex').doc(driveFileId).set({ resourceId: ref.id, createdAt: FieldValue.serverTimestamp() });
  }
  console.log(`Seeded ${demo.length} demo resources and 3 accounts (password: ${PASSWORD}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
