# Application review — 11 November 2026

## Implemented fixes

- Session isolation: requests started before logout/session reset cannot restore the previous user's cached profile or overwrite local storage. Old requests also cannot clear a newer pending request. Added race-condition regression coverage.
- Forum performance: category statistics use one grouped query instead of twelve queries across six categories. Empty categories remain visible and counts remain numeric.
- Forum correctness: reject negative, fractional, nonfinite and unsafe pagination before querying the database, and limit page sizes to 100. Added regression coverage.
- Assessment navigation: remount the assessment when the lesson changes so the previous quiz's attempt and answers do not persist into the next quiz. Added a navigation regression test.
- Question-bank routing: add the missing admin edit route used by the shared editor's role-aware links, reusing the existing editor and its authorization rules.
- Lesson loading: split the renderer, including its code editors and language parsers, out of the lesson page's initial bundle. Final bundle savings have not been measured because the final production build cannot download fonts.
- Password lookup: bound the external breach lookup to five seconds; replace live-network unit tests with deterministic breach/safe responses.
- Build quality: restore TypeScript and ESLint checks during frontend production builds. Fix the JSX comment lint error in the exam question editor.

## Verification

- Backend: 15 suites passed, 185 tests passed, 18 tests skipped; production build passed.
- Frontend: all 7 suites / 26 tests passed after the renderer change; the lesson suite subsequently passed all 9 tests including the new assessment-switch regression (27 frontend tests in total).
- Frontend TypeScript check passed, including the session and lesson changes.
- Frontend lint with `--quiet` passed. Existing warnings include hook dependencies, `prefer-const`, and TypeScript suppression comments. Those warnings are not fixed by this review.
- Initial frontend production build passed, exposing a 529 KB first-load lesson route. Final builds fail because `next/font/google` cannot resolve/download Inter and Source Serif 4 from fonts.googleapis.com. This remains an external build dependency; fonts and typography were preserved.

## Remaining coverage gaps

This review does not certify every feature end to end. Existing automated tests cover selected learning, assessment, exam, authorization and compiler logic, rather than every route and role.

- The backend e2e suite currently checks only the root greeting. Real login, role switching, organization isolation, course creation/approval/enrollment, question-bank imports and edits, exam submission, grading, uploads and forum flows still need browser/API integration coverage against an isolated test database.
- Docker integration tests are skipped in the existing test setup; live code execution, runner images and queue infrastructure still need verification.
- No production database, deployed service or customer records were changed for verification.
- Runtime latency and user-facing loading improvements require measurement against a running environment; query-count reduction and code splitting are structural improvements, not measured latency claims.
- Consider vendoring the exact current font files and using `next/font/local` so builds do not require Google Fonts availability.
