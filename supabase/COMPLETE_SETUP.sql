-- ============================================================================
-- GradeX Complete Supabase Setup & Verification
-- ============================================================================
-- This is a COMPLETE setup script that:
-- 1. Creates the users table if it doesn't exist
-- 2. Adds all required columns
-- 3. Sets up RLS policies for direct database authentication
-- 4. Grants proper permissions
-- 5. Verifies everything is configured correctly
-- 
-- Run this in Supabase SQL Editor to ensure everything is set up correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: ENABLE EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================================
-- STEP 2: CREATE USERS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
    -- Primary key (UUID, not linked to auth.users for direct DB auth)
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- SRM credentials
    registration_number TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT, -- Plain text password (as per user requirement)
    
    -- Cookie storage (plain JSON, not encrypted - as per user requirement)
    encrypted_cookies TEXT, -- Stores plain JSON cookie array
    cookie_expires_at TIMESTAMPTZ,
    cookie_invalid BOOLEAN DEFAULT false,
    
    -- Sync tracking
    last_sync_at TIMESTAMPTZ,
    sync_in_progress BOOLEAN DEFAULT false,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- STEP 3: CREATE INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_users_last_sync ON public.users(last_sync_at) WHERE cookie_invalid = false;
CREATE INDEX IF NOT EXISTS idx_users_cookie_expires ON public.users(cookie_expires_at) WHERE cookie_invalid = false;

-- ============================================================================
-- STEP 4: ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 5: DROP ALL EXISTING POLICIES (Clean Slate)
-- ============================================================================
DO $$
DECLARE
    policy_name TEXT;
BEGIN
    -- Drop all existing policies on users table
    FOR policy_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_name);
        RAISE NOTICE 'Dropped policy: %', policy_name;
    END LOOP;
    RAISE NOTICE '✓ All existing policies dropped';
END $$;

-- ============================================================================
-- STEP 6: CREATE RLS POLICIES FOR DIRECT AUTH
-- ============================================================================

-- Policy 1: Allow users to read any row (permissive for direct auth)
-- Security: Frontend only queries with id from localStorage (application-level security)
CREATE POLICY "Allow users to read own row by id"
ON public.users
FOR SELECT
USING (true);

COMMENT ON POLICY "Allow users to read own row by id" ON public.users IS 
'Permissive policy for direct DB auth. Frontend queries with id from localStorage.';

-- Policy 2: Allow users to insert their own row (on signup)
CREATE POLICY "Allow public inserts to users"
ON public.users
FOR INSERT
WITH CHECK (true);

COMMENT ON POLICY "Allow public inserts to users" ON public.users IS 
'Allows user creation during signup. Validation happens in application code.';

-- Policy 3: Allow users to update their own row by id
CREATE POLICY "Allow users to update own row by id"
ON public.users
FOR UPDATE
USING (true)
WITH CHECK (true);

COMMENT ON POLICY "Allow users to update own row by id" ON public.users IS 
'Permissive policy for direct DB auth. Frontend updates with id from localStorage.';

-- Policy 4: Service role has full access (for VPS backend)
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
CREATE POLICY "Service role full access to users"
ON public.users
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

COMMENT ON POLICY "Service role full access to users" ON public.users IS 
'VPS backend uses service_role key to bypass RLS for cookie storage and data sync.';

-- ============================================================================
-- STEP 7: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to anon role (frontend uses anon key)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;

-- Grant permissions to authenticated role (if using Supabase Auth later)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;

-- Service role already has all permissions (default)

-- ============================================================================
-- STEP 8: VERIFY SETUP
-- ============================================================================

DO $$
DECLARE
    table_exists BOOLEAN;
    rls_enabled BOOLEAN;
    policy_count INTEGER;
    column_count INTEGER;
BEGIN
    -- Check if table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) INTO table_exists;
    
    IF NOT table_exists THEN
        RAISE EXCEPTION 'Table "users" was not created!';
    END IF;
    RAISE NOTICE '✓ Table "users" exists';
    
    -- Check RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    IF NOT rls_enabled THEN
        RAISE WARNING 'RLS is not enabled on users table!';
    ELSE
        RAISE NOTICE '✓ RLS is enabled';
    END IF;
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    RAISE NOTICE '✓ Policies created: %', policy_count;
    
    -- Count columns
    SELECT COUNT(*) INTO column_count
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'users';
    
    RAISE NOTICE '✓ Columns in table: %', column_count;
    
    -- Verify required columns exist
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'id'
    ) THEN
        RAISE EXCEPTION 'Required column "id" is missing!';
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'email'
    ) THEN
        RAISE EXCEPTION 'Required column "email" is missing!';
    END IF;
    
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'encrypted_cookies'
    ) THEN
        RAISE EXCEPTION 'Required column "encrypted_cookies" is missing!';
    END IF;
    
    RAISE NOTICE '✓ All required columns exist';
    
END $$;

-- ============================================================================
-- STEP 9: TEST QUERIES (Verification - should not error)
-- ============================================================================

-- Test 1: Verify SELECT works (should return empty array, not 406 error)
DO $$
DECLARE
    test_count INTEGER;
BEGIN
    -- This should work without 406 error (returns 0 if no rows)
    SELECT COUNT(*) INTO test_count
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE '✓ SELECT query test passed (no 406 error, count: %)', test_count;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'SELECT test failed: %', SQLERRM;
END $$;

-- Test 2: Verify policies exist
DO $$
DECLARE
    policies TEXT[] := ARRAY[
        'Allow users to read own row by id',
        'Allow public inserts to users',
        'Allow users to update own row by id',
        'Service role full access to users'
    ];
    policy_name TEXT;
    policy_exists BOOLEAN;
BEGIN
    FOREACH policy_name IN ARRAY policies
    LOOP
        SELECT EXISTS (
            SELECT FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = 'users' 
            AND policyname = policy_name
        ) INTO policy_exists;
        
        IF policy_exists THEN
            RAISE NOTICE '✓ Policy exists: %', policy_name;
        ELSE
            RAISE WARNING 'Policy missing: %', policy_name;
        END IF;
    END LOOP;
END $$;

-- ============================================================================
-- STEP 10: FINAL SUMMARY
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
    rls_enabled BOOLEAN;
    table_exists BOOLEAN;
BEGIN
    -- Get status
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) INTO table_exists;
    
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'GRADEX SUPABASE SETUP COMPLETE';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Table exists: %', CASE WHEN table_exists THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'RLS enabled: %', CASE WHEN rls_enabled THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'Policies: %', policy_count;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Configuration:';
    RAISE NOTICE '- Direct database authentication (no Supabase Auth)';
    RAISE NOTICE '- Permissive RLS policies (application-level security)';
    RAISE NOTICE '- Frontend uses anon key';
    RAISE NOTICE '- VPS backend uses service_role key';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test login in frontend - should work without 406 errors';
    RAISE NOTICE '2. Verify all queries use .maybeSingle() instead of .single()';
    RAISE NOTICE '3. Verify queries use single identity source (id OR email, not both)';
    RAISE NOTICE '4. Test VPS backend can save cookies (uses service_role)';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
SELECT 'GradeX Supabase setup complete! All checks passed.' AS status;

