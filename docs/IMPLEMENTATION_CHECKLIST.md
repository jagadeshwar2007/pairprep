# Implementation checklist

Status key: ✅ complete · 🟡 partial · ❌ not implemented

## Public browsing

| Feature | Status | Notes |
| --- | --- | --- |
| Browse approved + published resources without login | ✅ | `/library`, home page "recently added", subject pages |
| Keyword search | ✅ | Prefix match over title, subject, code, keywords, file name, description |
| Filters: department, semester, subject, type, academic year | ✅ | Kept in the URL so links are shareable |
| Sorting and pagination | ✅ | Newest or title, up to 48 per page |
| Facet counts (only show what exists) | ✅ | `/api/resources/facets` |
| Resource detail with Drive preview | ✅ | Drive's own `/preview` iframe |
| Open in Drive / download | ✅ | Download only when the owner allows copying and the file is available |
| Unavailable-file handling (deleted, trashed, permission lost) | ✅ | Warning shown and download hidden |
| Full-text search inside file contents | ❌ | See "Next step: AI search" below |

## Accounts and roles

| Feature | Status | Notes |
| --- | --- | --- |
| Register, login, logout (email/password) | ✅ | |
| Google sign-in | ✅ | Needs the provider enabled in Firebase |
| Password reset | ✅ | Firebase email |
| Protected routes and access-denied states | ✅ | Client guards for UX; the server enforces everything |
| Roles stored server-side, never trusted from the client | ✅ | `users/{uid}`, written only by the Admin SDK |
| No self-escalation to admin | ✅ | API refuses `admin`; `scripts/set-admin.ts` only |
| Admin grants or revokes reviewer access with a scope | ✅ | Departments and/or subjects |
| Email verification requirement | ❌ | Not enforced. Consider requiring `@mnnit.ac.in` addresses |

## Contributions and review

| Feature | Status | Notes |
| --- | --- | --- |
| Submit a Drive link for review | ✅ | `/submit`, at most 25 open submissions per user |
| "My submissions" with status and rejection reason | ✅ | `/dashboard` |
| Admin assigns a reviewer | ✅ | Checks role, scope and not-the-uploader |
| Reviewer queue, approve or reject with comments | ✅ | `/dashboard/reviews` |
| Reviewers cannot review their own work | ✅ | Checked at assignment and at decision time |
| Reviewers cannot publish | ✅ | Publish is admin-only |
| Publishing requires an independent approval | ✅ | `approval.reviewerUid ≠ uploadedBy` |
| Unpublish, direct reject, delete | ✅ | |
| Editing the Drive file resets review | ✅ | |
| Notifications (email or in-app) | ❌ | |
| Contributor edits after submission | ❌ | Admin can edit; contributors resubmit |

## Admin dashboard

| Feature | Status | Notes |
| --- | --- | --- |
| Real statistics (no placeholders) | ✅ | Firestore aggregate counts |
| Review queue | ✅ | |
| All resources: filter, edit, assign, publish, unpublish, delete | ✅ | |
| Register a single Drive file with server-side metadata lookup | ✅ | |
| Folder importer (dedupe, pending only, error report, dry run) | ✅ | Max 500 files, 5 levels deep |
| Users and roles | ✅ | |
| Academic calendar editing | 🟡 | Read-only view; the calendar is static data in the repo |
| Audit log of admin actions | 🟡 | `roleUpdatedBy` and `assignedBy` are recorded; there is no full log collection |

## Google Drive

| Feature | Status | Notes |
| --- | --- | --- |
| Store file IDs, not URLs | ✅ | |
| Strict link parsing (https, Drive/Docs hosts only) | ✅ | |
| Server-only credentials (API key or service account) | ✅ | |
| Missing, deleted, permission-denied and unsupported files | ✅ | |
| No content proxying | ✅ | |
| Verified against real Drive | 🟡 | Covered with a fake client in tests. No credentials or network access were available in the build sandbox. Needs one manual check |

## Security

| Feature | Status | Notes |
| --- | --- | --- |
| No secrets in frontend or Git | ✅ | `.env.example` has names only; key files are git-ignored |
| Firestore rules deny all client writes | ✅ | Tested against the emulator |
| Strict input validation | ✅ | zod strict objects |
| Rate limiting | 🟡 | Per-user open-submission cap only; no request-rate limiter |

## Quality

| Feature | Status | Notes |
| --- | --- | --- |
| Unit tests | ✅ | 42 tests |
| Integration tests (API + rules on emulators) | ✅ | 22 tests |
| Browser end-to-end checks | 🟡 | Run manually with Playwright during development (19 steps, desktop and mobile); not committed as a suite |
| CI workflow | ❌ | Suggested: run `npm run typecheck && npm run lint && npm run test:all && npm run build` |

## Out of scope for this MVP

AI or semantic question search, RAG, vector databases, payments, uploading files to Drive from the app.

## Next step: AI search

`src/lib/resources/search.ts` defines a `ResourceSearchIndex` interface. Today it is backed by in-memory
keyword matching. A recommended path:

1. On publish, extract text from the Drive file on the server. Use `files.export` to `text/plain` for
   Google Docs, or download the PDF and parse it. Store chunks in a `resourceChunks` collection keyed by
   resource ID.
2. Embed the chunks with an embedding model and store the vectors. Firestore vector search works, as do
   pgvector and Typesense.
3. Implement `ResourceSearchIndex` with hybrid search (keyword plus vector) and the same filters, and
   return matching question snippets with the resource ID.
4. Index only published and approved resources, and drop a resource's chunks on unpublish or delete.
