// Integration tests run against the Firebase emulators (see `npm run test:integration`).
process.env.FIREBASE_PROJECT_ID ||= 'demo-pairprep';
process.env.GCLOUD_PROJECT ||= process.env.FIREBASE_PROJECT_ID;
process.env.FIRESTORE_EMULATOR_HOST ||= '127.0.0.1:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST ||= '127.0.0.1:9099';
delete process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
delete process.env.GOOGLE_DRIVE_API_KEY;
delete process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY;
