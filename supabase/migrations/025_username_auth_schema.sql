-- Migration: Username-based authentication
-- Adds username field and updates users table for simple auth

-- Add username column if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Update RLS policies for users table
DROP POLICY IF EXISTS "Users can view own data" ON users;
CREATE POLICY "Users can view own data" ON users
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert" ON users;
CREATE POLICY "Users can insert" ON users
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own data" ON users;
CREATE POLICY "Users can update own data" ON users
    FOR UPDATE USING (true);
