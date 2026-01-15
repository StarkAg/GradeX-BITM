-- Add group_number field to groups table
-- This separates group number from title (title should only contain custom title)

ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS group_number INTEGER;

-- Create index for faster sorting by group number
CREATE INDEX IF NOT EXISTS idx_groups_group_number ON public.groups(group_number);

-- Update existing groups to extract group number from title
-- This migrates existing data: "Group 1" -> group_number = 1, title = null
-- "Group 1 - Custom Title" -> group_number = 1, title = "Custom Title"
UPDATE public.groups
SET 
  group_number = CASE
    WHEN title ~ '^Group[[:space:]]+[0-9]+' THEN 
      CAST(SUBSTRING(title FROM '^Group[[:space:]]+([0-9]+)') AS INTEGER)
    ELSE NULL
  END,
  title = CASE
    WHEN title ~ '^Group[[:space:]]+[0-9]+[[:space:]]*-[[:space:]]*' THEN 
      TRIM(REGEXP_REPLACE(title, '^Group[[:space:]]+[0-9]+[[:space:]]*-[[:space:]]*', '', 'g'))
    WHEN title ~ '^Group[[:space:]]+[0-9]+[[:space:]]*$' THEN 
      NULL
    ELSE title
  END
WHERE title IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.groups.group_number IS 'Group number (1, 2, 3, etc.) - separate from title';
COMMENT ON COLUMN public.groups.title IS 'Custom group title only (without "Group X" prefix)';

