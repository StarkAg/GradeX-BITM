-- Migration: Add rooms and venues columns to enquiries table
-- Run this in Supabase SQL Editor to add room and venue tracking

-- Add rooms column (array of text)
ALTER TABLE enquiries 
ADD COLUMN IF NOT EXISTS rooms TEXT[] DEFAULT '{}';

-- Add venues column (array of text)
ALTER TABLE enquiries 
ADD COLUMN IF NOT EXISTS venues TEXT[] DEFAULT '{}';

-- Add floors column (array of text)
ALTER TABLE enquiries 
ADD COLUMN IF NOT EXISTS floors TEXT[] DEFAULT '{}';

-- Add comments for documentation
COMMENT ON COLUMN enquiries.rooms IS 'Array with single room number where student has exam (e.g., ["TP-401"]) - one room per person';
COMMENT ON COLUMN enquiries.venues IS 'Array with single venue/building name (e.g., ["Tech Park"]) - one venue per person';
COMMENT ON COLUMN enquiries.floors IS 'Array with single floor number (e.g., ["4th"]) - one floor per person';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'enquiries'
  AND column_name IN ('rooms', 'venues', 'floors');

