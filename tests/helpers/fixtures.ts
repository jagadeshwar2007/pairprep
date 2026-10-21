import { NextRequest } from 'next/server';
import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { setDriveClient, type DriveClient, type DriveFileMetadata, type DriveLookupResult } from '@/lib/server/drive';
import { invalidateCatalogue } from '@/lib/server/services/resources';
import type { UserRole } from '@/lib/resources/types';

const PROJECT = () => process.env.FIREBASE_PROJECT_ID!;

export function admin() {
  if (!getApps().length) initializeApp({ projectId: PROJECT() });
  return { auth: getAuth(), db: getFirestore() };
}

export async function resetEmulators() {
  const project = PROJECT();
  await fetch(`http://${process.env.FIRESTORE_EMULATOR_HOST}/emulator/v1/projects/${project}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  await fetch(`http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/emulator/v1/projects/${project}/accounts`, {
    method: 'DELETE',
  });
  invalidateCatalogue();
}

export interface TestUser {
  uid: string;
  email: string;
  token: string;
}

/** Creates an Auth emulator account and returns a real ID token for it. */
export async function createUser(name: string, role?: UserRole, scope?: { departments: string[]; subjects: string[] }) {
  const { auth, db } = admin();
  const email = `${name}@example.test`;
  const password = 'correct-horse-battery';
  const user = await auth.createUser({ email, password, displayName: name });
  const res = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-key`,
    { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, password, returnSecureToken: true }) }
  );
  const body = (await res.json()) as { idToken: string };
  if (role) {
    // Trusted provisioning, equivalent to scripts/set-admin.ts.
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email,
      displayName: name,
      role,
      reviewerScope: scope ?? { departments: [], subjects: [] },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  return { uid: user.uid, email, token: body.idToken } satisfies TestUser;
}

export function request(
  path: string,
  opts: { method?: string; token?: string; body?: unknown; headers?: Record<string, string> } = {}
) {
  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  if (opts.body !== undefined) headers['content-type'] = 'application/json';
  return new NextRequest(new URL(path, 'http://localhost:3000'), {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

export const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

export async function body<T = any>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

/** In-memory stand-in for Google Drive so tests never depend on real files or credentials. */
export class FakeDrive implements DriveClient {
  files = new Map<string, DriveLookupResult>();
  folders = new Map<string, Array<DriveFileMetadata & { path: string[] }>>();

  isConfigured() {
    return true;
  }

  addFile(id: string, overrides: Partial<DriveFileMetadata> = {}) {
    const file: DriveFileMetadata = {
      id,
      name: `${id}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 123_456,
      modifiedTime: '2026-01-01T00:00:00.000Z',
      trashed: false,
      downloadAllowed: true,
      parents: [],
      ...overrides,
    };
    this.files.set(id, { ok: true, file, supported: file.mimeType !== 'application/zip' });
    return file;
  }

  breakFile(id: string, availability: 'not_found' | 'forbidden' | 'trashed') {
    this.files.set(id, { ok: false, availability, message: `fake ${availability}` });
  }

  async getFile(id: string): Promise<DriveLookupResult> {
    return this.files.get(id) ?? { ok: false, availability: 'not_found', message: 'The file does not exist or is not shared.' };
  }

  async listFolder(folderId: string) {
    return { files: this.folders.get(folderId) ?? [], truncated: false, errors: [] };
  }
}

export function installFakeDrive() {
  const drive = new FakeDrive();
  setDriveClient(drive);
  return drive;
}

export const fileId = (n: number) => `testfile${String(n).padStart(4, '0')}abcdefghij`;
