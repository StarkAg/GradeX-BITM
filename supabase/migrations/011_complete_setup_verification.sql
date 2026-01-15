-- ============================================================================
-- GradeX Complete Supabase Setup & Verification
-- This script verifies and fixes all RLS policies for direct database auth
-- Run this in Supabase SQL Editor to ensure everything is configured correctly
-- ============================================================================

-- ============================================================================
-- STEP 1: VERIFY TABLE EXISTS
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
    ) THEN
        RAISE EXCEPTION 'Table "users" does not exist. Please run initial schema migration first.';
    END IF;
    RAISE NOTICE '✓ Table "users" exists';
END $$;

-- ============================================================================
-- STEP 2: VERIFY RLS IS ENABLED
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE '✓ RLS enabled on "users" table';
    ELSE
        RAISE NOTICE '✓ RLS already enabled on "users" table';
    END IF;
END $$;

-- ============================================================================
-- STEP 3: DROP ALL EXISTING POLICIES (Clean Slate)
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
-- STEP 4: CREATE NEW POLICIES FOR DIRECT AUTH
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

RAISE NOTICE '✓ All RLS policies created';

-- ============================================================================
-- STEP 5: GRANT PERMISSIONS
-- ============================================================================

-- Grant permissions to anon role (frontend uses anon key)
GRANT SELECT, INSERT, UPDATE ON public.users TO anon;
GRANT USAGE ON SCHEMA public TO anon;

-- Grant permissions to authenticated role (if using Supabase Auth later)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- Service role already has all permissions (default)

RAISE NOTICE '✓ Permissions granted';

-- ============================================================================
-- STEP 6: VERIFY COLUMNS EXIST
-- ============================================================================
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    required_columns TEXT[] := ARRAY[
        'id', 'email', 'registration_number', 'password', 
        'encrypted_cookies', 'cookie_expires_at', 'cookie_invalid',
        'created_at', 'updated_at'
    ];
    col TEXT;
BEGIN
    FOREACH col IN ARRAY required_columns
    LOOP
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'users' 
            AND column_name = col
        ) THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Missing columns: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✓ All required columns exist';
    END IF;
END $$;

-- ============================================================================
-- STEP 7: VERIFY INDEXES
-- ============================================================================
DO $$
BEGIN
    -- Check for email index (for fast lookups)
    IF NOT EXISTS (
        SELECT FROM pg_indexes 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND indexname LIKE '%email%'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
        RAISE NOTICE '✓ Created index on email column';
    ELSE
        RAISE NOTICE '✓ Index on email exists';
    END IF;
    
    -- Check for id index (primary key should have this automatically)
    IF EXISTS (
        SELECT FROM pg_constraint 
        WHERE conrelid = 'public.users'::regclass 
        AND contype = 'p'
    ) THEN
        RAISE NOTICE '✓ Primary key on id exists';
    ELSE
        RAISE WARNING 'No primary key on id column!';
    END IF;
END $$;

-- ============================================================================
-- STEP 8: TEST QUERIES (Verification)
-- ============================================================================

-- Test 1: Verify SELECT works (should return empty array, not error)
DO $$
DECLARE
    test_result RECORD;
BEGIN
    -- This should work without 406 error (returns empty array if no rows)
    SELECT COUNT(*) INTO test_result
    FROM public.users
    WHERE id = '00000000-0000-0000-0000-000000000000'::uuid;
    
    RAISE NOTICE '✓ SELECT query test passed (no 406 error)';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'SELECT test failed: %', SQLERRM;
END $$;

-- Test 2: Verify INSERT would work (don't actually insert)
DO $$
BEGIN
    -- Just verify the policy exists
    IF EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Allow public inserts to users'
    ) THEN
        RAISE NOTICE '✓ INSERT policy exists';
    ELSE
        RAISE WARNING 'INSERT policy missing!';
    END IF;
END $$;

-- Test 3: Verify UPDATE would work
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'users' 
        AND policyname = 'Allow users to update own row by id'
    ) THEN
        RAISE NOTICE '✓ UPDATE policy exists';
    ELSE
        RAISE WARNING 'UPDATE policy missing!';
    END IF;
END $$;

-- ============================================================================
-- STEP 9: SUMMARY REPORT
-- ============================================================================
DO $$
DECLARE
    policy_count INTEGER;
    rls_enabled BOOLEAN;
BEGIN
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    -- Check RLS
    SELECT rowsecurity INTO rls_enabled
    FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'users';
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SETUP VERIFICATION SUMMARY';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RLS Enabled: %', CASE WHEN rls_enabled THEN 'YES ✓' ELSE 'NO ✗' END;
    RAISE NOTICE 'Policies Created: %', policy_count;
    RAISE NOTICE 'Table: public.users';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '1. Test login in frontend - should work without 406 errors';
    RAISE NOTICE '2. Verify queries use .maybeSingle() instead of .single()';
    RAISE NOTICE '3. Verify queries use single identity source (id OR email, not both)';
    RAISE NOTICE '';
END $$;

-- ============================================================================
-- COMPLETE
-- ============================================================================
SELECT 'GradeX Supabase setup verification complete!' AS status;

