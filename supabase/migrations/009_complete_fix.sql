-- Complete fix: Remove auth dependency and fix RLS policies
-- Run this single migration to fix everything

-- ============================================================================
-- STEP 1: Remove foreign key constraint to auth.users
-- ============================================================================
ALTER TABLE public.users 
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Verify constraint is removed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'users_id_fkey'
        AND table_name = 'users'
    ) THEN
        RAISE NOTICE 'Warning: Foreign key constraint may still exist';
    ELSE
        RAISE NOTICE 'Success: Foreign key constraint removed';
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Fix RLS Policies
-- ============================================================================

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;
DROP POLICY IF EXISTS "Allow public inserts to users" ON public.users;
DROP POLICY IF EXISTS "Allow public updates to users" ON public.users;
DROP POLICY IF EXISTS "Allow public selects from users" ON public.users;
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;

-- Create new policies that work without Supabase Auth
CREATE POLICY "Allow public inserts to users"
ON public.users
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public updates to users"
ON public.users
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public selects from users"
ON public.users
FOR SELECT
USING (true);

-- Service role policy for Edge Functions
CREATE POLICY "Service role full access to users"
ON public.users
FOR ALL
USING (
    CASE 
        WHEN auth.jwt() IS NULL THEN false
        ELSE auth.jwt()->>'role' = 'service_role'
    END
);

-- ============================================================================
-- STEP 3: Ensure indexes exist
-- ============================================================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_unique ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- ============================================================================
-- Success message
-- ============================================================================
SELECT 'Migration completed successfully! Users table is now independent of auth.users' AS status;

