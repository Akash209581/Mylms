-- =============================================================================
-- 007 — Exam / Assessment Module
-- Independent of existing quiz/lesson-assessment tables.
-- Run once. Safe to re-run (IF NOT EXISTS everywhere).
-- =============================================================================
BEGIN;

-- ─── EXAMS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exams (
  id                     SERIAL PRIMARY KEY,
  title                  VARCHAR(255) NOT NULL,
  description            TEXT,
  instructions           TEXT,
  college_id             INTEGER REFERENCES colleges(id) ON DELETE CASCADE,
  created_by_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  duration_minutes       INTEGER NOT NULL DEFAULT 60,
  start_at               TIMESTAMPTZ,
  end_at                 TIMESTAMPTZ,
  total_marks            INTEGER NOT NULL DEFAULT 0,
  passing_marks          INTEGER NOT NULL DEFAULT 0,
  negative_marking       BOOLEAN NOT NULL DEFAULT FALSE,
  negative_marks_value   NUMERIC(5,2) NOT NULL DEFAULT 0,
  attempt_limit          INTEGER NOT NULL DEFAULT 1,
  randomize_questions    BOOLEAN NOT NULL DEFAULT FALSE,
  randomize_options      BOOLEAN NOT NULL DEFAULT FALSE,
  auto_submit            BOOLEAN NOT NULL DEFAULT TRUE,
  status                 VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SCHEDULED','LIVE','COMPLETED','ARCHIVED')),
  show_results           BOOLEAN NOT NULL DEFAULT TRUE,
  show_correct_answers   BOOLEAN NOT NULL DEFAULT FALSE,
  show_explanations      BOOLEAN NOT NULL DEFAULT FALSE,
  ranking_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  tab_switch_monitoring  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exams_college_idx ON exams(college_id);
CREATE INDEX IF NOT EXISTS exams_status_idx  ON exams(status);
CREATE INDEX IF NOT EXISTS exams_start_at_idx ON exams(start_at) WHERE status IN ('SCHEDULED','LIVE');

-- ─── EXAM QUESTIONS ──────────────────────────────────────────────────────────
-- section: 'A' = MCQ,  'B' = Coding
CREATE TABLE IF NOT EXISTS exam_questions (
  id           SERIAL PRIMARY KEY,
  exam_id      INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id  INTEGER NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  section      CHAR(1) NOT NULL CHECK (section IN ('A','B')),
  marks        NUMERIC(7,2) NOT NULL DEFAULT 1,
  negative_marks NUMERIC(7,2) NOT NULL DEFAULT 0,
  sort_order   INTEGER NOT NULL DEFAULT 0,
  UNIQUE (exam_id, question_id)
);

CREATE INDEX IF NOT EXISTS exam_questions_exam_idx ON exam_questions(exam_id, section, sort_order);

-- ─── EXAM ASSIGNMENTS (student ↔ exam) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_assignments (
  id          SERIAL PRIMARY KEY,
  exam_id     INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  student_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS exam_assignments_student_idx ON exam_assignments(student_id);
CREATE INDEX IF NOT EXISTS exam_assignments_exam_idx    ON exam_assignments(exam_id);

-- ─── EXAM ATTEMPTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_attempts (
  id               SERIAL PRIMARY KEY,
  exam_id          INTEGER NOT NULL REFERENCES exams(id) ON DELETE RESTRICT,
  student_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  attempt_number   SMALLINT NOT NULL DEFAULT 1,
  status           VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (status IN ('IN_PROGRESS','SUBMITTED','EVALUATED')),
  start_time       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deadline_at      TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ,
  -- MCQ answers: { "questionId": "A" | "B" | "C" | "D" | null }
  mcq_answers      JSONB NOT NULL DEFAULT '{}',
  -- Per-question time tracking (seconds): { "questionId": 42 }
  time_spent       JSONB NOT NULL DEFAULT '{}',
  -- Marked for review: [questionId, ...]
  marked_review    JSONB NOT NULL DEFAULT '[]',
  mcq_score        NUMERIC(9,2),
  coding_score     NUMERIC(9,2),
  total_score      NUMERIC(9,2),
  passed           BOOLEAN,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exam_attempts_student_idx ON exam_attempts(student_id, exam_id);
CREATE INDEX IF NOT EXISTS exam_attempts_status_idx  ON exam_attempts(status) WHERE status = 'IN_PROGRESS';

-- ─── EXAM CODING SUBMISSIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exam_coding_submissions (
  id                  SERIAL PRIMARY KEY,
  attempt_id          INTEGER NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  question_id         INTEGER NOT NULL REFERENCES questions(id) ON DELETE RESTRICT,
  language            VARCHAR(30) NOT NULL,
  code                TEXT NOT NULL,
  -- Results
  passed_cases        INTEGER NOT NULL DEFAULT 0,
  total_cases         INTEGER NOT NULL DEFAULT 0,
  hidden_passed       INTEGER NOT NULL DEFAULT 0,
  hidden_total        INTEGER NOT NULL DEFAULT 0,
  score               NUMERIC(9,2) NOT NULL DEFAULT 0,
  exec_time_ms        INTEGER,
  memory_kb           INTEGER,
  compilation_error   TEXT,
  runtime_error       TEXT,
  status              VARCHAR(20) NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING','RUNNING','ACCEPTED','WRONG_ANSWER','COMPILE_ERROR',
                      'RUNTIME_ERROR','TIME_LIMIT','MEMORY_LIMIT','PARTIAL')),
  is_final            BOOLEAN NOT NULL DEFAULT FALSE,
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id, is_final)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS exam_coding_subs_attempt_idx ON exam_coding_submissions(attempt_id, question_id);

-- ─── EXAM QUESTION ANALYTICS (aggregated after evaluation) ──────────────────
CREATE TABLE IF NOT EXISTS exam_question_analytics (
  id               SERIAL PRIMARY KEY,
  exam_id          INTEGER NOT NULL REFERENCES exams(id) ON DELETE CASCADE,
  question_id      INTEGER NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  attempts         INTEGER NOT NULL DEFAULT 0,
  correct          INTEGER NOT NULL DEFAULT 0,
  incorrect        INTEGER NOT NULL DEFAULT 0,
  unanswered       INTEGER NOT NULL DEFAULT 0,
  avg_time_seconds NUMERIC(8,2) NOT NULL DEFAULT 0,
  UNIQUE (exam_id, question_id)
);

-- ─── AUTO-UPDATE updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION exam_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_exams_updated_at ON exams;
CREATE TRIGGER trg_exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION exam_set_updated_at();

DROP TRIGGER IF EXISTS trg_exam_attempts_updated_at ON exam_attempts;
CREATE TRIGGER trg_exam_attempts_updated_at
  BEFORE UPDATE ON exam_attempts
  FOR EACH ROW EXECUTE FUNCTION exam_set_updated_at();

COMMIT;
