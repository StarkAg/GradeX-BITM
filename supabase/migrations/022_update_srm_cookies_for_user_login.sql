-- Migration: Update SRM cookies table for user-based login
-- Purpose: Change from email-based to user_id-based cookie storage
-- This supports per-user SRM login credentials

-- ============================================================================
-- STEP 1: Update table structure (if needed)
-- ============================================================================

-- Add new columns if they don't exist
DO $$ 
BEGIN
  -- Add user_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'srm_cookies' 
    AND column_name = 'user_id'
  ) THEN
    ALTER TABLE srm_cookies ADD COLUMN user_id UUID;
    RAISE NOTICE 'Added user_id column';
  END IF;

  -- Add srm_user_id column if it doesn't exist (stores SRM login ID for reference)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'srm_cookies' 
    AND column_name = 'srm_user_id'
  ) THEN
    ALTER TABLE srm_cookies ADD COLUMN srm_user_id TEXT;
    RAISE NOTICE 'Added srm_user_id column';
  END IF;

  -- Add last_validated_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'srm_cookies' 
    AND column_name = 'last_validated_at'
  ) THEN
    ALTER TABLE srm_cookies ADD COLUMN last_validated_at TIMESTAMPTZ;
    RAISE NOTICE 'Added last_validated_at column';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Migrate existing data (if any)
-- ============================================================================

-- If user_email exists but user_id doesn't, try to generate user_id from email
-- This is a one-time migration for existing data
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'srm_cookies' 
    AND column_name = 'user_email'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'srm_cookies' 
    AND column_name = 'user_id'
  ) THEN
    -- Migrate: set srm_user_id from user_email if user_id is null
    UPDATE srm_cookies 
    SET srm_user_id = user_email 
    WHERE srm_user_id IS NULL AND user_email IS NOT NULL;
    
    RAISE NOTICE 'Migrated user_email to srm_user_id for existing records';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Make user_id required and unique (if table is empty or we can set defaults)
-- ============================================================================

-- Note: Only make user_id required if table is empty or all rows have user_id
DO $$ 
DECLARE
  row_count INTEGER;
  null_user_id_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO row_count FROM srm_cookies;
  SELECT COUNT(*) INTO null_user_id_count FROM srm_cookies WHERE user_id IS NULL;
  
  -- Only proceed if table is empty or all rows have user_id
  IF row_count = 0 OR null_user_id_count = 0 THEN
    -- Drop old unique constraint on user_email if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'srm_cookies' 
      AND constraint_name = 'srm_cookies_user_email_key'
    ) THEN
      ALTER TABLE srm_cookies DROP CONSTRAINT srm_cookies_user_email_key;
      RAISE NOTICE 'Dropped old unique constraint on user_email';
    END IF;
    
    -- Add unique constraint on user_id if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'srm_cookies' 
      AND constraint_name = 'srm_cookies_user_id_key'
    ) THEN
      ALTER TABLE srm_cookies ADD CONSTRAINT srm_cookies_user_id_key UNIQUE (user_id);
      RAISE NOTICE 'Added unique constraint on user_id';
    END IF;
  ELSE
    RAISE WARNING 'Table has rows with null user_id. Please update them manually before making user_id required.';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Update indexes
-- ============================================================================

-- Create index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_srm_cookies_user_id ON srm_cookies(user_id);

-- Create index on srm_user_id if it doesn't exist (for reference/debugging)
CREATE INDEX IF NOT EXISTS idx_srm_cookies_srm_user_id ON srm_cookies(srm_user_id);

-- Drop old index on user_email if it exists
DROP INDEX IF EXISTS idx_srm_cookies_user_email;

-- ============================================================================
-- STEP 5: Update comments
-- ============================================================================

COMMENT ON TABLE srm_cookies IS 'Stores SRM Academia session cookies per user for HTTP-based attendance scraping. PASSWORDS ARE NEVER STORED - only session cookies.';
COMMENT ON COLUMN srm_cookies.user_id IS 'Internal application user ID (UUID) - used to identify which user owns these cookies';
COMMENT ON COLUMN srm_cookies.srm_user_id IS 'SRM login ID (email/username) - stored for reference/debugging only, NOT used for authentication';
COMMENT ON COLUMN srm_cookies.cookies_json IS 'Serialized array of cookie objects as JSON string';
COMMENT ON COLUMN srm_cookies.last_validated_at IS 'Timestamp when session was last validated as still active';
COMMENT ON COLUMN srm_cookies.expires_at IS 'Optional expiration time if known from cookie max-age';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ SRM cookies table updated for user-based login';
  RAISE NOTICE '✅ user_id column added/indexed';
  RAISE NOTICE '✅ srm_user_id column added for reference';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANT: Passwords are NEVER stored in this table. Only session cookies.';
END $$;

