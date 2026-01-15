-- ============================================================================
-- Add Group Student Members Table
-- ============================================================================
-- This table links groups to students (from the students table)
-- Separate from group_members which links to authenticated users
-- ============================================================================

-- Drop table if exists (for clean recreation)
DROP TABLE IF EXISTS public.group_student_members CASCADE;

-- Create group_student_members table
CREATE TABLE public.group_student_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    registration_number TEXT NOT NULL, -- Denormalized for quick access
    name TEXT NOT NULL, -- Denormalized for quick access
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, student_id) -- Prevent duplicate joins
);

-- Indexes for faster lookups
CREATE INDEX idx_group_student_members_group_id ON public.group_student_members(group_id);
CREATE INDEX idx_group_student_members_student_id ON public.group_student_members(student_id);
CREATE INDEX idx_group_student_members_registration_number ON public.group_student_members(registration_number);

-- Enable Row Level Security
ALTER TABLE public.group_student_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Allow public read access
DROP POLICY IF EXISTS "Allow public read access to group_student_members" ON public.group_student_members;
CREATE POLICY "Allow public read access to group_student_members"
ON public.group_student_members
FOR SELECT
USING (true);

-- Allow authenticated users to insert student members
DROP POLICY IF EXISTS "Allow authenticated users to insert student members" ON public.group_student_members;
CREATE POLICY "Allow authenticated users to insert student members"
ON public.group_student_members
FOR INSERT
WITH CHECK (true); -- Application validates group ownership

-- Allow authenticated users to delete student members
DROP POLICY IF EXISTS "Allow users to remove student members" ON public.group_student_members;
CREATE POLICY "Allow users to remove student members"
ON public.group_student_members
FOR DELETE
USING (true); -- Application validates permissions

-- Grant permissions
GRANT SELECT, INSERT, DELETE ON public.group_student_members TO anon;
GRANT SELECT, INSERT, DELETE ON public.group_student_members TO authenticated;

-- ============================================================================
-- VERIFY SETUP
-- ============================================================================
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'group_student_members'
    ) THEN
        RAISE NOTICE '✓ Group student members table created successfully';
    ELSE
        RAISE WARNING '⚠ Group student members table not found';
    END IF;
END $$;

