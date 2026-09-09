-- Add the table used by the existing super admin settings API.
-- This migration does not modify existing data.
CREATE TABLE IF NOT EXISTS settings (
  key varchar(100) PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamp NOT NULL DEFAULT now()
);
