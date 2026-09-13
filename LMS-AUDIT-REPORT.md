# LMS End-to-End Audit Report

## Fixed

- Exam attempts now parse per-language `codeSnippet` JSON and map `Python` / `C++` / `JavaScript` keys to the runtime editor language.
- Competitive-programming starters (`input()` / `cin` / `scanf` / `Scanner` / Node stdin) replaced `sys.stdin` templates in practice IDE, `GET /compiler/languages`, and question-bank defaults. Java class is `Main`; version label is Temurin 17.
- Language switch on an exam loads that language’s starter when the student has not edited the current buffer. Reset uses the same helper.
- Practice `POST /compiler/run` jobs stay isolated: no `attemptId`, so they never appear in `hasPendingJobs(attemptId)`.
- Server attempt payload includes `remainingSeconds`. The exam timer resyncs from GET every 20s. Failed TIMER submit retries after 4s. TIMER / TAB_SWITCH skip the client 60s×N wait; the backend waits up to 45s then always finalizes.
- Manual submit still blocks with a 409 while coding jobs run. Submit uses `UPDATE … WHERE status = IN_PROGRESS`. The third tab switch submits on the server. `BroadcastChannel` keeps one tab as leader.
- Attempt deadline is capped by `exam.endAt`. GET attempt still auto-submits when the deadline has passed.

## UI

- `role-foundation.css` is imported from the root layout. Student sidebar / portal / page-content share a 256px width.
- Exam list, instructions, and results use the student portal shell. The attempt workspace stays fullscreen.
- Coding workspace is a split problem | editor + input | output layout with token surfaces; Monaco stays `#1e1e1e` so the editor does not blend into the page.
- The exam header timer stays visible. Practice IDE has a Dashboard back link and token chrome.
- Exam create explains Section A (MCQ) / Section B (coding) only. Question Manager shows a per-language starter badge and does not expose hidden cases.
- Question-bank create/edit headings use role text tokens instead of `text-white` on light theme.

## Compiler

- Docker sandbox is unchanged: `docker run -i`, `--network none`, `--cap-drop ALL`, `--read-only`, `--user 1000:1000`, 64KB output, 5s case timeout. No runtime wrappers.
- Practice and exam jobs share the same queue and sandbox. Exam scoring only uses `POST /student/exams/attempts/:id/code`.
- Hidden case I/O and expected answers are not returned to students.

## Timer

- Authoritative clock: `deadlineAt` + `serverTime` + `remainingSeconds`.
- Heartbeat GET triggers server TIMER submit if the deadline has passed (not client-only).
- TIMER / TAB_SWITCH: 45s job wait, then finalize. Manual: 15s wait, then 409 if still running.
- Row-lock submit stops double scoring across tabs.

## Security

- Sandbox isolation was not relaxed. Concurrency stays at 1.
- Students never receive hidden cases or expected outputs. Exam starters are student-editable source only.

## Tests

- `ExamStudentService` specs: `endAt` cap, remaining seconds floor, TIMER finalize while jobs pending, manual 409, duplicate submit, third tab-switch server submit.
- Compiler spec: practice jobs do not count toward `hasPendingJobs(attemptId)`.
- Existing starter-code unit spec and Docker integration stdin spec remain the source of truth for `input()` + piped stdin.
- Live Docker (29.1.3): Python, C, C++, Java, and Node each doubled stdin `21` to `42`.

## Remaining

- Full exam-session timer auto-submit still needs a live attempt against the compose database (`DATABASE_URL` host `db`). Compiler stdin for C/C++/Java/Python/Node was reproduced on this machine with Docker 29.1.3.
- Compiler queue concurrency is still 1; raising it for 100 simultaneous students is out of scope.
- Nest stays on TypeScript 5.9. The unused Flask `compiler/` folder was not deleted.
- Assignment submission hub, broadcast inbox, and academic calendar were not added.
