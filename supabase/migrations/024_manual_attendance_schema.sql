-- Migration: Manual Attendance System
-- Removes SRM-specific tables and creates new manual attendance schema

-- Drop SRM-specific tables
DROP TABLE IF EXISTS timetable_cache CASCADE;
DROP TABLE IF EXISTS enquiries CASCADE;
DROP TABLE IF EXISTS srm_cookies CASCADE;

-- Create subjects table for user-managed subjects
CREATE TABLE IF NOT EXISTS subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_name TEXT NOT NULL,
    subject_code TEXT,
    target_attendance INTEGER DEFAULT 75,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_name)
);

-- Create manual_attendance table for tracking attendance per subject
CREATE TABLE IF NOT EXISTS manual_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    classes_attended INTEGER DEFAULT 0,
    classes_conducted INTEGER DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, subject_id)
);

-- Enable RLS
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects
DROP POLICY IF EXISTS "Users can view own subjects" ON subjects;
CREATE POLICY "Users can view own subjects" ON subjects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own subjects" ON subjects;
CREATE POLICY "Users can insert own subjects" ON subjects
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own subjects" ON subjects;
CREATE POLICY "Users can update own subjects" ON subjects
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own subjects" ON subjects;
CREATE POLICY "Users can delete own subjects" ON subjects
    FOR DELETE USING (true);

-- RLS Policies for manual_attendance
DROP POLICY IF EXISTS "Users can view own attendance" ON manual_attendance;
CREATE POLICY "Users can view own attendance" ON manual_attendance
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert own attendance" ON manual_attendance;
CREATE POLICY "Users can insert own attendance" ON manual_attendance
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Users can update own attendance" ON manual_attendance;
CREATE POLICY "Users can update own attendance" ON manual_attendance
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Users can delete own attendance" ON manual_attendance;
CREATE POLICY "Users can delete own attendance" ON manual_attendance
    FOR DELETE USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_subjects_user_id ON subjects(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_attendance_user_id ON manual_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_manual_attendance_subject_id ON manual_attendance(subject_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_subjects_updated_at ON subjects;
CREATE TRIGGER update_subjects_updated_at
    BEFORE UPDATE ON subjects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_manual_attendance_updated_at ON manual_attendance;
CREATE TRIGGER update_manual_attendance_updated_at
    BEFORE UPDATE ON manual_attendance
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
