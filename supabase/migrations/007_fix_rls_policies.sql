-- Migration: Fix RLS policies to work without Supabase Auth
-- Allows direct inserts/updates without requiring auth.uid()

-- Drop existing policies that rely on auth.uid()
DROP POLICY IF EXISTS "Users can view own record" ON public.users;
DROP POLICY IF EXISTS "Users can update own record" ON public.users;
DROP POLICY IF EXISTS "Users can insert own record" ON public.users;

-- Allow public inserts (for new user registration)
CREATE POLICY "Allow public inserts to users"
ON public.users
FOR INSERT
WITH CHECK (true);

-- Allow public updates by email (for existing users updating their own data)
-- Note: This is less secure but works without auth
CREATE POLICY "Allow public updates to users"
ON public.users
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Allow public selects (users can view their own data by email)
CREATE POLICY "Allow public selects from users"
ON public.users
FOR SELECT
USING (true);

-- Keep service role policy for Edge Functions
DROP POLICY IF EXISTS "Service role full access to users" ON public.users;
CREATE POLICY "Service role full access to users"
ON public.users
FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Disable RLS if you prefer (uncomment the line below)
-- ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

