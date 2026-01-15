-- Migration: Remove Supabase Auth dependency from users table
-- This allows direct email/password authentication without Supabase Auth

-- Drop the foreign key constraint to auth.users
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- The id column remains as UUID PRIMARY KEY, but no longer references auth.users
-- This allows us to generate UUIDs directly without requiring Supabase Auth

-- Ensure email is unique (should already be, but just in case)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users(email);

COMMENT ON TABLE public.users IS 'Stores user accounts with encrypted passwords and SRM cookies. No longer requires Supabase Auth.';

