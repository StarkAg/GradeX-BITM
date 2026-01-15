-- Migration: Fix relationship between groups and group_members
-- Purpose: Ensure foreign key constraint exists and is recognized by Supabase
-- This fixes: "Could not find a relationship between 'groups' and 'group_members'"

-- ============================================================================
-- STEP 1: Check and recreate foreign key constraint if missing
-- ============================================================================

-- Drop existing constraint if it exists (to recreate it properly)
DO $$ 
BEGIN
  -- Check if constraint exists and drop it
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'group_members' 
    AND constraint_name = 'group_members_group_id_fkey'
  ) THEN
    ALTER TABLE public.group_members 
    DROP CONSTRAINT group_members_group_id_fkey;
    RAISE NOTICE 'Dropped existing foreign key constraint';
  END IF;
END $$;

-- Recreate the foreign key constraint explicitly
-- This ensures Supabase recognizes the relationship
ALTER TABLE public.group_members
ADD CONSTRAINT group_members_group_id_fkey
FOREIGN KEY (group_id)
REFERENCES public.groups(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================================================
-- STEP 2: Verify the constraint exists
-- ============================================================================
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.table_constraints 
    WHERE constraint_schema = 'public' 
    AND table_name = 'group_members' 
    AND constraint_name = 'group_members_group_id_fkey'
  ) THEN
    RAISE NOTICE 'Foreign key constraint created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create foreign key constraint';
  END IF;
END $$;

-- ============================================================================
-- STEP 3: Ensure indexes exist for performance
-- ============================================================================

-- Index on group_id (for foreign key lookups)
CREATE INDEX IF NOT EXISTS idx_group_members_group_id 
ON public.group_members(group_id);

-- Index on user_id (for user lookups)
CREATE INDEX IF NOT EXISTS idx_group_members_user_id 
ON public.group_members(user_id);

-- Composite index for unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_group_members_group_user_unique 
ON public.group_members(group_id, user_id);

-- ============================================================================
-- STEP 4: Grant necessary permissions (if missing)
-- ============================================================================

-- Ensure anon role has access
GRANT SELECT, INSERT, DELETE ON public.group_members TO anon;
GRANT SELECT, INSERT, DELETE ON public.groups TO anon;

-- Ensure authenticated role has access
GRANT SELECT, INSERT, DELETE ON public.group_members TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.groups TO authenticated;

-- ============================================================================
-- STEP 5: Verify tables exist (safety check)
-- ============================================================================

DO $$ 
BEGIN
  -- Check if groups table exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'groups'
  ) THEN
    RAISE EXCEPTION 'Table "groups" does not exist. Please run migration 020_recreate_groupgrid_tables.sql first.';
  END IF;

  -- Check if group_members table exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'group_members'
  ) THEN
    RAISE EXCEPTION 'Table "group_members" does not exist. Please run migration 020_recreate_groupgrid_tables.sql first.';
  END IF;

  RAISE NOTICE 'Both tables exist, proceeding with relationship fix';
END $$;

-- ============================================================================
-- VERIFICATION QUERY (run separately to verify)
-- ============================================================================
-- Run this query to verify the relationship is working:
-- 
-- SELECT 
--   tc.constraint_name, 
--   tc.table_name, 
--   kcu.column_name,
--   ccu.table_name AS foreign_table_name,
--   ccu.column_name AS foreign_column_name 
-- FROM information_schema.table_constraints AS tc 
-- JOIN information_schema.key_column_usage AS kcu
--   ON tc.constraint_name = kcu.constraint_name
--   AND tc.table_schema = kcu.table_schema
-- JOIN information_schema.constraint_column_usage AS ccu
--   ON ccu.constraint_name = tc.constraint_name
--   AND ccu.table_schema = tc.table_schema
-- WHERE tc.constraint_type = 'FOREIGN KEY' 
--   AND tc.table_name = 'group_members'
--   AND ccu.table_name = 'groups';

COMMENT ON CONSTRAINT group_members_group_id_fkey ON public.group_members IS 
'Foreign key relationship: group_members.group_id -> groups.id. This enables Supabase to recognize the relationship for nested queries.';

