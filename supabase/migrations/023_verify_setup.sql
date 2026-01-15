-- Quick Verification Script
-- Run this after migrations to verify everything is set up correctly

-- ============================================================================
-- 1. Check GroupGrid Tables Exist
-- ============================================================================
SELECT 
  'GroupGrid Tables' as check_type,
  table_name,
  '✓ EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'group_formations', 'sections', 'subjects', 'students', 'group_student_members')
ORDER BY table_name;

-- ============================================================================
-- 2. Check groups -> group_members relationship exists
-- ============================================================================
SELECT 
  'Foreign Key Relationship' as check_type,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
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
  AND tc.table_name = 'group_members'
  AND ccu.table_name = 'groups';

-- ============================================================================
-- 3. Check SRM cookies table exists
-- ============================================================================
SELECT 
  'SRM Cookies Table' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'srm_cookies'
    ) THEN '✓ EXISTS'
    ELSE '✗ MISSING - Run migration 017'
  END as status;

-- ============================================================================
-- 4. Check SRM cookies table structure (if exists)
-- ============================================================================
SELECT 
  'SRM Cookies Columns' as check_type,
  column_name,
  data_type,
  CASE 
    WHEN column_name = 'user_id' THEN '✓ REQUIRED'
    WHEN column_name = 'srm_user_id' THEN '✓ REQUIRED'
    WHEN column_name = 'cookies_json' THEN '✓ REQUIRED'
    ELSE '✓ OK'
  END as status
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'srm_cookies'
ORDER BY ordinal_position;

-- ============================================================================
-- Summary
-- ============================================================================
DO $$ 
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Verification Complete!';
  RAISE NOTICE 'Check the results above for any missing items.';
  RAISE NOTICE '========================================';
END $$;

