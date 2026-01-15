-- Add RLS policies for feedback table
-- Run this if the feedback table already exists but policies are missing

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Anonymous users can insert feedback." ON feedback;
DROP POLICY IF EXISTS "Authenticated users can view feedback." ON feedback;

-- Policy: Allow anonymous users to insert feedback
CREATE POLICY "Anonymous users can insert feedback."
  ON feedback FOR INSERT
  WITH CHECK (TRUE);

-- Policy: Allow authenticated users to view feedback (for admin portal)
CREATE POLICY "Authenticated users can view feedback."
  ON feedback FOR SELECT
  USING (TRUE);

