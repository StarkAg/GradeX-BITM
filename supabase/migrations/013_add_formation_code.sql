-- Add formation_code column to group_formations table
ALTER TABLE public.group_formations 
ADD COLUMN IF NOT EXISTS formation_code TEXT UNIQUE;

-- Add subject_name column for custom subjects
ALTER TABLE public.group_formations
ADD COLUMN IF NOT EXISTS subject_name TEXT;

-- Add section_name column for custom sections
ALTER TABLE public.group_formations
ADD COLUMN IF NOT EXISTS section_name TEXT;

-- Make subject_id nullable to allow custom subjects
ALTER TABLE public.group_formations 
ALTER COLUMN subject_id DROP NOT NULL;

-- Make section_id nullable to allow custom sections
ALTER TABLE public.group_formations 
ALTER COLUMN section_id DROP NOT NULL;

-- Create index for faster lookups by code
CREATE INDEX IF NOT EXISTS idx_group_formations_code ON public.group_formations(formation_code);

-- Create indexes for custom names
CREATE INDEX IF NOT EXISTS idx_group_formations_section_name ON public.group_formations(section_name);
CREATE INDEX IF NOT EXISTS idx_group_formations_subject_name ON public.group_formations(subject_name);

-- Add check constraints to ensure at least one is provided
ALTER TABLE public.group_formations
DROP CONSTRAINT IF EXISTS check_section_provided;

ALTER TABLE public.group_formations
ADD CONSTRAINT check_section_provided 
CHECK (section_id IS NOT NULL OR section_name IS NOT NULL);

ALTER TABLE public.group_formations
DROP CONSTRAINT IF EXISTS check_subject_provided;

ALTER TABLE public.group_formations
ADD CONSTRAINT check_subject_provided 
CHECK (subject_id IS NOT NULL OR subject_name IS NOT NULL);

-- Generate codes for existing formations (if any)
UPDATE public.group_formations
SET formation_code = UPPER(SUBSTRING(MD5(RANDOM()::TEXT || id::TEXT || NOW()::TEXT), 1, 8))
WHERE formation_code IS NULL;

