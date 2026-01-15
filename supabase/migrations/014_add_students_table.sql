-- ============================================================================
-- Add Students Table for GroupGrid
-- ============================================================================
-- This table stores student information linked to sections
-- ============================================================================

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS public.students CASCADE;

-- Create students table
CREATE TABLE public.students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registration_number TEXT NOT NULL,
    name TEXT NOT NULL,
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_number, section_id) -- Prevent duplicate registration numbers per section
);

-- Indexes for faster lookups
CREATE INDEX idx_students_section_id ON public.students(section_id);
CREATE INDEX idx_students_registration_number ON public.students(registration_number);
CREATE INDEX idx_students_name ON public.students(name);

-- Enable Row Level Security
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
CREATE POLICY "Allow public read access to students"
ON public.students
FOR SELECT
USING (true);

-- Allow authenticated users to insert students
DROP POLICY IF EXISTS "Allow authenticated users to insert students" ON public.students;
CREATE POLICY "Allow authenticated users to insert students"
ON public.students
FOR INSERT
WITH CHECK (true); -- Application validates section_id

-- Allow authenticated users to update students
DROP POLICY IF EXISTS "Allow authenticated users to update students" ON public.students;
CREATE POLICY "Allow authenticated users to update students"
ON public.students
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.students TO anon;
GRANT SELECT, INSERT, UPDATE ON public.students TO authenticated;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_students_updated_at ON public.students;
CREATE TRIGGER update_students_updated_at
    BEFORE UPDATE ON public.students
    FOR EACH ROW
    EXECUTE FUNCTION update_students_updated_at();

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'students'
    ) THEN
        RAISE NOTICE '✓ Students table created successfully';
    ELSE
        RAISE WARNING '⚠ Students table not found';
    END IF;
END $$;

