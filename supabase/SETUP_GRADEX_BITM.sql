-- GradeX-BITM Database Setup
-- Run this in Supabase SQL Editor

-- 1. Ensure users table has required columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 2. Drop old tables if exist
DROP TABLE IF EXISTS manual_attendance CASCADE;
DROP TABLE IF EXISTS user_subjects CASCADE;

-- 3. Create user_subjects table (stores each user's subjects)
CREATE TABLE user_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_name TEXT NOT NULL,
  subject_code TEXT NOT NULL,
  room TEXT DEFAULT 'LH-11',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_code)
);

-- 4. Create manual_attendance table
CREATE TABLE manual_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_code TEXT NOT NULL,
  classes_attended INTEGER DEFAULT 0,
  classes_conducted INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, subject_code)
);

-- 5. Create indexes
CREATE INDEX idx_user_subjects_user ON user_subjects(user_id);
CREATE INDEX idx_manual_attendance_user ON manual_attendance(user_id);
CREATE INDEX idx_manual_attendance_subject ON manual_attendance(subject_code);

-- 6. Enable RLS
ALTER TABLE user_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_attendance ENABLE ROW LEVEL SECURITY;

-- 7. Drop existing policies
DROP POLICY IF EXISTS "Allow all operations" ON user_subjects;
DROP POLICY IF EXISTS "Allow all operations" ON manual_attendance;

-- 8. Create permissive policies (custom auth)
CREATE POLICY "Allow all operations" ON user_subjects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations" ON manual_attendance FOR ALL USING (true) WITH CHECK (true);

-- 9. Verify setup
SELECT 'Setup complete!' as status;
SELECT table_name FROM information_schema.tables WHERE table_name IN ('user_subjects', 'manual_attendance');
