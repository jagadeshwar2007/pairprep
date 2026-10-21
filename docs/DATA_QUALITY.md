# Data quality notes

Status as of the stabilization phase (2026-10-21). Nothing here has been "fixed" by deleting or guessing data; items are recorded so they can be resolved against the official sources.

## Subject dataset (`data/mnnit_btech_subjects.csv` -> `src/data/mnnitSubjectsData.ts`)

The generated file is the source for 446 subjects. Regenerate with `node scripts/generate_subjects_data.js`; never hand-edit the `.ts` file.

| Issue | Detail | Handling |
|---|---|---|
| Missing course codes | 101 records have no code (`hasMissingCode`). Ids fall back to a title slug | Kept. Needs the official codes |
| Questionable codes | 3 records: `cse-sem1-ord6-cs12105` (probable typo for `CSN1xxxx`), `cse-sem2-ord5-csn12101` (title duplicated as printed in source), `ee-sem1-ord3-ma-1101` | Kept, flagged via `isQuestionableCode`. Needs verification against the source circular |
| Incomplete semesters | Electrical Engineering has data only for semesters 1-5. Chemical Engineering has none for semesters 7-8. Several branches list a single subject for semester 8 (CSE, ECE, CE, ME, PIE, Biotech, ECM, Materials) | Kept as-is; the UI shows what exists |
| Duplicate course codes | 8 records share a code with another record in the same branch and semester | Kept; ids stay unique because they include `ord` |
| Same-title pair | CSE semester 2 lists "Data Structures" twice (`CSN12401`, `CSN12101`), identical L-T-P | Kept. Demo resources attach to `CSN12401`; this choice is arbitrary until the pair is understood |
| Zero credits | 1 record has credits 0 | Kept |
| Id stability | Ids embed the CSV `order` (`cse-sem2-ord4-...`). Reordering rows in the CSV changes ids and will break anything that stores them | Do not reorder rows. Persist ids only after this is addressed |

The validation summary embedded in `mnnitSubjectsData.ts` (`MNNIT_SUBJECTS_VALIDATION_REPORT`) hardcodes the "incomplete semesters" list in the generator; it is not computed from the data. Treat it as a note, not a check. The table above was computed directly from the data.

## Resources (`src/data/resourcesData.ts`)

- All 16 entries are **demo placeholders**: titles start with `[Demo]`, `isDemo` is true, `verified` is false, `downloadsCount` is 0, and descriptions say no real file is attached. They point at `/sample-preview.pdf`, a generated one-page PDF that states it is a placeholder.
- Some demo titles read like real exam papers ("Midsem Exam Paper 2024", "5-Year PYQ Question Bank"). They have no content behind them, but should be renamed or removed before launch so students are not misled.
- Seeds hold only `subjectId` plus resource fields. Subject name, code, branch, semester and year are looked up from the dataset in `hydrateResource`, so they cannot drift. An unknown `subjectId` throws at import time and is also checked by `tests/resourceData.test.ts`.
- Earlier versions used invented ids and course codes (`cs-13101`, `CS13101`, ...) that exist nowhere in the dataset. They were remapped to real subjects by title (Data Structures, Operating System, Database Management System, Mathematics-I, Physics, Engineering Thermodynamics). Semester placement therefore changed to match the catalog (for example Data Structures now appears in CSE semester 2, not 3).
- `uploadedAt` dates on demo entries are arbitrary placeholders.

## Practice questions (`src/data/practiceQuestionsData.ts`)

- 5 sample questions across Data Structures, Operating System and Mathematics-I. They are generic concept questions, not institute papers. The set is too small to be useful beyond a demo.
- Question content has not been independently fact-checked.

## Tools and calendar

- **Grading scale** (A+ 10, A 9, B+ 8, B 7, C 6, D 4, F 0) and the **attendance rule** (75%, 65% with approval) are assumptions shown in the UI banners; they are not verified against the official MNNIT ordinance.
- **CGPA to percentage** uses x 9.5, labelled in the UI as an estimate. The multiplier is not verified.
- **Calendar** (`academicCalendarData.ts`): events were transcribed from a circular. Tests confirm dates are valid, ordered, unique and inside the displayed window, and that class start/end and mid/end-semester events are found. They do not confirm the dates match the circular. Some events carry `Needs Manual Verification`.
- **Study timer**: the `longBreak` mode exists but is never entered automatically (no every-4th-session logic).
- **CGPA calculator**: after a semester is removed, adding one numbers it `length + 1`, which can duplicate a semester number.

## Not part of this phase

No backend, auth, persistence, Drive integration, or real submission/approval exists yet. The submit form, admin queue, report modal and sign-in modal are still UI simulations (see `PAIRPREP_FEATURE_AUDIT.md`).
