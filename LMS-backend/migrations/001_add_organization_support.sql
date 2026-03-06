-- Migration: Add Organization Support
-- This migration adds the organizations table and organization_id foreign key to users, courses, and questions tables

-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) UNIQUE NOT NULL,
  description VARCHAR(500),
  type VARCHAR(100),
  address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  created_by INTEGER,
  active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add organization_id column to users table (nullable for SUPERADMIN)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id);

-- Add organization_id column to courses table (NOT NULL with default for existing data)
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Add organization_id column to questions table (NOT NULL with default for existing data)
ALTER TABLE questions 
ADD COLUMN IF NOT EXISTS organization_id INTEGER;

-- Insert default organization
INSERT INTO organizations (name, type, description, country, active, created_at, updated_at)
VALUES ('Default Organization', 'University', 'Default organization for existing data', 'India', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Update existing courses with default organization
UPDATE courses 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE organization_id IS NULL;

-- Update existing questions with default organization
UPDATE questions 
SET organization_id = (SELECT id FROM organizations WHERE name = 'Default Organization' LIMIT 1)
WHERE organization_id IS NULL;

-- Now add NOT NULL constraints and foreign keys for courses and questions
ALTER TABLE courses 
ALTER COLUMN organization_id SET NOT NULL;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_courses_organization') THEN
    ALTER TABLE courses ADD CONSTRAINT fk_courses_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
  END IF;
END $$;

ALTER TABLE questions 
ALTER COLUMN organization_id SET NOT NULL;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_questions_organization') THEN
    ALTER TABLE questions ADD CONSTRAINT fk_questions_organization FOREIGN KEY (organization_id) REFERENCES organizations(id);
  END IF;
END $$;

-- Create indices for better query performance
CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_courses_organization_id ON courses(organization_id);
CREATE INDEX IF NOT EXISTS idx_questions_organization_id ON questions(organization_id);

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
