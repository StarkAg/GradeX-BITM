-- Create feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id BIGSERIAL PRIMARY KEY,
  feedback TEXT NOT NULL,
  register_number VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on register_number for faster queries
CREATE INDEX IF NOT EXISTS idx_feedback_register_number ON feedback(register_number);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

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

