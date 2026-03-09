-- Super Admin Enterprise Upgrade Migration
-- Run this script against your PostgreSQL database to add new columns.
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS pattern).

-- 1. Add isActive column to users table (default true = all existing users stay active)
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Add lastLoginAt column to users table for engagement tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL;

-- 3. Create audit_logs table for enterprise audit trail
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(200) NULL,
    actor_role VARCHAR(50) NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id INTEGER NULL,
    target_name VARCHAR(255) NULL,
    details TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. Index for fast audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Verify
SELECT 
    column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name IN ('is_active','last_login_at')
ORDER BY column_name;
