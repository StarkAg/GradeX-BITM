-- Faculty Attendance Table
-- Stores attendance marked by faculty for students
-- This table allows faculty to mark attendance without requiring student users to exist

CREATE TABLE IF NOT EXISTS faculty_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  faculty_id TEXT NOT NULL, -- Faculty identifier (can be demo_faculty_001 or actual user_id)
  student_id TEXT NOT NULL, -- Student identifier (roll number, student_id, etc.)
  student_name TEXT,
  date DATE NOT NULL,
  subject_code TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent')),
  classroom TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(faculty_id, student_id, date, subject_code)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_faculty_attendance_faculty ON faculty_attendance(faculty_id);
CREATE INDEX IF NOT EXISTS idx_faculty_attendance_student ON faculty_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_faculty_attendance_date ON faculty_attendance(date);
CREATE INDEX IF NOT EXISTS idx_faculty_attendance_subject ON faculty_attendance(subject_code);

-- Enable RLS
ALTER TABLE faculty_attendance ENABLE ROW LEVEL SECURITY;

-- RLS policies - Allow all operations for demo and real usage
CREATE POLICY "Allow all operations on faculty_attendance"
  ON faculty_attendance FOR ALL
  USING (true) WITH CHECK (true);

-- Enable Realtime for instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE faculty_attendance;

-- Comments
COMMENT ON TABLE faculty_attendance IS 'Attendance records marked by faculty for students. Can work with demo student IDs or real user_ids.';
COMMENT ON COLUMN faculty_attendance.student_id IS 'Student identifier - can be roll number, demo_student_001, or actual user UUID';
COMMENT ON COLUMN faculty_attendance.faculty_id IS 'Faculty identifier - can be demo_faculty_001 or actual user UUID';
