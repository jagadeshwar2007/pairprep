import 'server-only';
import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

// Credentials are read from server-only environment variables (never NEXT_PUBLIC_*).
// Supported, in order:
//   1. FIREBASE_SERVICE_ACCOUNT_KEY — the service-account JSON, raw or base64-encoded
//   2. GOOGLE_APPLICATION_CREDENTIALS / platform default credentials
//   3. Emulators (FIRESTORE_EMULATOR_HOST + FIREBASE_AUTH_EMULATOR_HOST) for local dev/tests

let app: App | undefined;

function parseServiceAccount(raw: string) {
  const text = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
  const json = JSON.parse(text) as { project_id: string; client_email: string; private_key: string };
  return { projectId: json.project_id, clientEmail: json.client_email, privateKey: json.private_key };
}

export function isFirebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.GOOGLE_APPLICATION_CREDENTIALS ||
      process.env.FIRESTORE_EMULATOR_HOST ||
      process.env.FIREBASE_CONFIG
  );
}

export function getAdminApp(): App {
  if (app) return app;
  const existing = getApps()[0];
  if (existing) {
    app = existing;
    return app;
  }
  const projectId =
    process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || undefined;
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  app = key
    ? initializeApp({ credential: cert(parseServiceAccount(key)), projectId })
    : initializeApp({ projectId });
  return app;
}

let db: Firestore | undefined;

export function adminDb(): Firestore {
  if (!db) {
    db = getFirestore(getAdminApp());
    try {
      db.settings({ ignoreUndefinedProperties: true });
    } catch {
      // Already initialised elsewhere in this process (dev hot reload, scripts, tests).
    }
  }
  return db;
}

export function adminAuth() {
  return getAuth(getAdminApp());
}
