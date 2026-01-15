-- Diagnostic Script: Check GroupGrid Schema State
-- Run this to see what's missing or broken in your schema
-- This helps identify what needs to be fixed

-- ============================================================================
-- CHECK 1: Verify tables exist
-- ============================================================================
SELECT 
  'Tables Check' as check_type,
  table_name,
  CASE 
    WHEN table_name IN ('sections', 'subjects', 'group_formations', 'groups', 'group_members', 'group_student_members', 'students')
    THEN '✓ EXISTS'
    ELSE '✗ MISSING'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('sections', 'subjects', 'group_formations', 'groups', 'group_members', 'group_student_members', 'students')
ORDER BY table_name;

-- ============================================================================
-- CHECK 2: Verify foreign key relationships
-- ============================================================================
SELECT 
  'Foreign Keys Check' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  tc.constraint_name,
  '✓ EXISTS' as status
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND (
    tc.table_name = 'group_members' OR
    tc.table_name = 'groups' OR
    tc.table_name = 'group_formations' OR
    tc.table_name = 'group_student_members'
  )
ORDER BY tc.table_name, kcu.column_name;

-- ============================================================================
-- CHECK 3: Check for missing group_members -> groups relationship
-- ============================================================================
SELECT 
  'Missing Relationship Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_schema = 'public' 
      AND table_name = 'group_members' 
      AND constraint_name LIKE '%group_id%fkey%'
    ) THEN '✓ Relationship EXISTS'
    ELSE '✗ Relationship MISSING - Run migration 018_fix_groups_group_members_relationship.sql'
  END as group_members_to_groups_relationship;

-- ============================================================================
-- CHECK 4: Verify indexes exist
-- ============================================================================
SELECT 
  'Indexes Check' as check_type,
  tablename,
  indexname,
  '✓ EXISTS' as status
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================================================
-- CHECK 5: Check RLS policies
-- ============================================================================
SELECT 
  'RLS Policies Check' as check_type,
  tablename,
  policyname,
  '✓ EXISTS' as status
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('groups', 'group_members')
ORDER BY tablename, policyname;

-- ============================================================================
-- CHECK 6: Count records (to verify data integrity)
-- ============================================================================
SELECT 
  'Data Count Check' as check_type,
  'groups' as table_name,
  COUNT(*) as record_count
FROM public.groups
UNION ALL
SELECT 
  'Data Count Check' as check_type,
  'group_members' as table_name,
  COUNT(*) as record_count
FROM public.group_members;

