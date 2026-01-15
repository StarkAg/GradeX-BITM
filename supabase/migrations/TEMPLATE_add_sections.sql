-- ============================================================================
-- Template: Add More Sections to Database
-- ============================================================================
-- This is a template file showing how to add more sections to the database
-- Sections will automatically appear in the dropdown when creating formations
-- ============================================================================
-- Instructions:
-- 1. Copy this file and rename it (e.g., 017_add_more_sections.sql)
-- 2. Replace the section names below with your actual sections
-- 3. Run in Supabase SQL Editor
-- ============================================================================

-- Add sections (using ON CONFLICT to prevent duplicates if run multiple times)
INSERT INTO public.sections (name)
VALUES 
    ('A'),      -- Replace with your section names
    ('B'),      -- Replace with your section names
    ('C'),      -- Replace with your section names
    ('P1'),     -- Example: P1 section
    ('P2'),     -- P2 already exists, but included here as example
    ('P3'),     -- Example: P3 section
    -- Add more sections as needed
    -- ('Section Name')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- Verification
-- ============================================================================
-- Check all sections in database
SELECT id, name, created_at 
FROM public.sections 
ORDER BY name;

-- Count total sections
SELECT COUNT(*) as total_sections FROM public.sections;

-- ============================================================================
-- Notes:
-- ============================================================================
-- 1. Sections are automatically loaded in the dropdown via /api/groupgrid?action=get-sections
-- 2. You can also type custom section names if a section doesn't exist in the dropdown
-- 3. After adding sections, they will immediately appear in the "Create Group Formation" modal
-- 4. Sections are ordered alphabetically in the dropdown
-- ============================================================================

