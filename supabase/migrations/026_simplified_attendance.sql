-- Simplified attendance schema using subject_code instead of subject_id
-- This allows attendance to work with locally-stored subjects

-- Drop old tables if they exist
DROP TABLE IF EXISTS manual_attendance CASCADE;
DROP TABLE IF EXISTS subjects CASCADE;

-- Create new simplified manual_attendance table
CREATE TABLE IF NOT EXISTS manual_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  classes_attended INTEGER DEFAULT 0,
  classes_conducted INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_code)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_manual_attendance_user ON manual_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_attendance_subject ON manual_attendance(subject_code);

-- Enable RLS
ALTER TABLE manual_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own attendance"
  ON manual_attendance FOR SELECT
  USING (auth.uid()::text = user_id::text OR user_id = (SELECT id FROM users WHERE id = user_id));

CREATE POLICY "Users can insert own attendance"
  ON manual_attendance FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own attendance"
  ON manual_attendance FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own attendance"
  ON manual_attendance FOR DELETE
  USING (true);
