# Phase 3 readiness: backend and authentication

State after the Phase 2 redesign. No backend, auth or Drive code exists yet; this lists where those pieces should plug in.

## Where each integration attaches

| Need | Current placeholder | What to change |
|---|---|---|
| Resource data | `DEMO_RESOURCES` in `src/data/resourcesData.ts`, imported directly by `src/app/page.tsx`, the semester page, the subject page, `SearchModal` and `ResourceLibrary` | Introduce one data-access function and replace those 5 imports. Library filtering/sorting is already pure (`src/lib/library.ts`) and works on any `ResourceItem[]`, so it can run on server results unchanged |
| Document viewing (Drive) | `getViewerSource` in `src/components/resources/ResourceViewer.tsx` (only same-site PDFs) | Add a `kind` for Drive and a branch in `getViewerSource`. The dialog, card and layout around the viewer do not change. Validate Drive URLs on the server and keep the iframe sandboxed |
| Real vs demo | `isDemo` flag, `DemoBadge`, demo notices | Real resources set `isDemo: false`. The home page "Recently added" section already shows only non-demo items; a resource should also carry a verified status before the UI claims "verified" |
| Sign in | `AuthModal` is an honest placeholder with no credential fields | Replace its body with the provider's sign-in flow. `Navbar` already opens it from the header and mobile menu |
| Contribute | `src/app/submit/page.tsx` validates client-side only and says nothing is saved | Wire `handleSubmit`. The form, validation messages and success view exist |
| Reports | `ReportResourceModal` says reports are not stored | Wire `handleSubmit` and drop the "preview" notices |
| Admin | `src/app/admin/page.tsx` is a local-state prototype, publicly reachable | Needs server-side role checks before anything real sits behind it. Not redesigned in Phase 2 |
| Notifications | `ToastProvider` / `useToast` already mounted in the root layout | Use `notify()` for save/approve/error feedback |

## Things to decide before storing data

- **Subject ids embed the CSV row order** (`cse-sem2-ord4-...`). Persist them only after deciding whether reordering the CSV must keep ids stable (see `docs/DATA_QUALITY.md`).
- **Library URL state** (`?q=&branch=&year=&semester=&subject=&type=&sort=`) is client-side. If results move to the server, `parseFilters` / `serializeFilters` can be reused as the contract.
- **Library page is client-rendered inside a Suspense boundary** (needed for `useSearchParams` on a prerendered route), so its first paint is a skeleton and it needs JavaScript. Server-rendering results would fix both.
- **Data-quality gaps** (missing codes, incomplete semesters) are listed in `docs/DATA_QUALITY.md`.

## Not covered by automated tests

The Phase 2 browser checks (below) were run with a throwaway script and are not in the repository. If Phase 3 is going to change these flows, consider adding Playwright to the project first.
