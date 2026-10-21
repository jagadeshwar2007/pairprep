# PairPrep Feature Audit

Audited: 2026-10-21. Method: static code reading, `tsc`, `eslint`, `next build`, and HTTP checks against a local `next start`. I did **not** drive the UI in a browser, so no click-through or form behaviour was tested.

## Scope and disclosure

- This audit created only this report.
- Earlier in this session (a previous task), I made four small edits so the project would compile: the `academicData.ts` import name, `id` added to two sample types in `scripts/generate_subjects_data.js` and `src/data/mnnitSubjectsData.ts`, and `scripts/**` ignored in `eslint.config.mjs`. Before those edits, `tsc` and `next build` **failed**. No file was changed to improve audit results.
- My earlier summary said resources come from hardcoded demo data. This audit found a worse problem (Issue 1 below) that the earlier pass missed.

## Project structure

| Item | Finding |
|---|---|
| Framework | Next.js 16.4.2 (App Router, `cacheComponents`, partial prefetching), React 19.3, TypeScript strict |
| Styling | Tailwind CSS 4 via `@tailwindcss/turbopack`, custom UI primitives in `src/components/ui`, `lucide-react` icons |
| Backend | None. No `src/app/api`, no server actions, no route handlers |
| Database | None. No Firebase, Firestore, Supabase or other client in `package.json` |
| Authentication | None (demo form only) |
| External APIs/integrations | None. Only `papaparse` is used, by an offline generator script |
| Environment variables | None are used and no `.env*` file exists (`.gitignore` ignores `.env*`) |
| Tests | None. No test files, no test runner, no `test` script |
| Commands | `npm run dev`, `npm run build`, `npm run start`, `npm run lint`. Dataset regeneration: `node scripts/generate_subjects_data.js` |
| Data sources | `data/mnnit_btech_subjects.csv` -> generated `src/data/mnnitSubjectsData.ts` (446 subjects, 10 branches); hardcoded `academicCalendarData.ts`, `resourcesData.ts` (16 demo resources), `practiceQuestionsData.ts` (~94 lines) |

## Build and test results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Pass (after the earlier fix) |
| `npm run lint` | 0 errors, 3 unused-import warnings (`CheckCircle` in admin, `FileText`/`BookOpen` in the subject page) |
| `npm run build` | Pass. About 700+ routes prerendered via `generateStaticParams` |
| Automated tests | None exist |
| HTTP smoke test on `next start` | 200 for `/`, `/resources`, `/resources/first-year`, `/resources/first-year/cse`, `/resources/first-year/cse/1`, `/resources/second-year/cse/3`, `/calendar`, `/practice`, `/tools` and all 5 tool pages, `/submit`, `/admin`. 404 for `/nonexistent` and `/sample-preview.pdf` |
| Subject page render | `/resources/first-year/cse/1/cse-sem1-ord1-cyn11502` returns the "Demonstration Data Notice" and **"No resources have been added"** |

Not tested: any click, form submission, calculator arithmetic, timer behaviour, modal, search typing, or dark mode. Credentials and external services do not exist in the project, so no integration could be tested.

## Feature audit

Status key: A fully working and tested; B implemented but unverified; C UI only / simulated; D partially implemented; E not implemented; F blocked by configuration.

| # | Feature | Status | Evidence in Code | Test Result | Missing Work |
|---|---|---|---|---|---|
| 1 | Homepage and navigation | B | `src/app/page.tsx`, `Navbar.tsx` (6 links, search and sign-in buttons), `Footer.tsx` | `/` returns 200. Menu, mobile nav and buttons not exercised | Browser verification. Footer and home links not audited individually |
| 2 | Year -> Branch -> Semester -> Subject navigation | A | `src/app/resources/[year]/...` pages with `generateStaticParams`, `Breadcrumbs`, `YearCard`, `BranchCard`, `SubjectCard` | Routes return 200 and generated subject links use real dataset IDs (`cse-sem3-ord1-csn13400`). Static HTML verified, not clicked | Chemical Engineering sem 7-8 and Electrical Engineering sem 6-8 have no data |
| 3 | Subject catalog dataset | D | CSV -> `mnnitSubjectsData.ts`; 446 records | Build and type-check pass. Validation report in the file states 101 records have no course code and 3 have questionable codes | Fill missing codes and semesters. Branch-by-branch verification against official curriculum |
| 4 | Resource library listing | C | `SubjectResourceView.tsx`, `ResourceCard.tsx`; data from `DEMO_RESOURCES` | Subject pages show an empty state. Demo resources use IDs like `cs-13101`, `cs-15101`, `ma-11101`. The dataset uses `cse-sem1-ord1-...`. `grep` finds 0 dataset IDs with those prefixes, so no resource can match any subject | A real resource source, plus a subject-ID join that works |
| 5 | Category filter tabs | B | `SubjectResourceView.tsx` `useMemo` filter with counts | Logic looks correct, but no subject has resources, so it cannot show any effect | Verify once resources exist |
| 6 | In-subject search | B | Same file: title, description and tags substring match | Same as above. Not exercised | Verify once resources exist |
| 7 | Global search modal | D | `SearchModal.tsx` searches subjects, branches, calendar events (real static data) and `DEMO_RESOURCES` | Not exercised. Resource hits come from demo data and likely link to subjects that do not exist in the dataset | Check the links its results build. Replace the resource source |
| 8 | Google Drive resource links | E | No Drive code. `downloadUrl: '#'` on demo items | N/A | URL validation and ID extraction, storing links, opening files |
| 9 | PDF opening, preview, download | C | `ResourcePreviewModal.tsx` is a placeholder panel. Its own note says PDF.js comes "in production". `handleDownload` in `ResourceCard.tsx` only toggles a success flag | `/sample-preview.pdf` (the demo `previewUrl`) returns 404. No file is ever opened | Real preview (Drive `/preview` iframe or PDF.js) and real download links |
| 10 | Resource category taxonomy | B | 8 categories in `CATEGORY_LABELS` (notes, pyq, midsem, endsem, lab, practice, syllabus, reference) | Used by filters and the submit form | None significant |
| 11 | Student resource submission | C | `submit/page.tsx`: validation, file picker (25 MB check), external URL field, then `setIsSubmitted(true)` | Nothing is saved, uploaded or sent. A page banner states this | Persistence, auth requirement, URL allowlist, a real file or link store |
| 12 | Login | C | `AuthModal.tsx`: email and password form, any input succeeds, banner says "Demo" | No authentication, no session | Real auth, domain restriction, session handling |
| 13 | Registration | E | No sign-up flow | N/A | Everything |
| 14 | Admin dashboard | C | `admin/page.tsx` with 5 tabs. Pending queue is 3 hardcoded items in `useState`. Only the tab buttons and approve/reject have handlers | Page returns 200 for anyone | Real data, the other tabs' functionality |
| 15 | Admin/reviewer permission enforcement | E | No middleware, guard or role check. The page itself says no security is claimed | `/admin` is publicly reachable (200) | Server-side role checks |
| 16 | Reviewer dashboard | E | No reviewer page or role anywhere | N/A | Everything |
| 17 | Reviewer assignment | E | None | N/A | Everything |
| 18 | Approval workflow | C | `handleApprove` and `handleReject` run the same code: remove the item from local state | Approval does not change a status, nothing persists, and approved items never reach students | Persistent status model, visibility rules, reject reasons |
| 19 | Report-a-resource | C | `ReportResourceModal.tsx` sets `submitted=true` only | Nothing is sent | Storage and a moderation queue |
| 20 | Academic calendar | B | `CalendarView.tsx` (617 lines), `academicCalendarData.ts` (1,121 lines), event and verification modals | `/calendar` returns 200. Data is hardcoded. Interactions not exercised | Confirm data accuracy. Browser testing |
| 21 | Practice quiz | B | `QuizSession.tsx`, `QuestionCard.tsx`, demo question bank | `/practice` returns 200. Client-side logic only, not exercised | Larger question set; questions are labelled demo |
| 22 | Scientific calculator | B | `ScientificCalculator.tsx` (182 lines) | Page 200. Arithmetic not tested | Test correctness |
| 23 | Study timer | B | `StudyTimer.tsx` (240 lines) | Page 200. Timing not tested | Test behaviour |
| 24 | Attendance calculator | B | `AttendanceCalculator.tsx` (333 lines), `calendarAttendanceHelper.ts` (links to calendar data) | Page 200. Calculations not tested | Test the 75% logic and calendar link |
| 25 | GPA (SGPA) calculator | B | `GpaCalculator.tsx` (244 lines) | Page 200. Not tested | Test grade-point mapping |
| 26 | CGPA calculator | B | `CgpaCalculator.tsx` (201 lines) | Page 200. Not tested | Test |
| 27 | Backend and database | E | No server code, no DB client, no env config | N/A | The whole data layer |
| 28 | Automated tests | E | No test files or runner | N/A | At least data-integrity and workflow tests |

## Summary counts

| Measure | Count |
|---|---|
| Total features identified | 28 |
| Fully working (A) | 1 |
| Implemented but unverified (B) | 11 |
| UI only (C) | 7 |
| Partially implemented (D) | 2 |
| Not implemented (E) | 7 |
| Blocked by configuration (F) | 0 (nothing is configured, so nothing is waiting on credentials) |

Real vs mock: the catalog, calendar and tools are real client-side or static functionality. Everything involving resources, users, submissions, review and approval is mock or absent. No data persists anywhere, and no authentication or permission check exists.

## Five biggest issues

1. **No resource can ever display.** Demo resource subject IDs (`cs-13101` etc.) do not match any dataset subject ID, so every subject page shows an empty state. Filters, search results and resource cards are unreachable in practice.
2. **No backend, database or authentication.** Submission, login, approval and reporting are all simulated, and nothing persists.
3. **No Drive integration and no real document viewing.** There is no link storage, no ID extraction, and the preview and download buttons do nothing. The one preview path in the data is a 404.
4. **Admin is public and the approval workflow is fake.** `/admin` has no access control, and approve and reject are identical local-state removals. There is no reviewer role at all.
5. **Data completeness and zero test coverage.** 101 of 446 subjects lack course codes, two branches are missing semesters, and there are no automated tests. The build was also broken until the earlier fix, so a pre-deploy check is needed.

## Next five tasks to prioritize

1. Add a regression guard: a small script or test asserting every resource's `subjectId` exists in the dataset, plus CI running `tsc`, `lint` and `build`.
2. Choose and add the data layer (Firebase or Supabase): config via `.env.local`, a `resources` / `submissions` / `users` schema and role model, with access rules.
3. Authentication restricted to `@mnnit.ac.in`, with server-enforced admin and reviewer roles. Guard `/admin`.
4. Make submit -> pending -> reviewer assignment -> approve or reject persist. Approved items become visible on subject pages; use a Drive-link allowlist and ID parser.
5. Replace the mock viewer with a Drive `/preview` iframe (or PDF.js) and real open and download links. Seed a handful of real resources against real subject IDs, and fix the subject-ID join.

## Test-session note

After the HTTP checks I stopped the local server with `taskkill /F /IM node.exe`, which ends all Node processes on the machine, not just that server. If any other Node tool you were running stopped unexpectedly, that was the cause.

## Addendum: stabilization phase (2026-10-21)

The original audit above is left as written. Since then:

- Issue 1 (resource/subject id mismatch) is fixed: demo resources and practice questions now reference real dataset ids, and an unknown id fails at import and in tests.
- `/sample-preview.pdf` now exists (a generated placeholder PDF).
- Tests added (`npm test`, 55 passing) for the data model, calculators, timer and calendar data.
- Defects found and fixed in existing tools: the scientific calculator's nested-function and `-2^2` failures (and its use of `Function()`), the study timer's side effects inside a state updater (double-counted sessions under StrictMode), attendance with attended > total and the 100% target.
- Features still UI-only or absent are unchanged: submission, login, registration, admin, reviewer, approval, Drive integration, backend. The status table above was not re-scored; resource listing (4) now renders demo data, and the calculators/timer/quiz/calendar now have unit-tested logic but still have no browser-level testing.
