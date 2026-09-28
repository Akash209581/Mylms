-- Migration 010: Add department, section, academic_year, current_year, and batch_no to users table

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'section') THEN
        ALTER TABLE users ADD COLUMN section VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'academic_year') THEN
        ALTER TABLE users ADD COLUMN academic_year VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'current_year') THEN
        ALTER TABLE users ADD COLUMN current_year VARCHAR(50);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'batch_no') THEN
        ALTER TABLE users ADD COLUMN batch_no VARCHAR(50);
    END IF;
END $$;
