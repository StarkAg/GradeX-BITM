-- ============================================================================
-- GroupGrid Seed Data
-- ============================================================================
-- Optional: Add sample sections and subjects for testing
-- Run this after the main migration (012_groupgrid_schema.sql)
-- ============================================================================

-- Add sample sections (adjust as needed for your institution)
INSERT INTO public.sections (name) VALUES
  ('A'),
  ('B'),
  ('C'),
  ('D'),
  ('E')
ON CONFLICT (name) DO NOTHING;

-- Add sample subjects (adjust section_id based on your actual section IDs)
-- Note: You may need to adjust the section names if they differ
INSERT INTO public.subjects (name, section_id) 
SELECT 
  subject_name,
  s.id as section_id
FROM (
  VALUES
    ('Data Structures', 'A'),
    ('Algorithms', 'A'),
    ('Database Systems', 'A'),
    ('Operating Systems', 'A'),
    ('Computer Networks', 'A'),
    ('Software Engineering', 'B'),
    ('Web Development', 'B'),
    ('Mobile App Development', 'B'),
    ('Machine Learning', 'B'),
    ('Artificial Intelligence', 'B'),
    ('Cloud Computing', 'C'),
    ('Cybersecurity', 'C'),
    ('Data Science', 'C'),
    ('Blockchain Technology', 'C'),
    ('IoT Development', 'C')
) AS subjects_data(subject_name, section_name)
INNER JOIN public.sections s ON s.name = subjects_data.section_name
ON CONFLICT (name, section_id) DO NOTHING;

-- Verify data was inserted
SELECT 
  'Sections created: ' || COUNT(*)::TEXT as status
FROM public.sections;

SELECT 
  'Subjects created: ' || COUNT(*)::TEXT as status
FROM public.subjects;

