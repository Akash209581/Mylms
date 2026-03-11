-- Migration: Replace Organization with College/University
-- This migration renames the organizations table to colleges and updates all related references

-- Step 1: Rename organizations table to colleges
ALTER TABLE organizations RENAME TO colleges;

-- Step 2: Update users table - rename organization_id to college_id
ALTER TABLE users RENAME COLUMN organization_id TO college_id;

-- Step 3: Update courses table - rename organization_id to college_id (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE courses RENAME COLUMN organization_id TO college_id;
    END IF;
END $$;

-- Step 4: Update questions table - rename organization_id to college_id (if exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE questions RENAME COLUMN organization_id TO college_id;
    END IF;
END $$;

-- Step 5: Update any foreign key constraints
-- Drop old foreign keys
DO $$ 
BEGIN
    -- Drop FK on users table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%organization%' AND table_name = 'users'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE users DROP CONSTRAINT ' || constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%organization%' AND table_name = 'users'
            LIMIT 1
        );
    END IF;

    -- Drop FK on courses table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%organization%' AND table_name = 'courses'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE courses DROP CONSTRAINT ' || constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%organization%' AND table_name = 'courses'
            LIMIT 1
        );
    END IF;

    -- Drop FK on questions table
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name LIKE '%organization%' AND table_name = 'questions'
    ) THEN
        EXECUTE (
            SELECT 'ALTER TABLE questions DROP CONSTRAINT ' || constraint_name 
            FROM information_schema.table_constraints 
            WHERE constraint_name LIKE '%organization%' AND table_name = 'questions'
            LIMIT 1
        );
    END IF;
END $$;

-- Step 6: Add new foreign key constraints with proper naming
ALTER TABLE users 
ADD CONSTRAINT fk_users_college 
FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE courses 
        ADD CONSTRAINT fk_courses_college 
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = 'college_id'
    ) THEN
        ALTER TABLE questions 
        ADD CONSTRAINT fk_questions_college 
        FOREIGN KEY (college_id) REFERENCES colleges(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Step 7: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_college_id ON users(college_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_colleges_active ON colleges(active);

-- Migration complete
-- All organization references have been replaced with college references
