-- Migration: Add college_name column to users table
-- This allows storing the college name directly on the user for easier access

-- Add college_name column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'college_name'
    ) THEN
        ALTER TABLE users ADD COLUMN college_name VARCHAR(200);
        
        -- Optionally populate college_name from colleges table for existing users
        UPDATE users u
        SET college_name = c.name
        FROM colleges c
        WHERE u.college_id = c.id AND u.college_name IS NULL;
        
        RAISE NOTICE 'Added college_name column to users table';
    ELSE
        RAISE NOTICE 'college_name column already exists';
    END IF;
END $$;
