# EduVerse LMS — product and engineering audit

Date: 8 September 2026. Phase 1 of the supplied transformation brief.

## Decision

Preserve the Next.js frontend, NestJS backend, PostgreSQL database, course hierarchy, authoring tools, question bank, and enrollment flow. Extend them through shared policies and services. A full rewrite would discard useful functionality and risk the legacy data that this audit discovered.

The system is **not production-ready**. The previous course-learning repair is a useful baseline, but passing those tests does not establish complete security, academic functionality, accessibility, or launch readiness.

This audit made no application-source or database changes. This document is an audit deliverable. Database inspection was limited to schema/index/constraint metadata inside read-only transactions. Security findings are based on source inspection; unauthorized access was not exercised against live personal records.

## Evidence and coverage

- Inspected the route inventory, shared UI, themes, learning/course components, authentication, role controllers, question/assignment editors, backend services/entities, compiler variants, migration/configuration files, and existing test/build evidence.
- Inventory: **69 frontend pages**, **20 backend controllers**, **20 entity files**, and **31 live public database tables**. These counts are not equivalent because join tables and legacy structures also exist.
- `app/globals.css`: **3,233 lines**, approximately **90 KB**, with **87 `!important` declarations**. There are three competing navigation implementations: `components/layout/Sidebar.tsx`, `StudentReferenceShell.tsx`, and the inline student dashboard shell.
- The previous verified baseline remains: both builds passed; 17 backend and 5 frontend tests passed; authorized API checks covered all four roles; the approved test student completed the 10-lesson course and received one certificate entry. See [WORKFLOW_VERIFICATION.md](WORKFLOW_VERIFICATION.md).
- Browser automation failed to initialize during the previous verification and its retry. **Every-page manual desktop/mobile review has not been completed.** Contrast figures below are calculated from source-defined colors, not a substitute for rendered-browser accessibility testing.

## 1. Architecture and preservation map

| Layer | Current implementation | Preserve / change |
| --- | --- | --- |
| Frontend | Next.js 14 App Router, React 18, TypeScript, Tailwind, next-themes, axios and fetch | Preserve routes and framework. Add shared session/layout/state primitives; keep raw requests behind consistent typed clients. |
| Authoring | Notebook cells, Markdown, rich-content JSON, quiz/assignment/programming lesson editors, PDF/presentation upload | Preserve content formats and editor reuse. Introduce versioned adapters and separate learner execution from authoring definitions. |
| Backend | NestJS modules, controllers directly using TypeORM repositories, global validation/exception handling, JWT role guard | Preserve modules. Move duplicated authorization and transitions into tested services/policies. Use actual DTO classes and safe response projections. |
| Database | PostgreSQL/Neon, college ownership and course assignments, several legacy academic tables | Map and reconcile existing schema before migration. Use explicit migrations; do not run schema synchronization against the shared database. |
| Files | Cloudinary and local `/uploads`, PDF.js, synchronous presentation conversion | Preserve existing file references. Add private student-submission storage, ownership checks, validated uploads, and queued conversions. |
| Compiler | Two separate Flask/Docker implementations | Choose one worker implementation and harden it before integrating execution/grading. Do not expose an unauthenticated executor. |
| Tests | Targeted unit/component tests and an e2e file that only checks the root greeting | Preserve the useful tests; add isolated role/tenant lifecycle and browser coverage. |

The course hierarchy is `Course → CourseModule → Chapter → Lesson`, although some UI labels call the first two levels “Chapter” and “Module.” Preserve identifiers and storage relationships while settling one user-facing terminology. Do not casually rename database entities to match labels.

Some admin/super-admin routes already re-export instructor editor pages. That is useful reuse, but the shared implementation should live in feature components rather than importing another role's route module. Use explicit capabilities and route context.

## 2. Release-blocking security and integrity findings

| Priority | Finding and consequence | Evidence | Required correction |
| --- | --- | --- | --- |
| P0 | User password hashes and private profile fields are selected by default and can be returned through full instructor/approver/forum-author relations. | `entities/user.entity.ts:32`; `courses/courses.controller.ts:279–285,347,436`; `forum/forum.service.ts:38,60,72,78` | Exclude sensitive fields by default, select the password only in authentication, and return allowlisted public/user DTOs from every relation. Add recursive payload-exclusion tests. |
| P0 | Admin approve/reject and course-distribution routes do not consistently enforce course college ownership. | `admin/admin.controller.ts:223,284`; `courses/courses.controller.ts:1003–1030` | Centralize course mutation policy. Separate managing one's college from platform-wide distribution. Test same-college, cross-college, assigned-course and owner cases. |
| P0 | Authenticated direct lesson/chapter/module reads bypass enrollment, publication and college rules. Published course detail also exposes full content rather than a public curriculum summary. | `lessons/lessons.controller.ts:72–84`; `chapters/chapters.controller.ts:59–65`; `modules/modules.controller.ts:88–108`; `courses/courses.controller.ts:347,389` | Separate catalogue DTOs from learner content. Apply one content-read policy to every alternate route. |
| P0 | Credentialed CORS allows any `*.onrender.com` origin while production cookies use `SameSite=None`; no explicit mutation-origin/CSRF protection was found. | `main.ts:38–51`; `auth/auth.controller.ts:52–56` | Exact trusted-origin allowlist and explicit cookie-mutation protection. Verify legitimate frontend, disallowed origin, missing/invalid token and logout behavior. |
| P0 | Suspension, deletion and role changes are not reflected in existing JWT authorization; login does not check active account status. | `auth/auth.service.ts:74–98`; `common/jwt.strategy.ts:27–35`; `auth/auth.module.ts:25` | Validate current account/session state and implement revocation/rotation policy. Test suspended users, demotion, reassignment and revoked sessions. |
| P0 | Server-side sanitization returns raw HTML, although client sanitization exists. | `lms-frontend/lib/sanitize.ts:10–15` | Sanitize before HTML reaches SSR output or prevent unsanitized HTML rendering. Verify hostile stored content in SSR and hydration. |
| P1 | Any published assessment or assignment lesson can be marked complete without a submission/pass result and counted toward a certificate. | `student/student.service.ts:157–228,55–74` | Preserve ordinary lesson completion; gate graded completion through server-owned evaluation policy. Migrate existing completion semantics explicitly. |
| P1 | Application-only duplicate checks and separate reward writes permit races. Live `progress` and `enrollments` have only primary-key indexes, with no student/lesson or student/course uniqueness. | Entity files; live index/constraint audit; `student/student.service.ts:180–228` | Audit duplicates, add composite constraints, make progress/rewards/issuance transactional and idempotent. Test simultaneous requests, not only sequential repeats. |
| P1 | Untyped/partial bodies bypass complete runtime validation and allow unsafe entity-property changes. | `chapters/chapters.controller.ts:70–79`; `question-bank/question-bank.controller.ts:321–352`; `forum/forum.service.ts:85–90` | Explicit mutation DTOs, immutable parent/tenant fields or destination authorization, bounded values and DTO-to-entity mapping. |
| P1 | Public signup can join a college by name or create an active college. | `auth/auth.service.ts:38–59` | Define and implement self-registration, invitation, verified domain or approval policy; college provisioning belongs to an authorized workflow. |
| P1 | Daily challenge exposes answer keys and grades in the browser; contests are globally mutable by admins. | `daily-streak/daily-streak.controller.ts:29–35`; student streak page `:52–71`; `contest/contest.controller.ts:54–113` | Student-safe question DTOs, server evaluation, persisted attempts/rewards, scoped exam audience and ownership. |
| P1 | PDF proxy accepts arbitrary upstream URLs; upload validation and access control are incomplete. Static route placement may also shadow the proxy. | `courses/courses.controller.ts:731–748,573–600` | Resolve routing safely, restrict schemes/hosts and redirects, bound timeout/size, validate bytes/MIME and authorize private assets. Do not turn a broken route into an open proxy. |
| P1 | Presentation conversion blocks the API and can create invented fallback slides. Import buffering is insufficiently bounded; advertised CSV/XLS support does not match the XLSX parser. | `courses/courses.controller.ts:820–922`; `question-bank/file-parser.service.ts:7–10,25,64` | Background conversion with durable status/errors; correct parsers and pre-buffer upload limits; never disguise failed conversion as course content. |
| P1 | Compiler endpoints are unauthenticated and run Flask debug mode. The root executor shell-interpolates stdin with weaker container restrictions than the second implementation. | `compiler/app.py`; `compiler/orchestrator.py:59–68`; `compiler/code_executor/` | Authenticated isolated worker, no network, non-root execution, CPU/memory/PID/time/output limits, safe stdin, server-owned test cases. |

P0 means a release blocker, not proof that exploitation has occurred. Findings were not validated by extracting hashes or accessing another tenant's private records.

## 3. Database audit: legacy academic data must be preserved

The live schema contains assessment infrastructure not represented in the current application entity/module inventory:

| Existing table | Observed structure | Integration decision |
| --- | --- | --- |
| `quizzes` | Duration, passing score, attempt limit, enum status, creator, live-exam schedule, JSON config | Candidate assessment definition. Inspect enum values and record usage before adapting lesson quizzes. |
| `quiz_questions` | Quiz/question links, marks, order | Reuse where compatible; preserve bank IDs and scoring representation. |
| `quiz_assignments` | College audience, assigner, scheduling fields, duration, attempt limit, config | Existing assessment distribution, **not** evidence of student coursework submission support. |
| `quiz_attempts` | Student, score, total marks, answers JSON, start/end/status/pass, attempt number, reset/security metadata | Candidate execution/history store. Audit state semantics, snapshots, timing and uniqueness before wiring. |
| `quiz_student_access` | Per-student access grants and grant metadata | Reconcile with enrollment/audience policy. |
| `exam_security_logs` | Attempt, student, quiz, college, event/duration/browser metadata | Existing exam-event structure. Define retention/privacy and actual supported behavior; do not add fake proctoring. |
| `course_topics`, `pages`, `page_templates` | Nested legacy content, JSON bodies, ordering/version/editor metadata | Preserve content and map its relationship to current lesson notebooks. |
| `organizations` | Legacy organization ownership; some live foreign keys still reference it | Reconcile organization/college compatibility before deleting or replacing anything. |

Foreign keys link the legacy quiz tables to questions, users and colleges. Current code absence does **not** mean those tables or historical data can be discarded. This pass read schema metadata, not historical quiz answers or personal records. Row compatibility, enum values and a migration dry run remain required before implementation.

There are no attendance, classroom-session, gradebook, notification, academic department/program/batch or student coursework-submission tables in the inspected public schema inventory. Introduce those only after resolving compatibility with the legacy structures above.

Use a registered migration workflow and backup/restore rehearsal. `synchronize: NODE_ENV === 'development'` is unsafe as a migration strategy for this shared schema because unrelated legacy tables/columns must remain intact.

## 4. UI, UX and accessibility audit

### Systemic causes

1. **Global utility overrides break color meaning.** `globals.css:951–1023` changes `.text-white` and several gray classes with `!important`. The learning viewer uses literal dark surfaces and these same classes. More page-specific overrides would make the problem harder to control.
2. **Theme mechanisms disagree.** `RootLayout` sets `data-theme`; Tailwind is configured with `darkMode: 'class'`. Six theme palettes coexist with many literal light/dark page colors. Token changes alone cannot fix pages that bypass the tokens.
3. **Three shells disagree on routes, widths, active states and features.** Sidebar widths and content margins vary between 220/236/246/260/320 pixels, with separate late overrides. Some mobile rules hide navigation without providing a complete replacement.
4. **Navigation promises nonexistent destinations.** “Assignments” goes to progress; “Calendar” goes to streak; one reusable sidebar still sends Certificates to profile. My Learning and catalogue are not distinct workflows. Use one role-aware navigation definition.
5. **Fake or inert UI undermines trust.** Search fields have no results workflow. Notification badges are fixed at 3/5, mark-all-read only hides a popup, and some calendar/control buttons have no useful effect. CourseCard displays a hard-coded 4.8 rating and fallback 12 lessons/8 hours (`CourseCard.tsx:122–129`).
6. **Desktop density is inconsistent.** Tiny 9–11px labels, large decorative artwork, card-heavy dashboards, many gradients/glows, mixed serif/sans headings and large corner radii compete with academic content.
7. **Error handling often treats failures as emptiness.** Course enrollment/filter/profile requests commonly only log or return empty data. Students need a clear error, retry, validation and preserved input.
8. **Interaction semantics are incomplete.** Clickable course-card `div` is not keyboard-operable; dialogs lack a common focus trap, restoration and labeling contract. UserDetailModal supports Escape but lacks full modal semantics. Theme menu lacks complete menu/selection keyboard behavior.
9. **PDF behavior has accessibility limits.** Canvas presentation needs document/text access alternatives; interception of selection, shortcuts and blur in SecurePPTViewer can obstruct legitimate use and is not asset security. Viewer loading depends on third-party CDN scripts and lacks full disposal of load/render resources.

### Source-calculated contrast examples

| Pair | Ratio | Result for ordinary text |
| --- | --- | --- |
| `#0f172a` text from the global override on `#0f172a` lesson/sidebar surface | 1.00:1 | Invisible if this cascade applies. |
| Dark-theme muted `#64748b` on surface `#1e293b` | 3.07:1 | Below 4.5:1. |
| Reference active-nav `#15122c` on gradient endpoints `#4b43f1` / `#a32ced` | 2.92:1 / 3.59:1 | Below 4.5:1 at both ends. |

WCAG's ordinary-text minimum is 4.5:1; large text has a 3:1 minimum. Check rendered placeholders, hover/selected/error states as well as default text. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). Fixed headers and drawers must also leave keyboard focus visible. [W3C focus visibility guidance](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

### Proposed design system, before page work

- Preserve EduVerse identity with a restrained indigo primary, neutral surfaces and a small set of semantic status colors. No random per-card palette or gradient requirements.
- Define semantic tokens: canvas, surface, raised surface, text, secondary text, muted text, border, primary/on-primary, success/warning/danger/info pairs, hover, selected, focus and disabled. Keep inverse learning/nav surfaces explicitly scoped.
- Candidate accessible pairs: white on primary `#4338ca` is 7.90:1; muted `#566274` on white is 6.19:1. These are initial pairs, not certification of every theme/state.
- Use one readable type family, a limited type scale, 4/8-based spacing, modest radii and borders. Prefer sections, tables, lists and contextual panels; reserve cards for independent course summaries or meaningful grouped tasks.
- Build shared Button, Field, Select, Alert, EmptyState, Skeleton, StatusBadge, Table, Dialog, Tabs, Pagination and Shell contracts. Each needs keyboard/focus/error/loading behavior, not just CSS.
- Keep a full-width focus-mode learner view, a collapsible accessible mobile drawer, and one consistent desktop shell. Tables need deliberate narrow-screen behavior, not global scaling.
- Preserve existing theme choices through semantic mappings and verify them. Do not delete working user preferences simply because light/dark are easier to test.

## 5. Product capability matrix

| Requested area | Status | Completion work |
| --- | --- | --- |
| Authentication / accounts | Working login baseline; incomplete account/session lifecycle | Active-status enforcement, revocation/reset/verification policy, shared frontend session handling. |
| RBAC / permissions | Four roles and useful policy helpers; inconsistent resource scope | One server policy per resource/action with negative tenant tests. Do not permit admin privilege escalation. |
| Student dashboard | Real course progress plus decorative/synthetic sections | Make resume/next deadline primary; remove fabricated notifications, scores, rankings and events. |
| My Learning | Course catalogue and progress screens exist | Dedicated not-started/in-progress/completed/saved/recent hub, with server pagination/filtering and actual saved/recent state. |
| Discovery | Basic search/category/level/pagination | Sorting/filtering must operate on the full result set. Current enrolled filtering/sorting only operates on the fetched page and cannot implement a reliable full catalogue. Add metadata/facets only when stored and meaningful. |
| Course details | Core description, hierarchy, enrollment, progress | Safe public curriculum, actual counts, metadata/resources, genuine reviews/ratings, clear outcomes and requirements. |
| Learning | Video/PDF/notebook and completion navigation | Persist exact last lesson/video/PDF position, notes/bookmarks, audio/docs/resources; expose captions when present. |
| Assessments | Authoring JSON + bank; legacy database structures disconnected | Real server start/save/submit/expire/grade/result lifecycle, stable randomized snapshots, enforced timer/limits and answer-release policy. |
| Question types | MCQ, FIB, matching, jumbled-code, programming and output prediction | Normalize answer representation and add multi-correct/true-false/short/essay types with explicit grading policies. |
| Assignments | Definition/editor only | Drafts, secure attachments, submissions/history, deadline/late policy, return/resubmit, rubrics, grading and feedback. |
| Attendance | Not implemented as academic records | Sessions, rosters, present/absent/late/excused, correction audit, policies and reliable denominators. |
| Grades / performance | Progress reports exist; no academic gradebook | Released assessment/assignment grades, pending evaluation, course totals and evidence-based trends. |
| Certificates / achievements | Dynamic completion SVG and badges | Immutable issuance, eligibility rules, unique verification ID, optional revocation and accessible downloads. Preserve existing completion records during migration. |
| Calendar | Decorative calendar grid; no event model | Month/week/day views from real sessions, exam windows, assignment deadlines and scoped events. |
| Community | Posts/replies/search/accepted replies/reaction counters | Course/college audience, instructor moderation/pinning, per-user reactions, safe author DTOs and pagination. |
| Notifications / announcements | Logging service and placeholder frontend messages | Persisted recipient inbox/read state/preferences, audience-controlled announcements, source links; add delivery channels only if actually implemented. |
| Instructor workspace | Course builders, bank, students, listing/status views | Class/attendance tools, pending-grading queue, review/return/grade flows and factual engagement analytics. |
| Admin workspace | Users, courses, approvals and basic reports | Scoped academic structures, roster/enrollment operations, attendance policies, evaluation oversight and audit coverage. |
| Super admin | Platform lists, stats, settings and reports | Safe platform administration, controlled distribution, permission/audit coverage, operational health and real usage metrics. |
| Academic organization | College plus profile strings and legacy organizations | Departments, programs, batches/classes, terms/years/subjects and their scoped relationships. |
| Analytics | Useful enrollment/progress aggregates mixed with invented fields | Learning activity/attempt/submission/attendance events, meaningful denominators and labeled estimates. |
| Global search | Inputs without an actual global-search workflow | Permission-filtered categorized search/autocomplete with bounded queries and navigation to accessible resources. |
| Files / integrations | Cloudinary, PDF.js, local files, import and conversion | Asset ownership, protected submissions, correct parsers, queued jobs, failure status, integration configuration/health. |
| AI readiness | No real AI workflow | Versioned content/resource adapters, scoped retrieval boundary and audited service interface. No fake AI controls or model promises. |

Learning time currently estimates completed lesson duration; coding history synthesizes language/difficulty/accepted status; some achievements derive academic claims from point thresholds (`student.service.ts:492–584`). Replace these with actual evidence or clearly label an estimate. Do not build charts over fabricated measures.

## 6. Performance and operations

- Previous production build reports approximately **525 KB first-load JS for learning** and **540–542 KB for staff course lists**. Inspect heavy viewer/editor imports, lazy-load by lesson type and separate preview-only bundles before setting a measured budget.
- Images are globally unoptimized (`next.config.mjs`). Inspect actual image payloads/dimensions and adopt optimized delivery/caching compatible with the deployment.
- Many lists return all records. Add bounded server pagination and stable sort/filter contracts; debounce search, cancel obsolete requests and avoid refetching enrollments on every filter change.
- Reports use repeated per-college/sequential aggregation. Prefer grouped database queries, suitable indexes, query-count/latency measurements and scoped caches.
- Offload conversion, large imports and future delivery/execution jobs to workers. Track job status and failure; do not block request workers or invent success.
- Establish environment validation, explicit migrations, logs with correlation IDs and redaction, health/readiness, error monitoring, backup restoration and deployment rollback. Evaluate security verification against [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/).
- Choose measured service/bundle/performance budgets from representative data and deployment capacity. No scalability/load-testing claim is supported by the current tests.

## 7. Implementation sequence and acceptance gates

| Phase | Work | Gate before advancing |
| --- | --- | --- |
| 1 — Audit | This report, inventory and legacy-schema mapping | Reviewable findings, preservation map and acknowledged verification limits. |
| 2 — Safety and design foundations | Close P0 data/policy issues; semantic tokens and accessible primitives; remove conflicting utility overrides carefully | No sensitive fields in payloads; denied cross-tenant requests; verified default/hover/focus/selected states in every supported theme. |
| 3 — Core UX | Shared session and role shell, responsive navigation, truthful search/notifications entry points, consistent states | Correct destinations, keyboard navigation, mobile access and no fake actionable controls. |
| 4 — Student learning | My Learning, true catalogue facets, curriculum/resources, exact resume, notes/bookmarks | Reload/device-resume tests; empty/failure/enrollment states; media/resource access checks. |
| 5 — Evaluation vertical slice | Reconnect legacy assessment structures; assignments/drafts/submissions; instructor grading/return/feedback | Student start → submit → evaluate → release → results, tested against a separate database. Timer/attempt/grade policy enforced server-side. |
| 6 — Academic/admin | Scoped academic structures, class sessions/rosters, attendance and management workflows | Scoped creation/update, concurrent-safe rosters, attendance corrections/audit and required policy checks. |
| 7 — Connected ecosystem | Calendar, announcements, notification inbox/preferences and issued certificates | Each event links to its source; no duplicate notifications/credentials; verified eligibility and audience. |
| 8 — Analytics | Gradebook, attendance/progress/engagement read models; role-specific operational questions | Counts and denominators reconcile to source records; missing data is explicit. |
| 9 — Quality | Accessibility, narrow-screen layouts, performance, files/compiler/deployment hardening | Keyboard/screen-reader and responsive browser evidence, asset safety, measured query/bundle behavior. |
| 10 — End-to-end QA | Full role journeys, failure/recovery paths and release rehearsal | All release blockers closed; no unsupported production-readiness claims. |

Apply changes as compatible vertical slices, not a replacement dashboard in front of missing APIs. When schema needs expansion: inspect existing rows/states, add migration, test a backup copy, validate backfill, verify rollback, then apply the reviewed change. Keep shared/production data separate from fixture-based destructive QA.

## 8. Required QA matrix

- **Authentication:** valid/invalid login, cookies/CORS/origin protection, reload, logout, expired/revoked session, inactive account, role/college reassignment.
- **Authorization:** every protected read and mutation by role, owner, same college, assigned college, unrelated college, unauthenticated user; answer/hash/PII exclusion.
- **Learning:** enroll twice/concurrently, deep links, all media types, reload/resume, failed save, empty course, reordered/unpublished lesson, accurate completion.
- **Assessment:** stable randomized snapshot, answer autosave, timeout/reentry, attempt limit, duplicate submit, objective/manual grading, feedback release, cross-tenant denial.
- **Assignment:** drafts, unsafe/oversized uploads, submit/late policy, return/resubmit, grade bounds, released feedback, immutable submission history.
- **Attendance:** future sessions excluded, present/absent/late/excused policy, duplicate roster writes, corrections and audit.
- **Grades/certificates:** score reconciliation, grade-gated eligibility, issuance once, verification/revocation, changes to published curriculum.
- **Admin/instructor:** create/edit/submit/approve/publish/archive within policy, academic CRUD, scoped imports/resources, grading and attendance management.
- **Communication/search:** recipient/course scope, read state, preferences, source links, safe search results, moderation/reaction uniqueness.
- **Browser:** every route and key state at 360, 768, 1024 and 1440 CSS pixels; keyboard-only and zoom checks; dialogs/focus/overflow/contrast/screenshots, plus console/network errors. These widths are proposed coverage points, not a claim of completed testing.
- **Operations:** migration/restore/rollback, integration failures, job retries/idempotency, concurrent requests, measured performance and log redaction.

## Immediate next implementation slice

Start with safe response serialization and shared tenant/content policies, followed by the global color cascade and one accessible role shell. Before adding new assessment tables, reconnect the compatible legacy quiz structures. This ordering addresses both the launch blockers and the unreadable UI while preserving working behavior.

## Continuation — 9 September 2026

The workspace now contains safety/design foundation changes and a personal learning-state API. This continuation connected the learner page to that API for private plain-text notes, lesson bookmarks, and last-visited-lesson resume. Explicit curriculum links take precedence over resume; normal My Learning links let the learner resolve its saved visit. Failed state requests leave course content available and display an error. Notes require explicit saving, retain drafts while switching lessons within the viewer, and keep newer edits unsaved when an older request completes.

Verification passed: 106 backend tests, 17 frontend tests across four suites, and the frontend TypeScript check. Coverage includes learning-state ownership, enrollment, resource validation, partial updates, resume precedence, failed saves, draft retention, and edits made during an in-flight save. These tests use fixtures; they do not establish shared-database workflow or every-page browser verification. PDF page/video position restoration, saved-course UI, bookmark navigation, and the remaining audit phases are still outstanding. The original release-readiness limits above remain in force.

Following explicit user approval, migration `005_create_learning_state.sql` was applied to the configured shared database on 9 September 2026. Preflight confirmed both new tables were absent and the referenced IDs were compatible. A transactional rehearsal created and verified the schema, then rolled back; metadata matched the original schema afterward. The committed migration passed a separate post-commit check: two tables, 16 columns, 11 constraints, and six indexes (including primary-key indexes). Existing public table columns, constraints, and indexes were unchanged. Both new tables were empty after migration; no learner records were changed. A local receipt with the migration checksum and schema evidence is stored at `.tools/learning-state-migration-receipt.json`. Live learner save/resume and browser verification remain outstanding.
