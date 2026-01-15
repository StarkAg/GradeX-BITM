-- ============================================================================
-- GroupGrid Database Schema
-- ============================================================================
-- Creates all tables needed for the GroupGrid feature
-- Run this in Supabase SQL Editor
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE SECTIONS TABLE
-- ============================================================================
-- Drop table if it exists with wrong structure (be careful in production!)
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.group_formations CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.sections CASCADE;

CREATE TABLE public.sections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_sections_name ON public.sections(name);

-- ============================================================================
-- STEP 2: CREATE SUBJECTS TABLE
-- ============================================================================
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    section_id UUID REFERENCES public.sections(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, section_id) -- Prevent duplicate subject names per section
);

-- Indexes
CREATE INDEX idx_subjects_section_id ON public.subjects(section_id);
CREATE INDEX idx_subjects_name ON public.subjects(name);

-- ============================================================================
-- STEP 3: CREATE GROUP_FORMATIONS TABLE
-- ============================================================================
CREATE TABLE public.group_formations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    section_id UUID NOT NULL REFERENCES public.sections(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    members_per_team INTEGER NOT NULL CHECK (members_per_team >= 2 AND members_per_team <= 8),
    include_title BOOLEAN DEFAULT true,
    created_by UUID NOT NULL, -- User ID (references users.id)
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_group_formations_section_id ON public.group_formations(section_id);
CREATE INDEX idx_group_formations_subject_id ON public.group_formations(subject_id);
CREATE INDEX idx_group_formations_created_by ON public.group_formations(created_by);
CREATE INDEX idx_group_formations_status ON public.group_formations(status);

-- ============================================================================
-- STEP 4: CREATE GROUPS TABLE
-- ============================================================================
CREATE TABLE public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    formation_id UUID NOT NULL REFERENCES public.group_formations(id) ON DELETE CASCADE,
    title TEXT, -- Nullable, auto-generated if include_title is true
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index
CREATE INDEX idx_groups_formation_id ON public.groups(formation_id);

-- ============================================================================
-- STEP 5: CREATE GROUP_MEMBERS TABLE
-- ============================================================================
CREATE TABLE public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL, -- References users.id
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(group_id, user_id) -- Prevent duplicate joins
);

-- Indexes
CREATE INDEX idx_group_members_group_id ON public.group_members(group_id);
CREATE INDEX idx_group_members_user_id ON public.group_members(user_id);

-- ============================================================================
-- STEP 6: ENABLE ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_formations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 7: CREATE RLS POLICIES
-- ============================================================================

-- Sections: Public read access
DROP POLICY IF EXISTS "Allow public read access to sections" ON public.sections;
CREATE POLICY "Allow public read access to sections"
ON public.sections
FOR SELECT
USING (true);

-- Subjects: Public read access
DROP POLICY IF EXISTS "Allow public read access to subjects" ON public.subjects;
CREATE POLICY "Allow public read access to subjects"
ON public.subjects
FOR SELECT
USING (true);

-- Group Formations: Read all, insert own, update own
DROP POLICY IF EXISTS "Allow public read access to group_formations" ON public.group_formations;
CREATE POLICY "Allow public read access to group_formations"
ON public.group_formations
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create formations" ON public.group_formations;
CREATE POLICY "Allow authenticated users to create formations"
ON public.group_formations
FOR INSERT
WITH CHECK (true); -- Application-level validation for created_by

DROP POLICY IF EXISTS "Allow formation creators to update" ON public.group_formations;
CREATE POLICY "Allow formation creators to update"
ON public.group_formations
FOR UPDATE
USING (true) -- Allow updates (application validates creator)
WITH CHECK (true);

-- Groups: Read all, insert via formation
DROP POLICY IF EXISTS "Allow public read access to groups" ON public.groups;
CREATE POLICY "Allow public read access to groups"
ON public.groups
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to create groups" ON public.groups;
CREATE POLICY "Allow authenticated users to create groups"
ON public.groups
FOR INSERT
WITH CHECK (true); -- Application validates formation ownership

-- Group Members: Read all, insert own, delete own
DROP POLICY IF EXISTS "Allow public read access to group_members" ON public.group_members;
CREATE POLICY "Allow public read access to group_members"
ON public.group_members
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow authenticated users to join groups" ON public.group_members;
CREATE POLICY "Allow authenticated users to join groups"
ON public.group_members
FOR INSERT
WITH CHECK (true); -- Application validates user_id and prevents duplicates

DROP POLICY IF EXISTS "Allow users to leave groups" ON public.group_members;
CREATE POLICY "Allow users to leave groups"
ON public.group_members
FOR DELETE
USING (true); -- Application validates user_id

-- ============================================================================
-- STEP 8: GRANT PERMISSIONS
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON public.sections TO anon;
GRANT SELECT ON public.subjects TO anon;
GRANT SELECT, INSERT, UPDATE ON public.group_formations TO anon;
GRANT SELECT, INSERT ON public.groups TO anon;
GRANT SELECT, INSERT, DELETE ON public.group_members TO anon;

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON public.sections TO authenticated;
GRANT SELECT ON public.subjects TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.group_formations TO authenticated;
GRANT SELECT, INSERT ON public.groups TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;

-- ============================================================================
-- STEP 9: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for group_formations
DROP TRIGGER IF EXISTS update_group_formations_updated_at ON public.group_formations;
CREATE TRIGGER update_group_formations_updated_at
    BEFORE UPDATE ON public.group_formations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 10: VERIFY SETUP
-- ============================================================================
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN ('sections', 'subjects', 'group_formations', 'groups', 'group_members');
    
    IF table_count = 5 THEN
        RAISE NOTICE '✓ All GroupGrid tables created successfully';
    ELSE
        RAISE WARNING '⚠ Only % out of 5 tables found', table_count;
    END IF;
END $$;

