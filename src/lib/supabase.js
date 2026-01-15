/**
 * Supabase Client Configuration for GradeX-BITM
 * 
 * Self-managed academic tracker - no external data scraping
 * Subjects stored in localStorage, attendance synced with Supabase
 */

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://pgghuorphotttadqsiac.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBnZ2h1b3JwaG90dHRhZHFzaWFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYzNDA4MjUsImV4cCI6MjA4MTkxNjgyNX0.7m7TiaWgVW39wPJOEAYegUkGZafdRXoOmsOwchzD_2w';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Helper functions for common operations
 */

// Get current user from localStorage
export const getCurrentUser = async () => {
  const userId = localStorage.getItem('gradex_user_id');
  const username = localStorage.getItem('gradex_username');
  
  if (!userId) {
    return null;
  }

  return { id: userId, username };
};

// Get attendance records for a user (by subject_code)
export const getAttendanceRecords = async (userId) => {
  const { data, error } = await supabase
    .from('manual_attendance')
    .select('subject_code, classes_attended, classes_conducted')
    .eq('user_id', userId);
  
  if (error) throw error;
  return data || [];
};

// Update attendance for a subject (upsert by subject_code)
export const updateAttendance = async (userId, subjectCode, classesAttended, classesConducted) => {
  const { error } = await supabase
    .from('manual_attendance')
    .upsert({
      user_id: userId,
      subject_code: subjectCode,
      classes_attended: classesAttended,
      classes_conducted: classesConducted,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,subject_code'
    });
  
  if (error) throw error;
};

// Delete attendance record for a subject
export const deleteAttendance = async (userId, subjectCode) => {
  const { error } = await supabase
    .from('manual_attendance')
    .delete()
    .eq('user_id', userId)
    .eq('subject_code', subjectCode);
  
  if (error) throw error;
};

// Get user profile from users table
export const getUserProfile = async (userId) => {
  const { data, error } = await supabase
    .from('users')
    .select('id, username, name, email')
    .eq('id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
};

// Update user name
export const updateUserName = async (userId, name) => {
  const { error } = await supabase
    .from('users')
    .update({ name })
    .eq('id', userId);
  
  if (error) throw error;
};
