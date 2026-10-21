# Pairprep: MNNIT Academic Platform

> **Your Branch. Your Semester. Your Preparation.**

Pairprep is the academic hub for B.Tech students at **MNNIT Allahabad**: notes, previous-year papers, lab
material, an academic calendar and study tools, now backed by a real **Supabase** backend:

- **Google sign-in** for students (no passwords are ever stored).
- **Student contributions** that stay private until a moderator approves them.
- **Tiered admin access**: a dedicated *File Moderator*, a *Content Administrator*, and exactly one *Super Admin*.
- Private file storage with signed URLs, an append-only audit log, in-app notifications, bookmarks and saved attendance.

**Stack:** Next.js 16 (App Router, Cache Components, `proxy.ts`) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, Storage, RLS) · Vitest.

> Next.js 16 differs from older versions (`middleware.ts` is now `proxy.ts`, Cache Components are on). Read
> `node_modules/next/dist/docs/` before changing routing or data-fetching code. See `AGENTS.md`.

---

## Contents

1. [Architecture](#architecture)
2. [Quick start](#quick-start)
3. [Full setup guide](#full-setup-guide)
4. [Manual checklist](#manual-checklist-what-only-you-can-do)
5. [Roles and permissions](#roles-and-permissions)
6. [Contribution and moderation workflow](#contribution-and-moderation-workflow)
7. [Storage design](#storage-design)
8. [Routes](#routes)
9. [Database](#database)
10. [Testing](#testing)
11. [What is verified, and what is not](#what-is-verified-and-what-is-not)
12. [Limitations](#known-limitations)

---

## Architecture

```
Browser ──(anon key + user JWT)──────────────► Supabase (RLS enforced)
   │                                              ▲   ▲
   │ Server Actions / Route Handlers              │   │ SECURITY DEFINER RPCs re-check
   ▼                                              │   │ authority, lock rows, write audit
Next.js server ──(user-scoped client)─────────────┘   │
   │  src/lib/auth/*  (verify session, permissions)   │
   └──(service role, only after authorising the user)─┘  validate uploads · copy approved files ·
                                                         ban suspended users · retention job
```

Principles:

- **The database is the authority.** Every table has Row Level Security. API roles have *no* write grants on privileged
  tables; changes go through narrowly scoped `SECURITY DEFINER` functions that re-check the caller, lock the row,
  validate the state transition and write the audit log in one transaction. Hiding a button is never the protection.
- **Roles live in trusted tables** (`user_roles`, `user_permissions`), never in `profiles`, JWT metadata or anything a
  user can edit. Permissions are looked up on every request, so revocation and suspension take effect immediately.
- **The service-role key is server-only** (`import 'server-only'`) and used for four things, always *after* the user was
  authorised: validating uploads, copying approved files to published storage, banning suspended users in Auth, and the
  retention job.
- **Server-side auth** uses `@supabase/ssr` cookies, `getClaims()` in `proxy.ts` (session refresh + optimistic redirect)
  and `getUser()` in every page/action (the real check).

```
src/
├── proxy.ts                    session refresh + redirect for /account, /submit, /admin
├── actions/                    Server Actions (uploads, contributions, moderation, resources, users, settings)
├── app/
│   ├── login, auth/callback    Google OAuth (PKCE) entry and landing
│   ├── account/                student dashboard
│   ├── submit/                 contribution form
│   ├── admin/                  moderation · resources · reports · users · audit · settings
│   └── api/                    signed file URLs, retention cron
├── lib/
│   ├── supabase/               browser · server · public (no cookies) · admin (service role) · proxy
│   ├── auth/                   permissions model, session (DAL), action context, safe redirects
│   ├── files/                  content sniffing, upload validation, URL validation
│   └── admin/ data/            query helpers, published-resource fetchers
└── components/                 UI (existing design kept; new auth/account/admin components)
supabase/
├── migrations/                 schema, RLS, RPCs, storage, catalog (apply in order)
├── seed.sql                    local-dev sample data only
└── config.toml                 local Supabase CLI config
tests/
├── db/                         Postgres tests of RLS, RBAC, workflow, storage (PGlite)
└── unit/                       file sniffing, redirects, permissions, server pipeline, attendance
scripts/
├── bootstrap-super-admin.mjs   one-time, operator-run super admin creation
└── generate-catalog-sql.mjs    academicData.ts → catalog migration
```

---

## Quick start

```bash
npm install
cp .env.example .env.local      # fill in your Supabase values (see the setup guide)
npm run dev                     # http://localhost:3000
```

Without Supabase variables the app still runs: public pages render and every backend feature shows an explicit
"not configured" state (nothing pretends to work).

Useful scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run lint` / `npm run typecheck` | ESLint / `tsc --noEmit` |
| `npm test` | all tests (`test:unit`, `test:db`) |
| `npm run bootstrap:admin -- --email you@x.com` | create the single super admin (see below) |
| `npm run db:catalog` / `db:catalog:check` | regenerate / verify the subject catalog migration |
| `npm run db:types` | generate TypeScript types from a linked Supabase project |

---

## Full setup guide

### 1. Install dependencies

```bash
npm install
```

### 2. Create a Supabase project

Dashboard → **New project**. Note the **Project URL**, the **anon (publishable) key** and the **service_role key**
(Project Settings → API).

### 3. Configure environment variables

Copy `.env.example` to `.env.local`:

| Variable | Exposed to browser? | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | anon / publishable key. Safe: only grants what RLS allows |
| `NEXT_PUBLIC_SITE_URL` | yes | public origin, e.g. `http://localhost:3000` |
| `SUPABASE_SERVICE_ROLE_KEY` | **no, never** | bypasses RLS. Server only (uploads validation, publishing, retention, bootstrap) |
| `CRON_SECRET` | no | protects `/api/cron/cleanup` (Vercel Cron sends it as a Bearer token) |

Never commit `.env.local` (it is git-ignored). Never prefix the service role key with `NEXT_PUBLIC_`.

### 4. Apply the migrations

Apply the six files in `supabase/migrations/` **in order**. Any one of:

```bash
# Supabase CLI (recommended)
supabase link --project-ref <your-project-ref>
supabase db push
```

or paste each file into **Dashboard → SQL Editor** and run them in filename order. (Do **not** run `supabase/seed.sql`
against production; it only holds labelled sample data for local development.)

After applying, optionally check **Dashboard → Database → Advisors → Security**: there should be no table without RLS.

### 5. Configure Google OAuth in Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → create/select a project.
2. **APIs & Services → OAuth consent screen**: choose *External* (or *Internal* if your college uses Google Workspace and
   you want to restrict at Google's side). Fill in the app name and support email. Scopes: the defaults
   (`openid`, `email`, `profile`) are enough. While in *Testing* mode, add your test users.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application**.
   - **Authorized JavaScript origins:** `http://localhost:3000` and your production origin, e.g. `https://pairprep.example`.
   - **Authorized redirect URIs:** `https://<project-ref>.supabase.co/auth/v1/callback`
     (this is Supabase's callback, *not* your app's). For a local Supabase stack also add
     `http://127.0.0.1:54321/auth/v1/callback`.
4. Copy the **Client ID** and **Client secret**.

### 6. Configure the provider and redirect URLs in Supabase

**Dashboard → Authentication:**

1. **Sign In / Providers → Google:** enable it and paste the Client ID and secret.
2. **Sign In / Providers → Email:** *disable* it, so no password accounts can exist (Google only).
   Keep "Allow new users to sign up" **on** (Google sign-in creates the account).
3. **URL Configuration:**
   - **Site URL:** your production URL (or `http://localhost:3000` while developing).
   - **Redirect URLs:** add `http://localhost:3000/auth/callback`, `https://<your-domain>/auth/callback`, and, if you use
     Vercel previews, a pattern such as `https://*-<team>.vercel.app/auth/callback`.
4. **Hooks → Before User Created:** choose **Postgres function** → `public.hook_before_user_created`. This rejects
   sign-ups from non-permitted email domains at the Auth layer (see [email domain](#restricting-registration-to-the-college-email-domain)).
   The same rule is also enforced in the database and in `/auth/callback`, so the app stays safe if you skip this step.

### 7. Run locally

```bash
npm run dev
```

Open <http://localhost:3000>, click **Sign In → Continue with Google**.

### 8. Create the first super admin (securely)

There is **exactly one** super admin, and nobody can become one through signup, the UI, a profile field or the browser.

1. Sign in once with the Google account that should own the platform (this creates its profile as a normal student).
2. Run, on a machine that has the service role key in `.env.local`:

   ```bash
   npm run bootstrap:admin -- --email you@example.com
   ```

   It shows the account it found, asks you to retype the email, then calls `public.bootstrap_super_admin()`. That function
   is executable by the **service role only**, refuses to run if a super admin already exists, and writes an audit entry.

   *Alternative (SQL Editor, runs as `postgres`):*
   ```sql
   select public.bootstrap_super_admin((select id from auth.users where email = 'you@example.com'));
   ```
3. Reload the app: the **Admin panel** link appears in your account menu.

The database itself enforces "one super admin": a partial unique index rejects a second one, and once bootstrapped a
deferred constraint trigger refuses any change (or account deletion) that would leave the platform without one. Ownership
moves only via **Admin → Settings → Transfer ownership**: an explicit, typed-confirmation, audited, atomic swap.

### 9. Create moderators and content administrators

As super admin: **Admin → Users → (open an account) → Role**, then pick *File Moderator* or *Content Administrator*.
The person must have signed in with Google at least once. Under the same page you can grant extra individual permissions
(only ones you hold yourself, and never `roles.manage` / `settings.manage`) and suspend or reactivate accounts.

### 10. Storage buckets and policies

The migrations create both buckets and their policies; nothing to click. Verify in **Dashboard → Storage** that both are
**private**: `contributions-private` and `resources-published`. See [Storage design](#storage-design).

### 11. Deploy (Vercel)

1. Import the repository in Vercel.
2. Add the five environment variables from step 3 for **Production** (and Preview if you want previews to work).
   Set `NEXT_PUBLIC_SITE_URL` to the production origin.
3. `vercel.json` already schedules the retention job daily (`/api/cron/cleanup`). Vercel sends `CRON_SECRET` automatically
   when the variable is defined.

### 12. Production redirect URLs

Add the production origin to **both**: Google Cloud *Authorized JavaScript origins* and Supabase **Redirect URLs**
(`https://<domain>/auth/callback`), and set Supabase **Site URL** to it. Mismatches show up as
"redirect_uri_mismatch" (Google) or a failed callback (`/login?error=exchange_failed`).

### 13. Run the tests and verify permissions

```bash
npm run lint && npm run typecheck && npm test && npm run build
```

Then walk through the [manual checklist](#manual-checklist-what-only-you-can-do).

### Restricting registration to the college email domain

Off by default so you can develop with any Google account. **Admin → Settings → College email domain**: enter
e.g. `college.edu` (one per line). The official domain is *not* guessed anywhere in the code. When set:

- the Auth hook rejects other domains at **sign-up**,
- `/auth/callback` signs out sessions whose account is not permitted,
- the **database** refuses every student write for such an account (contributions, uploads, bookmarks, attendance…),
- staff accounts are exempt, so a super admin can never lock themselves out.

> Set the restriction only after the super admin account exists, or make sure that account is on an allowed domain.

---

## Manual checklist (what only you can do)

- [ ] Create the Supabase project; copy URL, anon key, service role key.
- [ ] Fill `.env.local` (and the Vercel env vars). Generate `CRON_SECRET` (`openssl rand -hex 32`).
- [ ] Apply the six migrations in order.
- [ ] Google Cloud: OAuth consent screen + OAuth **Web** client, origins and the Supabase redirect URI.
- [ ] Supabase: enable Google provider with the client ID/secret; **disable** the Email provider.
- [ ] Supabase: Site URL + Redirect URLs (local, production, previews).
- [ ] Supabase: enable the *Before User Created* hook → `public.hook_before_user_created`.
- [ ] Sign in once, then run `npm run bootstrap:admin -- --email …`.
- [ ] Assign a moderator and a content administrator in **Admin → Users**.
- [ ] Optionally set the college email domain in **Admin → Settings**.
- [ ] Confirm both buckets are private; run the Security Advisor.
- [ ] Deploy and test sign-in on the production domain with a real student account.
- [ ] Smoke-test the loop: student submits → moderator approves → resource appears on the subject page.

---

## Roles and permissions

| Permission | Student | File Moderator | Content Admin | Super Admin |
| --- | :-: | :-: | :-: | :-: |
| `resources.read` browse published resources | ✓ | ✓ | ✓ | ✓ |
| `contributions.read` see pending contributions and files | | ✓ | | ✓ |
| `contributions.review` claim, flag, request changes | | ✓ | | ✓ |
| `contributions.approve` approve (publishes) | | ✓ | | ✓ |
| `contributions.reject` reject | | ✓ | | ✓ |
| `resources.create` / `edit` / `publish` / `archive` | | | ✓ | ✓ |
| `resources.delete` permanent deletion (never while published) | | | | ✓ |
| `users.read` view accounts, roles, permissions | | | | ✓ |
| `users.suspend` suspend / reactivate students | | | | ✓ |
| `roles.manage` assign roles, grant permissions, transfer ownership | | | | ✓ |
| `settings.manage` application settings | | | | ✓ |
| `audit.read` audit log | | | | ✓ |

- A user has exactly **one role**; the super admin can add **individual permissions** on top (to moderators / content admins
  only). Individual grants are limited to permissions the grantor holds, and `roles.manage` / `settings.manage` can never be
  delegated.
- Students can always contribute, bookmark, keep notifications/preferences/attendance, and see their own submissions.
- **Nobody can review their own submission**, not even the super admin.
- Moderators cannot touch resources, accounts, settings or the audit log; content admins cannot see the private queue.
- A suspended account has no permissions and no write access, immediately (every policy and RPC checks status) and is also
  banned in Supabase Auth.

---

## Contribution and moderation workflow

```
Student ──► picks branch/year/semester/subject/category, title, description
        ──► uploads a file  OR  shares an https link         (preview step, honor-code checkbox)
                │
   file ────────┤ 1. browser uploads straight to private bucket  <uid>/<random>.<ext>   (Storage RLS)
                │ 2. server downloads it, identifies it by CONTENT (magic bytes / ZIP structure), checks size
                │    and type limits, records a validation row (service role); bad files are deleted
                │ 3. submit_contribution() accepts only a path with a matching, unused, unchanged validation
                ▼
          status: pending ──► moderator "Start review" ──► in_review
                                   │
            ┌──────────────────────┼───────────────────────────┐
            ▼                      ▼                           ▼
        approved              changes_requested            rejected
   (file copied to        (student sees feedback,       (never public; student
   published bucket;       edits + resubmits →           sees the reason; file purged
   resource published      new revision, back to         after the retention period)
   in ONE transaction)     pending, history kept)
```

- Pending contributions are visible only to the uploader and permitted reviewers (RLS + Storage policy).
- `approve_contribution()` locks the row, checks state, creates exactly one resource (`unique(source_contribution_id)`),
  records the review, notifies the student and writes the audit entry. A second approval fails with `invalid_state`.
- Moderators can **flag** suspicious/duplicate items (notes are hidden from the student); a flagged item can't be approved
  until unflagged.
- Every submission keeps an immutable snapshot per revision (`contribution_revisions`) and every decision
  (`contribution_reviews`).
- Students are notified in-app (`notifications`) of: in review, approved, rejected, changes requested.
- External links must be public `https://` URLs (no localhost, IPs, credentials). They are rendered as plain links and are
  **never fetched or redirected through** by the server; the UI labels the host and warns that Drive links may need access.

---

## Storage design

| Bucket | Public? | Contents | Who can… |
| --- | --- | --- | --- |
| `contributions-private` | **no** | student uploads before/after review, path `<user_id>/<uuid>.<ext>` | **insert**: own folder only, strict name shape, active account · **read**: owner, or `contributions.read` · **update/delete**: nobody via the API (uploads are immutable) |
| `resources-published` | **no** | approved copies `approved/<contribution_id>/<file>` and admin uploads `uploads/<user_id>/<uuid>.<ext>` | **read**: anyone, only while a *published* resource references the file (staff can preview drafts) · **insert**: content staff, own `uploads/<uid>/` folder · **update**: nobody · **delete**: staff, only when no live resource references it |

- Both buckets enforce a MIME allowlist and a 50 MB hard cap; the effective limit (default 25 MB) and file types
  (default PDF, PNG, JPEG, DOCX; PPTX opt-in) are settings in the database.
- Files are served via **60-second signed URLs** issued by `/api/resources/:id/file` and `/api/contributions/:id/file`.
- Because a validated upload can't be overwritten or deleted by the student, the bytes that were checked are the bytes that
  get reviewed (no check-then-swap).
- **Retention** (`/api/cron/cleanup`, daily): deletes uploads that never became a submission, orphaned published copies,
  files of rejected submissions after the retention period (default 30 days) and superseded revisions. A file referenced by
  a live contribution or resource is never a candidate.

---

## Routes

| Route | Who | What |
| --- | --- | --- |
| `/login` | public | Google sign-in; shows cancelled / failed / expired / not-permitted states |
| `/auth/callback` | public | OAuth landing; validates the account; redirects to a *validated* same-site path |
| `/account` | signed in | dashboard: profile, stats, items needing changes, notifications |
| `/account/contributions` · `/[id]` · `/[id]/resubmit` | signed in | history, feedback, revisions, resubmit, withdraw |
| `/account/bookmarks` · `/notifications` · `/settings` | signed in | bookmarks, notifications, profile and study preferences |
| `/submit` | signed in | contribution form (`?subject=<slug>` pre-selects a course) |
| `/tools/attendance` | public / signed in | calculator; signed-in students can save courses privately |
| `/admin` | super admin | overview (others are redirected to their home) |
| `/admin/moderation` · `/[id]` | `contributions.read` | queue with filters/search/sort/pagination; review screen with preview, history, actions |
| `/admin/resources` · `/new` · `/[id]` | resources permissions | list, create, edit, publish, archive, delete |
| `/admin/reports` | `resources.edit` | resource reports and student feedback |
| `/admin/users` · `/[id]` | `users.read` | accounts, effective permissions, role/permission/suspension management |
| `/admin/audit` | `audit.read` | filterable, paginated audit log |
| `/admin/settings` | `settings.manage` / `roles.manage` | email domain, upload limits, retention, ownership transfer |
| `/api/resources/[id]/file` · `/api/contributions/[id]/file` | see rules | signed-URL redirects |
| `/api/cron/cleanup` | `CRON_SECRET` | retention job |

After login a **moderator lands on the moderation queue**, a **content admin on resources**, the **super admin on the
overview**, and students on their dashboard (a deep link into a protected area is honoured).
Navigation only contains sections the account may open, and each page/action re-checks on the server.

---

## Database

Migrations in `supabase/migrations/` (apply in order):

| File | Contents |
| --- | --- |
| `20261021000001_foundation.sql` | private schema, catalog, `profiles`, RBAC tables, single-super-admin index + presence trigger, settings, append-only `audit_logs`, authorization functions, Auth→profile triggers, seed roles/permissions |
| `…0002_content_tables.sql` | `contributions`, `contribution_revisions`, `contribution_flags`, `contribution_reviews`, `resources`, `upload_validations`, `bookmarks`, `notifications`, `user_preferences`, `attendance_courses`, `resource_reports`, `feedback` |
| `…0003_functions.sql` | all privileged `SECURITY DEFINER` RPCs (submit, review, approve, resource ops, roles, permissions, suspension, ownership transfer, bootstrap, settings, cleanup) |
| `…0004_storage.sql` | buckets and `storage.objects` policies |
| `…0005_rls_and_grants.sql` | RLS on every table, explicit grants, the Auth hook |
| `…0006_catalog_seed.sql` | branches and subjects, **generated** from `src/data/academicData.ts` |

Notes:

- Helper functions live in the non-exposed `app_private` schema; every `SECURITY DEFINER` function pins `search_path = ''`.
- All `EXECUTE` grants are explicit; the service-role-only functions (`bootstrap_super_admin`, `record_upload_validation`,
  `list_purgeable_files`, `mark_files_purged`) are not callable by `anon`/`authenticated`.
- `resources` exposes only listing columns to API roles; `created_by`, `published_by`, `source_contribution_id` and
  `storage_path` stay private, so a contributor's identity is never public unless they typed a public *credit*.
- Timestamps are `timestamptz` (UTC); the UI formats them in the viewer's locale.
- **The subject catalog is reference data.** To add or rename a subject, edit `src/data/academicData.ts`, run
  `npm run db:catalog`, and ship the result as a *new* migration for already-deployed databases.
- Types: `src/types/backend.ts` holds hand-written row shapes. Once the project is linked, generate full types with
  `npm run db:types`.

---

## Testing

```bash
npm test            # everything
npm run test:db     # Postgres: RLS / RBAC / workflow / storage / contract
npm run test:unit   # file sniffing, redirects, permissions, server pipeline, attendance maths
```

`tests/db` runs the **real migrations** on PostgreSQL 18 (PGlite, in-process, no Docker) with minimal stand-ins for
Supabase's `auth` and `storage` schemas and roles, switching to the `anon`/`authenticated` roles exactly like PostgREST does.
It covers, among others: students cannot escalate roles or write privileged tables; a second super admin is impossible;
the super admin cannot be removed outside a transfer; content admins cannot grant themselves permissions; moderators cannot
reach admin areas; pending/rejected files and contributions are private; self-review is impossible; approval creates
exactly one resource and a repeat changes nothing; resubmission keeps history; storage policies block foreign paths, bad
file names, overwrites and deletion of live files; the email-domain restriction; audit-log immutability; retention
candidates; per-user data isolation (bookmarks, notifications, attendance, preferences); and a **contract test** that checks
every `.rpc()` call, table and bucket used in `src/` against the real schema.

---

## What is verified, and what is not

| Area | Status |
| --- | --- |
| Schema, RLS, RPCs, storage policies, workflows | **Verified locally**: run against real PostgreSQL with the actual migrations; mutation-checked (deliberately weakening six protections makes tests fail) |
| File sniffing, URL/redirect validation, permission model, server upload/approval pipeline | **Verified locally** (unit tests, with crafted ZIPs and faked storage/RPC clients) |
| Production build, lint, type-check, hydration, responsive layout, "not configured" and "backend unreachable" states, proxy redirects, callback error handling, cron auth | **Verified locally** in a real browser/server |
| **Live Google OAuth, Supabase Auth cookies/session refresh, PostgREST query shapes (embeds), Storage API (signed URLs, cross-bucket copy), the Auth hook, signed-in UI against real data** | **Not tested**: no Supabase project or Google credentials exist in the authoring environment. Implemented, but you must run the [manual checklist](#manual-checklist-what-only-you-can-do) to confirm them |
| Applying the migrations to a **hosted** project (creating policies on `storage.objects` and triggers on `auth.users` as `postgres`) | standard Supabase practice, but not run here; check the SQL Editor output the first time |
| `supabase/config.toml` (local CLI) | written without running the CLI; unverified |
| Generated DB types | not generated (needs a linked project); `npm run db:types` is provided |

---

## Known limitations

- **No malware scanning.** Files are accepted only if their *content* matches an allowed format (macro-enabled Office files,
  executables, scripts, HTML/SVG and archives are rejected), but they are not antivirus-scanned. Add a scanner if you accept
  other formats.
- **DOCX/PPTX have no in-browser preview** (download only); PDFs and images preview inline.
- **Concurrency:** approval is serialised with a row lock and a unique constraint, but the tests run on one connection, so
  true parallel-moderator races are covered by design, not by a concurrent test.
- **Rate limits** exist per student (open submissions, daily submissions, feedback). There is no IP-level limiting;
  configure Supabase Auth rate limits / Vercel firewall for that. Download counts are incremented by any visitor.
- **Notifications are in-app only** (no email).
- **Published-resource lists are fetched per request** (not cached); add `use cache` with tags if you need more speed.
- **Existing accounts when the email domain is restricted later** are blocked from writing (staff exempt) but are not deleted.
- Prototype admin tabs that were non-functional mock-ups (bulk CSV import, "registry", calendar publishing) were removed
  rather than left looking real. The calendar page itself is unchanged.
- If a custom subject isn't in the catalog, students can't submit for it (the old free-text "Other" option can't satisfy the
  `subjects` foreign key); add it to the catalog instead.

---

## Project history

Pairprep started as a frontend prototype (static data, "Milestone 2" placeholders). The demo resources, fake sign-in form,
fake admin queue and fake feedback form have been replaced by the real backend described above; the academic calendar,
GPA/CGPA/attendance/timer tools, practice questions and navigation are preserved.
