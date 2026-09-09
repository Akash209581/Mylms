-- Add execution metadata beside, rather than replacing, the existing quiz tables.
BEGIN;
CREATE TABLE IF NOT EXISTS lesson_assessments (
  lesson_id INTEGER PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
  quiz_id INTEGER NOT NULL UNIQUE REFERENCES quizzes(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assessment_attempt_runtime (
  attempt_id INTEGER PRIMARY KEY REFERENCES quiz_attempts(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE RESTRICT,
  deadline_at TIMESTAMPTZ NOT NULL,
  snapshot JSONB NOT NULL,
  state VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (state IN ('IN_PROGRESS','SUBMITTED','GRADED','RELEASED')),
  grading JSONB,
  feedback TEXT NOT NULL DEFAULT '',
  graded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  graded_at TIMESTAMPTZ,
  released_at TIMESTAMPTZ,
  CONSTRAINT assessment_feedback_length CHECK (char_length(feedback) <= 20000)
);
CREATE INDEX IF NOT EXISTS assessment_runtime_lesson_idx ON assessment_attempt_runtime(lesson_id, state);
CREATE INDEX IF NOT EXISTS assessment_runtime_deadline_idx ON assessment_attempt_runtime(deadline_at) WHERE state='IN_PROGRESS';
CREATE INDEX IF NOT EXISTS quiz_attempts_student_quiz_idx ON quiz_attempts(student_id, quiz_id);
COMMIT;
