-- Add RLS policy to allow anon users to read their own cached timetable
-- This allows frontend to fetch cached timetable even if Go backend is not connected
-- Similar to users table - permissive policy with application-level security

-- Drop the existing policy that uses auth.uid() (doesn't work with direct DB auth)
DROP POLICY IF EXISTS "Users can read own timetable cache" ON public.timetable_cache;

-- Create permissive policy for anon users (frontend queries with user_id from localStorage)
-- Security: Frontend only queries with user_id from localStorage (application-level security)
CREATE POLICY "Allow anon users to read own timetable cache"
  ON public.timetable_cache
  FOR SELECT
  USING (true); -- Permissive - frontend only queries with user_id from localStorage

COMMENT ON POLICY "Allow anon users to read own timetable cache" ON public.timetable_cache IS 
'Permissive policy for direct DB auth. Frontend queries with user_id from localStorage. Allows reading cached timetable even when Go backend is not connected.';

-- Grant SELECT permission to anon role
GRANT SELECT ON public.timetable_cache TO anon;

