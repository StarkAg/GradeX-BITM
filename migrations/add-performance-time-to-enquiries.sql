-- Migration: Add performance_time column to enquiries table
-- Run this in Supabase SQL Editor to add performance time tracking

-- Add performance_time column (integer in milliseconds)
ALTER TABLE enquiries 
ADD COLUMN IF NOT EXISTS performance_time INTEGER DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN enquiries.performance_time IS 'Time taken to fetch seat information in milliseconds';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'enquiries'
  AND column_name = 'performance_time';

