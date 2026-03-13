-- Add extraRightMatches column to questions table
-- This column stores extra right-side options for matching questions (distractors)

ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS extra_right_matches JSONB;

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'questions' 
AND column_name = 'extra_right_matches';
