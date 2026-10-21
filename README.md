# PairPrep — MNNIT Academic Platform

> **Your Branch. Your Semester. Your Preparation.**

PairPrep is a student-run academic resource platform for **MNNIT Allahabad**. Students browse and download
reviewed study material (notes, PYQs, question banks, lab manuals, model papers) without signing in.
Signed-in students can contribute files for review. Reviewers verify material within their department or
subject scope, and administrators publish it. Files stay in Google Drive. PairPrep stores only metadata and
Drive file IDs.

The site also includes the official academic calendar, academic calculators (attendance, SGPA/CGPA, timer,
scientific calculator) and a practice section. Those predate this MVP and are unchanged except for styling.

> Student-run project. Not an official publication of MNNIT administration.

---

## Contents

1. [Architecture](#architecture)
2. [Local development](#local-development)
3. [Firebase setup](#firebase-setup)
4. [Google Drive setup](#google-drive-setup)
5. [Environment variables](#environment-variables)
6. [Deploying Firestore rules and indexes](#deploying-firestore-rules-and-indexes)
7. [Creating the first administrator](#creating-the-first-administrator)
8. [Registering and importing resources](#registering-and-importing-resources)
9. [Review and publishing workflow](#review-and-publishing-workflow)
10. [Database schema](#database-schema)
11. [API reference](#api-reference)
12. [Tests](#tests)
13. [Deployment](#deployment)
14. [Known limitations](#known-limitations)

See also [docs/IMPLEMENTATION_CHECKLIST.md](docs/IMPLEMENTATION_CHECKLIST.md).

---

## Architecture

| Layer | Technology | Notes |
| --- | --- | --- |
| UI | Next.js 16 App Router, React 19, Tailwind CSS 4 | Client components call the JSON API. |
| API | Next.js route handlers in `src/app/api/**` | The only backend. Every request is authorised on the server. |
| Auth | Firebase Authentication (email/password and Google) | The client SDK sends the ID token as `Authorization: Bearer …`. |
| Database | Cloud Firestore via `firebase-admin` | All writes go through the API. Client writes are denied by rules. |
| Files | Google Drive REST API v3 (metadata only) | Previews use Drive's own viewer. File contents are never proxied. |
| Validation | zod (strict schemas) | Unknown fields such as `role` or `verificationStatus` are rejected. |

```text
browser ── Firebase Auth (ID token) ──▶ /api/* route handler
                                          │  verifyIdToken (revocation checked)
                                          │  load users/{uid} → role
                                          │  zod-validate body
                                          ▼
                                  services/*  ──▶ Firestore (firebase-admin)
                                          └──▶ Google Drive metadata (server-only key)
```

### Folder structure (new or changed parts)

```text
src/
├── app/
│   ├── api/                     # Route handlers (public, contributor, reviewer, admin)
│   ├── library/                 # Public catalogue + /library/[id] detail page
│   ├── login/ register/         # Firebase Auth pages
│   ├── submit/                  # Contribution form (sign-in required)
│   ├── dashboard/               # "My submissions" and /dashboard/reviews
│   └── admin/                   # Admin dashboard (overview, queue, resources, import, users)
├── components/
│   ├── auth/                    # AuthProvider, AuthForm, RequireAuth
│   ├── admin/                   # Admin panels
│   ├── resources/               # LibraryView, ResourceCard, ResourceDetail, ResourceForm
│   └── ui/                      # Design-system primitives (Button, Field, Table, Toast, …)
├── lib/
│   ├── api/client.ts            # Typed fetch wrapper that attaches the ID token
│   ├── firebase/client.ts       # Client SDK (Auth only)
│   ├── drive/                   # Drive link parsing and folder-name inference (pure)
│   ├── resources/               # Types, constants, validation, search (shared)
│   └── server/                  # server-only: firebase-admin, auth, Drive client, services
scripts/
├── set-admin.ts                 # Grants/revokes administrator access (trusted CLI only)
└── seed-emulator.ts             # Demo data for the local emulators (refuses to run elsewhere)
tests/
├── unit/                        # Pure logic
└── integration/                 # API workflow + Firestore rules against the emulators
firestore.rules  firestore.indexes.json  firebase.json  .env.example
```

---

## Local development

Prerequisites: Node.js 20.9+ and Java 11+ (for the Firestore emulator). `firebase-tools` is a dev dependency,
so no global install is needed.

```bash
npm install
cp .env.example .env.local
```

### Option A: fully local with the Firebase emulators (no Google account needed)

Put this in `.env.local`:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=demo-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost
NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-pairprep
NEXT_PUBLIC_FIREBASE_APP_ID=demo-app
NEXT_PUBLIC_USE_FIREBASE_EMULATORS=true
FIREBASE_PROJECT_ID=demo-pairprep
FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
```

Then, in three terminals:

```bash
npm run emulators       # Auth on :9099, Firestore on :8080, UI on :4000
npm run seed:emulator   # optional demo data (see below)
npm run dev             # http://localhost:3000
```

`seed:emulator` creates three accounts with the password `pairprep-demo`:
`admin@pairprep.test`, `reviewer@pairprep.test` and `student@pairprep.test`. It also adds 14 resources
labelled "(demo)". Twelve are published and two are pending review. The script refuses to run unless the
emulator host variables are set, so it cannot write demo data into a real project.

Drive lookups are disabled in this mode unless you also set `GOOGLE_DRIVE_API_KEY`. The UI says so plainly
when you try to register a file.

### Option B: against a real Firebase project

Fill `.env.local` with real values (see [Environment variables](#environment-variables)), leave the emulator
variables unset, and run `npm run dev`.

---

## Firebase setup

1. Create a project at <https://console.firebase.google.com>.
2. **Authentication → Sign-in method**: enable *Email/Password* and, optionally, *Google*.
   Under **Settings → Authorized domains**, add your production domain.
3. **Firestore Database**: create a database in production mode. The rules in this repo deny all client
   writes anyway.
4. **Project settings → General → Your apps**: add a Web app and copy `apiKey`, `authDomain`, `projectId`
   and `appId` into the `NEXT_PUBLIC_FIREBASE_*` variables. These are public identifiers, not secrets.
5. **Project settings → Service accounts → Generate new private key.** Put the JSON in
   `FIREBASE_SERVICE_ACCOUNT_KEY`, either raw or base64-encoded (`base64 -w0 key.json`). Never commit the file.
   `.gitignore` already ignores `service-account*.json`. On Google Cloud runtimes you can omit the key and
   use the platform's default credentials instead.

---

## Google Drive setup

PairPrep reads Drive **metadata only**: name, MIME type, size, whether the file is trashed, and whether
copying or downloading is restricted. Previews and downloads use Google's own URLs, so the browser talks to
Drive directly. The server never streams file contents and never fetches arbitrary URLs. Links are parsed
for a file ID, and only `https://drive.google.com` and `https://docs.google.com` are accepted.

Choose **one** credential:

### Recommended: an API key

1. Google Cloud console → *APIs & Services* → enable **Google Drive API** for the Firebase project.
2. *Credentials → Create credentials → API key*. Restrict it to **Google Drive API** only.
3. Set `GOOGLE_DRIVE_API_KEY` on the server. It is never sent to the browser.
4. Share each file you want to publish as **"Anyone with the link → Viewer"**.

You do not have to make a whole folder public. Sharing individual files is enough. Public visitors need
"anyone with the link" access to preview the file anyway. With an API key, the folder importer can list a
folder only if the folder itself is link-shared. If you'd rather not do that, share the folder with a
service account instead (below) and keep the individual files link-shared.

### Alternative: a service account

1. Create a service account and download its JSON key.
2. Share the Drive folder with the service account's email address as **Viewer**.
3. Set `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY` (raw or base64 JSON). The scope used is `drive.metadata.readonly`.

The service account can read metadata for files that aren't link-shared. Visitors still can't preview those
files, so the detail page will report that the file is not available. Keep published files link-shared.

### How file problems are handled

| Situation | What happens |
| --- | --- |
| Invalid link or ID | Rejected with a validation error. |
| File not found, deleted or no access | Registration fails with a clear message. Already-published resources show "temporarily unavailable" and the download link is hidden. |
| Trashed | Treated as unavailable. |
| Unsupported type (video, zip, …) | Rejected. The importer lists it under "unsupported". |
| Owner disabled downloads (`copyRequiresWriterPermission`) | Preview still works and the download button is hidden. |
| Drive not configured on the server | Lookups and imports return `503 drive_not_configured`. Public browsing still works. |

Supported types are PDF, Google Docs, Slides and Sheets, Word, PowerPoint, JPEG and PNG.

---

## Environment variables

All names are in [.env.example](.env.example). Only `NEXT_PUBLIC_*` variables reach the browser.

| Variable | Where | Required | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | client | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | client | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | client | yes | Firebase web config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | client | yes | Firebase web config |
| `NEXT_PUBLIC_USE_FIREBASE_EMULATORS` | client | no | `true` connects the Auth SDK to the local emulator |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | server | yes, outside GCP | Admin SDK credentials (raw or base64 JSON) |
| `FIREBASE_PROJECT_ID` | server | recommended | Project ID for the Admin SDK |
| `GOOGLE_DRIVE_API_KEY` | server | one of these two | Drive metadata lookups |
| `GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY` | server | one of these two | Drive metadata lookups via a service account |
| `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` | server | local only | Point the Admin SDK at the emulators |

---

## Deploying Firestore rules and indexes

```bash
cp .firebaserc.example .firebaserc     # set your project ID (the file is git-ignored)
npx firebase login
npx firebase deploy --only firestore:rules,firestore:indexes
```

The rules in `firestore.rules` are a second line of defence. The app reads and writes through the Admin
SDK, which bypasses rules, and enforces permissions in `src/lib/server/**`. The rules make sure that a
client using the Firebase SDK directly:

- can read only resources that are published *and* approved, plus its own submissions;
- can read only its own `users/{uid}` profile (administrators can read all);
- can read only review assignments addressed to it;
- **cannot write anything.** Roles, statuses and approvals are therefore impossible to forge from the client.

---

## Creating the first administrator

Nobody can become an administrator through the website. There is no hardcoded password, and the role API
refuses to grant `admin`.

1. The person signs up normally on `/register`. This creates a `student` profile.
2. Someone with the service-account credentials in `.env.local` runs:

```bash
npm run set-admin -- --email someone@example.com
npm run set-admin -- --uid <firebase-uid>
npm run set-admin -- --email someone@example.com --revoke   # back to student
```

The person should sign out and back in. Administrators then grant or revoke **reviewer** access from
*Admin → Users & roles*, optionally scoped to departments or subject names. Administrators can't change
their own role or another administrator's role from the UI. That also requires the script.

---

## Registering and importing resources

**Register a single file** (*Admin → Register file*): paste a Drive link or file ID and click *Look up*.
The server fetches the file's metadata. Then fill in department, semester, subject, type and so on. The
resource is created as **pending / draft**.

**Import a folder** (*Admin → Import folder*): paste a folder link. The server walks the folder (optionally
recursively, up to 5 levels deep and 500 files) and infers semester, type, academic year and unit from
folder and file names such as `Sem 3/PYQ/DSA_2023.pdf`. You set default values for anything it can't
infer. Use **Dry run** first to preview the result. The report lists created items, duplicates (same Drive
file ID, matched through a transactional `driveFileIndex`), unsupported types and failures.
**Imports never publish anything.** Every imported file still goes through review.

**Contributions** (`/submit`): any signed-in user can submit a Drive link with metadata. Each user can
have at most 25 open submissions at a time. Contributors track their submissions on `/dashboard`.

---

## Review and publishing workflow

```text
pending ──assign──▶ under_review ──approve──▶ approved ──publish (admin)──▶ published
                         │                                   ▲     │
                         └──reject──▶ rejected               │  unpublish
                                                             └─────┘
```

- Only administrators assign reviewers. The reviewer must hold the reviewer (or admin) role, must not be
  the uploader, and the resource must fall within their scope. A reviewer with an empty scope can review
  everything.
- Reviewers approve or reject their own assignments. Rejecting requires a comment. **Reviewers cannot
  publish.**
- Publishing requires `verificationStatus = approved` *and* an approval recorded by someone other than the
  uploader. When Drive is configured, the file must also still be available at publish time.
- Changing a resource's Drive file resets it to pending / draft.
- Administrators can also reject directly (a reason is required), unpublish or delete.
- Revoking a reviewer cancels their open assignments and returns those resources to pending.

---

## Database schema

**`resources/{id}`**

| Field | Type | Notes |
| --- | --- | --- |
| `title`, `description` | string | |
| `department` | string | `common`, `cse`, `ece`, … (see `DEPARTMENTS`) |
| `semester` | number | 1–8 |
| `subject`, `subjectCode` | string, string \| null | |
| `academicYear` | string \| null | e.g. `2023-24` |
| `resourceType` | enum | `pyq`, `question_bank`, `notes`, `lab_manual`, `model_paper`, `other` |
| `unit`, `keywords` | string \| null, string[] | |
| `driveFileId`, `fileName`, `mimeType`, `fileSize` | | From Drive at registration |
| `downloadAllowed` | boolean | `false` when the owner restricted copying |
| `verificationStatus` | enum | `pending`, `under_review`, `approved`, `rejected` |
| `publicationStatus` | enum | `draft`, `published`, `unpublished` |
| `approval` | `{reviewerUid, assignmentId, decidedAt}` \| null | Set only by a reviewer's approval |
| `rejectionReason` | string \| null | |
| `source` | enum | `admin`, `import`, `contribution` |
| `uploadedBy`, `uploaderName`, `contributorNote` | | |
| `searchText` | string | Normalised text, denormalised at write time for search |
| `createdAt`, `updatedAt`, `publishedAt` | timestamp | |

**`reviewAssignments/{id}`**: `resourceId`, `resourceTitle`, `reviewerUid`, `reviewerName`, `assignedBy`,
`status` (`assigned` / `completed` / `cancelled`), `decision` (`approve` / `reject`), `comments`,
`createdAt`, `completedAt`.

**`users/{uid}`**: `email`, `displayName`, `role` (`student` / `reviewer` / `admin`),
`reviewerScope {departments[], subjects[]}`, `createdAt`, `updatedAt`, `roleUpdatedBy`.

**`driveFileIndex/{driveFileId}`**: `{resourceId}`. Enforces one resource per Drive file. Closed to clients.

Composite indexes are in `firestore.indexes.json`.

---

## API reference

| Method | Path | Who |
| --- | --- | --- |
| GET | `/api/resources?q=&department=&semester=&subject=&type=&year=&sort=&page=&pageSize=` | public |
| GET | `/api/resources/facets` | public |
| GET | `/api/resources/:id` | public (published + approved only) |
| GET | `/api/me` | signed in |
| GET, POST | `/api/submissions` | signed in |
| GET | `/api/reviews` | reviewer |
| POST | `/api/reviews/:assignmentId/decision` | assigned reviewer |
| GET | `/api/admin/stats` | admin |
| GET, POST | `/api/admin/resources` | admin |
| GET, PATCH, DELETE | `/api/admin/resources/:id` | admin |
| POST | `/api/admin/resources/:id/actions` (`publish` / `unpublish` / `reject`) | admin |
| POST | `/api/admin/resources/:id/assign` | admin |
| POST | `/api/admin/drive/lookup` | admin |
| POST | `/api/admin/import` | admin |
| GET | `/api/admin/users` | admin |
| PATCH | `/api/admin/users/:uid` | admin (student ↔ reviewer only) |

Errors are returned as `{ "error": { "code", "message", "fields?" } }` with an appropriate HTTP status.

---

## Tests

```bash
npm run typecheck          # tsc --noEmit
npm run lint               # eslint
npm test                   # unit tests (no services needed)
npm run test:integration   # starts the Auth + Firestore emulators, runs API workflow + rules tests
npm run test:all
npm run build
```

The integration tests call the real route handlers with real ID tokens from the Auth emulator. A fake
Drive client is injected through `setDriveClient`. They cover registration, contribution, assignment,
self-review prevention, reviewer scope, approval, rejection, publish and unpublish permissions,
duplicate detection, deletion, statistics, reviewer revocation, folder import and Firestore rules.

---

## Deployment

Vercel (or any Node host that runs Next.js) works:

1. Import the repo and set every variable from the table above. Do **not** set the emulator variables.
2. Add the deployed domain to Firebase Auth's authorised domains.
3. Deploy the Firestore rules and indexes (see above).
4. Create the first administrator with `npm run set-admin` from a trusted machine.

The folder import route allows up to 60 seconds (`maxDuration`). Very large folders may need several
imports of subfolders.

---

## Known limitations

- **Two-person rule.** Every resource, including ones an admin registers or imports, needs approval from a
  second account (a reviewer) before it can be published. Plan for at least one reviewer besides the admin.
- **Search** is keyword prefix-matching over metadata, done in memory over the published catalogue. The
  catalogue is cached for 60 seconds per server instance. This works well for thousands of resources.
  Beyond that, swap in a dedicated index through the `ResourceSearchIndex` interface in
  `src/lib/resources/search.ts`. File contents are not searched.
- **Caching.** Drive availability is cached for 5 minutes and the public catalogue for 60 seconds, so
  changes can take up to a minute to appear for anonymous visitors on other server instances.
- The **footer feedback form** is not connected to a backend, and the UI says so. The **practice** section
  uses questions built into the code, and results are not saved.
- The **academic calendar** is static data in the repo. The admin calendar tab is read-only.
- No email notifications to contributors or reviewers yet.
- Real Google Drive access could not be exercised in the development sandbox. It is covered by a fake
  client in tests, and needs one manual check with your API key (register one link-shared file).
- Out of scope for this MVP: AI or semantic search, payments, user uploads to Drive.
