-- Create timetable cache table
-- Stores parsed timetable data with TTL (time-to-live) for automatic expiration

CREATE TABLE IF NOT EXISTS public.timetable_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  registration_number TEXT,
  academic_year TEXT,
  batch_number INTEGER,
  student_name TEXT,
  program TEXT,
  department TEXT,
  semester TEXT,
  courses JSONB NOT NULL, -- Array of course objects
  raw_data JSONB, -- Full timetable response for debugging
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'), -- Cache for 7 days
  UNIQUE(user_id) -- One cache entry per user
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_timetable_cache_user_id ON public.timetable_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_timetable_cache_registration_number ON public.timetable_cache(registration_number);
CREATE INDEX IF NOT EXISTS idx_timetable_cache_expires_at ON public.timetable_cache(expires_at);

-- Function to automatically clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_timetable_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.timetable_cache
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE public.timetable_cache ENABLE ROW LEVEL SECURITY;

-- Users can only read their own timetable cache
CREATE POLICY "Users can read own timetable cache"
  ON public.timetable_cache
  FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() IN (
    SELECT id FROM public.users WHERE id = user_id
  ));

-- Service role can do everything (for backend operations)
CREATE POLICY "Service role full access"
  ON public.timetable_cache
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role');

-- Comments
COMMENT ON TABLE public.timetable_cache IS 'Caches timetable data for users to reduce SRM Academia scraping load';
COMMENT ON COLUMN public.timetable_cache.expires_at IS 'Cache expires after 7 days (timetables change per semester)';
COMMENT ON COLUMN public.timetable_cache.courses IS 'Array of course objects with slot, name, code, room, etc.';

