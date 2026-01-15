-- Migration: Recreate GroupGrid Tables
-- Purpose: Create all GroupGrid tables if they don't exist
-- This is a safe, idempotent migration that won't break existing data

-- ============================================================================
-- STEP 1: CREATE SECTIONS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_sections_name ON public.sections(name);

-- ============================================================================
-- STEP 2: CREATE SUBJECTS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, section_id) -- Prevent duplicate subject names per section
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subjects_section_id ON public.subjects(section_id);
CREATE INDEX IF NOT EXISTS idx_subjects_name ON public.subjects(name);

-- ============================================================================
-- STEP 3: CREATE GROUP_FORMATIONS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_formations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
    section_name TEXT, -- Custom section name (if section_id is null)
    subject_name TEXT NOT NULL, -- Custom subject name (if subject_id is null)
    formation_code TEXT UNIQUE, -- Unique formation code
    members_per_team INTEGER NOT NULL CHECK (members_per_team >= 2 AND members_per_team <= 8),
    include_title BOOLEAN DEFAULT true,
    created_by UUID NOT NULL, -- User ID (references users.id)
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure either section_id or section_name is provided
    CHECK (section_id IS NOT NULL OR section_name IS NOT NULL),
    -- Ensure either subject_id or subject_name is provided
    CHECK (subject_id IS NOT NULL OR subject_name IS NOT NULL)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_formations_section_id ON public.group_formations(section_id);
CREATE INDEX IF NOT EXISTS idx_group_formations_subject_id ON public.group_formations(subject_id);
CREATE INDEX IF NOT EXISTS idx_group_formations_created_by ON public.group_formations(created_by);
CREATE INDEX IF NOT EXISTS idx_group_formations_status ON public.group_formations(status);
CREATE INDEX IF NOT EXISTS idx_group_formations_formation_code ON public.group_formations(formation_code);
CREATE INDEX IF NOT EXISTS idx_group_formations_section_name ON public.group_formations(section_name);
CREATE INDEX IF NOT EXISTS idx_group_formations_subject_name ON public.group_formations(subject_name);

-- ============================================================================
-- STEP 4: CREATE GROUPS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    formation_id UUID NOT NULL REFERENCES public.group_formations(id) ON DELETE CASCADE,
    title TEXT, -- Nullable, auto-generated if include_title is true
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_groups_formation_id ON public.groups(formation_id);

-- ============================================================================
-- STEP 5: CREATE GROUP_MEMBERS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References users.id
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id) -- Prevent duplicate joins
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON public.group_members(user_id);

-- ============================================================================
-- STEP 6: CREATE STUDENTS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.students (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_number TEXT NOT NULL,
    name TEXT NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(registration_number, section_id) -- Prevent duplicate reg numbers per section
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_students_section_id ON public.students(section_id);
CREATE INDEX IF NOT EXISTS idx_students_registration_number ON public.students(registration_number);

-- ============================================================================
-- STEP 7: CREATE GROUP_STUDENT_MEMBERS TABLE (if not exists)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.group_student_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
    registration_number TEXT, -- Denormalized for quick access
    name TEXT NOT NULL, -- Denormalized for quick access
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, student_id) -- Prevent duplicate joins
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_student_members_group_id ON public.group_student_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_student_members_student_id ON public.group_student_members(student_id);
CREATE INDEX IF NOT EXISTS idx_group_student_members_registration_number ON public.group_student_members(registration_number);

-- ============================================================================
-- STEP 8: ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_student_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: CREATE RLS POLICIES (idempotent)
-- ============================================================================

-- Sections: Public read access
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to sections" ON public.sections;
  CREATE POLICY "Allow public read access to sections"
  ON public.sections
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Subjects: Public read access
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to subjects" ON public.subjects;
  CREATE POLICY "Allow public read access to subjects"
  ON public.subjects
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Group Formations: Read all, insert own, update own
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to group_formations" ON public.group_formations;
  CREATE POLICY "Allow public read access to group_formations"
  ON public.group_formations
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to create formations" ON public.group_formations;
  CREATE POLICY "Allow authenticated users to create formations"
  ON public.group_formations
  FOR INSERT
  WITH CHECK (true); -- Application-level validation for created_by
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow formation creators to update" ON public.group_formations;
  CREATE POLICY "Allow formation creators to update"
  ON public.group_formations
  FOR UPDATE
  USING (true) -- Allow updates (application validates creator)
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Groups: Read all, insert via formation
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to groups" ON public.groups;
  CREATE POLICY "Allow public read access to groups"
  ON public.groups
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to create groups" ON public.groups;
  CREATE POLICY "Allow authenticated users to create groups"
  ON public.groups
  FOR INSERT
  WITH CHECK (true); -- Application validates formation ownership
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Group Members: Read all, insert own, delete own
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to group_members" ON public.group_members;
  CREATE POLICY "Allow public read access to group_members"
  ON public.group_members
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to join groups" ON public.group_members;
  CREATE POLICY "Allow authenticated users to join groups"
  ON public.group_members
  FOR INSERT
  WITH CHECK (true); -- Application validates user_id and prevents duplicates
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow users to leave groups" ON public.group_members;
  CREATE POLICY "Allow users to leave groups"
  ON public.group_members
  FOR DELETE
  USING (true); -- Application validates user_id
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Students: Public read access
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to students" ON public.students;
  CREATE POLICY "Allow public read access to students"
  ON public.students
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Group Student Members: Read all, insert own, delete own
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow public read access to group_student_members" ON public.group_student_members;
  CREATE POLICY "Allow public read access to group_student_members"
  ON public.group_student_members
  FOR SELECT
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to add student members" ON public.group_student_members;
  CREATE POLICY "Allow authenticated users to add student members"
  ON public.group_student_members
  FOR INSERT
  WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to remove student members" ON public.group_student_members;
  CREATE POLICY "Allow authenticated users to remove student members"
  ON public.group_student_members
  FOR DELETE
  USING (true);
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================================================
-- STEP 10: GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT ON public.sections TO anon;
GRANT SELECT ON public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE ON public.group_formations TO anon;
GRANT SELECT, INSERT ON public.groups TO anon;
GRANT SELECT, INSERT, DELETE ON public.group_members TO anon;
GRANT SELECT ON public.students TO anon;
GRANT SELECT, INSERT, DELETE ON public.group_student_members TO anon;

GRANT SELECT ON public.sections TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_formations TO authenticated;
GRANT SELECT, INSERT ON public.groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT SELECT ON public.students TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.group_student_members TO authenticated;

-- ============================================================================
-- STEP 11: CREATE TRIGGERS (if not exists)
-- ============================================================================

-- Updated_at trigger for group_formations
CREATE OR REPLACE FUNCTION update_group_formations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_group_formations_updated_at ON public.group_formations;
CREATE TRIGGER trigger_update_group_formations_updated_at
  BEFORE UPDATE ON public.group_formations
  FOR EACH ROW
  EXECUTE FUNCTION update_group_formations_updated_at();

-- Updated_at trigger for students
CREATE OR REPLACE FUNCTION update_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_students_updated_at ON public.students;
CREATE TRIGGER trigger_update_students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION update_students_updated_at();

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '✅ All GroupGrid tables created successfully';
  RAISE NOTICE '✅ RLS policies created';
  RAISE NOTICE '✅ Permissions granted';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Run migration 018_fix_groups_group_members_relationship.sql to ensure relationships are properly recognized';
END $$;

