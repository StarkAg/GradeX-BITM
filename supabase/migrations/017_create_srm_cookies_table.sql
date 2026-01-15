-- Migration: Create SRM cookies storage table (Per-User)
-- Purpose: Store SRM session cookies for attendance scraping per user
-- This table persists cookies between server restarts
-- PASSWORDS ARE NEVER STORED - Only session cookies

CREATE TABLE IF NOT EXISTS srm_cookies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE, -- Internal app user ID (not SRM credentials)
  srm_user_id TEXT NOT NULL, -- SRM login ID (email/username) - stored for reference only
  cookies_json TEXT NOT NULL, -- Serialized cookie array as JSON string
  expires_at TIMESTAMPTZ, -- When cookies expire (if known)
  last_validated_at TIMESTAMPTZ, -- When session was last validated
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for quick lookups by user_id
CREATE INDEX IF NOT EXISTS idx_srm_cookies_user_id ON srm_cookies(user_id);

-- Index for quick lookups by SRM user ID (for debugging/reference)
CREATE INDEX IF NOT EXISTS idx_srm_cookies_srm_user_id ON srm_cookies(srm_user_id);

-- Index for cleanup of expired sessions
CREATE INDEX IF NOT EXISTS idx_srm_cookies_expires_at ON srm_cookies(expires_at) WHERE expires_at IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_srm_cookies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_srm_cookies_updated_at
  BEFORE UPDATE ON srm_cookies
  FOR EACH ROW
  EXECUTE FUNCTION update_srm_cookies_updated_at();

-- RLS Policies (if RLS is enabled)
-- Allow service role to read/write (for server-side scraping)
ALTER TABLE srm_cookies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
-- Note: DROP POLICY IF EXISTS is supported in PostgreSQL 9.5+
DO $$ 
BEGIN
  -- Drop existing policies (IF EXISTS prevents errors if they don't exist)
  DROP POLICY IF EXISTS "Service role can manage all cookies" ON srm_cookies;
  DROP POLICY IF EXISTS "Users can read their own cookies" ON srm_cookies;
EXCEPTION WHEN OTHERS THEN
  -- If DROP POLICY IF EXISTS is not supported, policies will be created/replaced below
  -- This is safe - CREATE POLICY will error if policy exists, but we handle that
  NULL;
END $$;

-- Create service role policy
-- If policy already exists, this will fail - but that's okay for idempotency
DO $$ 
BEGIN
  CREATE POLICY "Service role can manage all cookies"
    ON srm_cookies
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');
EXCEPTION WHEN duplicate_object THEN
  -- Policy already exists, that's fine
  RAISE NOTICE 'Policy "Service role can manage all cookies" already exists, skipping';
END $$;

-- Note: RLS policies are managed by service role only
-- Application-level authorization is handled in the API layer
-- This is secure because service role is server-side only

COMMENT ON TABLE srm_cookies IS 'Stores SRM Academia session cookies per user for HTTP-based attendance scraping. PASSWORDS ARE NEVER STORED.';
COMMENT ON COLUMN srm_cookies.user_id IS 'Internal application user ID (not SRM credentials)';
COMMENT ON COLUMN srm_cookies.srm_user_id IS 'SRM login ID (email/username) - stored for reference only, not used for authentication';
COMMENT ON COLUMN srm_cookies.cookies_json IS 'Serialized array of cookie objects as JSON string';
COMMENT ON COLUMN srm_cookies.expires_at IS 'Optional expiration time if known from cookie max-age';
COMMENT ON COLUMN srm_cookies.last_validated_at IS 'Timestamp when session was last validated as still active';

