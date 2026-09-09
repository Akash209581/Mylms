-- Migration: Add Creator Roles, Question Approvals, and Target Companies Support

-- 1. Update PostgreSQL enum if users.role is an enum
DO $$
BEGIN
  -- Check if users_role_enum exists and alter it
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'users_role_enum') THEN
    BEGIN
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'QUESTION_CREATOR';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER TYPE users_role_enum ADD VALUE IF NOT EXISTS 'CONTENT_CREATOR';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;

-- 2. Add question status enum type if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'questions_status_enum') THEN
    CREATE TYPE questions_status_enum AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- 3. Add approval and target company columns to questions table
ALTER TABLE questions ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'APPROVED';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS target_companies TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS created_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Update existing questions to APPROVED and sync target_companies from companiesAppeared if present
UPDATE questions SET status = 'APPROVED' WHERE status IS NULL;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'companiesAppeared'
  ) THEN
    UPDATE questions SET target_companies = "companiesAppeared" WHERE target_companies IS NULL AND "companiesAppeared" IS NOT NULL;
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'questions' AND column_name = 'companies_appeared'
  ) THEN
    UPDATE questions SET target_companies = companies_appeared WHERE target_companies IS NULL AND companies_appeared IS NOT NULL;
  END IF;
END $$;
