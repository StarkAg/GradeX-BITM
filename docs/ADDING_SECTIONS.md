# Adding Sections to GroupGrid

## Overview

Sections in GroupGrid are stored in the `sections` table in Supabase. When you add a new section, it will automatically appear in the dropdown when creating formations.

## How Sections Work

1. **Dynamic Loading**: Sections are fetched from the database when the "Create Group Formation" modal opens
2. **Searchable Dropdown**: Users can search for sections by typing in the section field
3. **Custom Sections**: Users can also type custom section names that aren't in the database
4. **Automatic Updates**: Any sections added to the database will immediately appear in the dropdown

## Adding Sections via SQL

### Method 1: Using the Template File

1. Go to `supabase/migrations/TEMPLATE_add_sections.sql`
2. Copy the file and rename it (e.g., `017_add_more_sections.sql`)
3. Replace the section names with your actual sections
4. Run in Supabase SQL Editor

### Method 2: Direct SQL Insert

```sql
-- Add single section
INSERT INTO public.sections (name)
VALUES ('P3')
ON CONFLICT (name) DO NOTHING;

-- Add multiple sections
INSERT INTO public.sections (name)
VALUES 
    ('A'),
    ('B'),
    ('C'),
    ('P1'),
    ('P2')
ON CONFLICT (name) DO NOTHING;
```

## Adding Students for a Section

After adding a section, you can add students for that section:

1. Create a new migration file (e.g., `018_insert_p1_students.sql`)
2. Follow the pattern from `016_insert_p2_students.sql`
3. Replace:
   - `'P2'` with your section name (e.g., `'P1'`)
   - The student registration numbers and names

Example template:
```sql
-- First, ensure section exists
INSERT INTO public.sections (name)
VALUES ('P1')
ON CONFLICT (name) DO NOTHING;

-- Insert students for P1
INSERT INTO public.students (registration_number, name, section_id)
SELECT 
    reg_num,
    name_val,
    (SELECT id FROM public.sections WHERE name = 'P1' LIMIT 1)
FROM (VALUES
    ('RA2311003012001', 'STUDENT NAME 1'),
    ('RA2311003012002', 'STUDENT NAME 2')
    -- Add more students here
) AS students_data(reg_num, name_val)
ON CONFLICT (registration_number, section_id) 
DO UPDATE SET 
    name = EXCLUDED.name,
    updated_at = NOW();
```

## Viewing Sections in Database

To see all sections currently in the database:

```sql
SELECT id, name, created_at 
FROM public.sections 
ORDER BY name;
```

## API Endpoint

Sections are fetched via:
```
GET /api/groupgrid?action=get-sections
```

This returns:
```json
{
  "status": "ok",
  "sections": [
    { "id": "uuid", "name": "P1", "created_at": "..." },
    { "id": "uuid", "name": "P2", "created_at": "..." }
  ]
}
```

## Notes

- Sections are automatically sorted alphabetically in the dropdown
- Custom sections (typed by users) are stored in `group_formations.section_name` but don't need to be in the `sections` table
- You can add as many sections as needed - there's no limit
- Sections are used to filter students when creating groups

