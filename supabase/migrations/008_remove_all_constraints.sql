-- Migration: Remove all foreign key constraints from users table
-- This allows direct inserts without Supabase Auth dependencies

-- Drop the foreign key constraint to auth.users (if it exists)
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Verify the constraint is removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'users_id_fkey'
    ) THEN
        RAISE EXCEPTION 'Foreign key constraint still exists!';
    END IF;
END $$;

-- Make sure email is unique
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users(email);

-- Ensure id column can accept any UUID (not just from auth.users)
-- The id column should already be UUID type, we just need to remove the FK constraint

COMMENT ON TABLE public.users IS 'Stores user accounts with plain passwords and SRM cookies. No foreign key constraints.';

