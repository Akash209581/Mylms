-- Additive personal learner state; intentionally separate from grades/progress.
-- Apply explicitly after reviewing this migration. Never use schema synchronization.
BEGIN;

CREATE TABLE IF NOT EXISTS course_learning_states (
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  saved BOOLEAN NOT NULL DEFAULT FALSE,
  saved_at TIMESTAMPTZ,
  last_lesson_id INTEGER REFERENCES lessons(id) ON DELETE SET NULL,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, course_id),
  CONSTRAINT course_learning_saved_timestamp CHECK (saved OR saved_at IS NULL)
);

CREATE INDEX IF NOT EXISTS course_learning_states_recent_idx
  ON course_learning_states (student_id, last_viewed_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS course_learning_states_course_idx
  ON course_learning_states (course_id);
CREATE INDEX IF NOT EXISTS course_learning_states_lesson_idx
  ON course_learning_states (last_lesson_id) WHERE last_lesson_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS lesson_learning_states (
  student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  note TEXT NOT NULL DEFAULT '',
  bookmarked BOOLEAN NOT NULL DEFAULT FALSE,
  video_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  pdf_page INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (student_id, lesson_id),
  CONSTRAINT lesson_learning_note_length CHECK (char_length(note) <= 20000),
  CONSTRAINT lesson_learning_video_bounds CHECK (video_seconds >= 0 AND video_seconds <= 604800),
  CONSTRAINT lesson_learning_pdf_bounds CHECK (pdf_page BETWEEN 1 AND 100000)
);

CREATE INDEX IF NOT EXISTS lesson_learning_states_lesson_idx
  ON lesson_learning_states (lesson_id);

COMMIT;
