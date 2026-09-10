-- Proctoring fields for exam attempts (tab-switch auto-submit + analytics)
ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS tab_switch_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE exam_attempts
  ADD COLUMN IF NOT EXISTS auto_submitted_reason VARCHAR(32);
