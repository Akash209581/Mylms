-- Migration 011: multi-role support. The User entity maps `roles` as a
-- TypeORM simple-array (comma-separated TEXT).

ALTER TABLE users ADD COLUMN IF NOT EXISTS roles TEXT;
UPDATE users SET roles = role::text WHERE roles IS NULL OR roles = '';
