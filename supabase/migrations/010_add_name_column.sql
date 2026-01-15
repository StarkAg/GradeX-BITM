-- Migration: Add name column to users table
-- This stores the student's full name extracted from timetable data

-- Add name column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Create index for name lookups (optional, for faster searches)
CREATE INDEX IF NOT EXISTS idx_users_name ON public.users(name) WHERE name IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.name IS 'Student full name extracted from timetable data (e.g., "Ushika Lunawat")';

