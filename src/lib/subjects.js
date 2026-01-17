import { supabase } from './supabase';

// Default BBA II A subjects
export const DEFAULT_SUBJECTS = [
  { name: 'Organizational Behavior', code: 'OB', room: 'LH-11' },
  { name: 'Marketing Management', code: 'MM', room: 'LH-11' },
  { name: 'Business Economics', code: 'BE', room: 'LH-11' },
  { name: 'Emotional Intelligence', code: 'EI', room: 'LH-11' },
  { name: 'Qualitative Data Analysis', code: 'QDA', room: 'LH-11' },
  { name: 'Web Application of Business', code: 'WAB', room: 'LH-11' },
  { name: 'Public Speaking & Creative Writing', code: 'PSCW', room: 'LH-11' },
];

// Color palette - Lightened luxury palette (28 colors, safe to cycle, low visual fatigue)
export const colorPalette = [
  '#FFF7A8', // Soft Lemon
  '#FFD9A0', // Champagne Peach
  '#CFF0C3', // Pastel Green
  '#E6F2A2', // Light Lime
  '#A8E6B8', // Fresh Mint Green
  '#BFE9D5', // Soft Teal Green
  '#BFEFE6', // Pale Turquoise
  '#CFF5F2', // Ice Turquoise
  '#CFEAF5', // Soft Sky Blue
  '#C6E2FF', // Powder Blue
  '#D6E4FF', // Mist Blue
  '#E3EEFF', // Cloud Blue
  '#D9F0FF', // Light Cyan
  '#E1E8F8', // Soft Periwinkle
  '#E6F2FA', // Frost Blue
  '#E2F4EE', // Mint Cream
  '#EDF9F0', // Pale Sage
  '#FFF3BF', // Vanilla Yellow
  '#FFE0C7', // Soft Peach
  '#FFD8A8', // Light Amber
  '#FFCCA0', // Muted Orange
  '#E8E6B8', // Soft Olive
  '#E9DFF2', // Lavender Mist
  '#E1D2F0', // Light Purple
  '#FFD6D6', // Blush Coral
  '#FFD0CC', // Soft Salmon
  '#FFBDBD', // Muted Red
  '#CFEDE6', // Light Teal
];

export function getSubjectColor(index) {
  return colorPalette[index % colorPalette.length];
}

// Get day color from palette
export function getDayColor(dayIndex) {
  return colorPalette[dayIndex % colorPalette.length];
}

// Get user ID
function getUserId() {
  return localStorage.getItem('gradex_user_id');
}

// Load subjects from Supabase
export async function loadSubjectsFromDB() {
  const userId = getUserId();
  if (!userId) return [];

  const { data, error } = await supabase
    .from('user_subjects')
    .select('subject_name, subject_code, room')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading subjects:', error);
    return [];
  }

  return (data || []).map(s => ({
    name: s.subject_name,
    code: s.subject_code,
    room: s.room
  }));
}

// Save subjects to Supabase (replaces all)
export async function saveSubjectsToDB(subjects) {
  const userId = getUserId();
  if (!userId) return;

  // Delete existing
  await supabase.from('user_subjects').delete().eq('user_id', userId);

  // Insert new
  if (subjects.length > 0) {
    const rows = subjects.map(s => ({
      user_id: userId,
      subject_name: s.name,
      subject_code: s.code,
      room: s.room || 'LH-11'
    }));

    const { error } = await supabase.from('user_subjects').insert(rows);
    if (error) console.error('Error saving subjects:', error);
  }
}

// Add a subject to Supabase
export async function addSubjectToDB(subject) {
  const userId = getUserId();
  if (!userId) return;

  const { error } = await supabase.from('user_subjects').insert({
    user_id: userId,
    subject_name: subject.name,
    subject_code: subject.code,
    room: subject.room || 'LH-11'
  });

  if (error) console.error('Error adding subject:', error);
}

// Remove a subject from Supabase
export async function removeSubjectFromDB(code) {
  const userId = getUserId();
  if (!userId) return;

  const { error } = await supabase
    .from('user_subjects')
    .delete()
    .eq('user_id', userId)
    .eq('subject_code', code);

  if (error) console.error('Error removing subject:', error);

  // Also remove attendance
  await supabase
    .from('manual_attendance')
    .delete()
    .eq('user_id', userId)
    .eq('subject_code', code);
}

// Initialize default subjects for new user
export async function initializeDefaultSubjects() {
  const userId = getUserId();
  if (!userId) return;

  // Check if user has any subjects
  const { data } = await supabase
    .from('user_subjects')
    .select('id')
    .eq('user_id', userId)
    .limit(1);

  if (!data || data.length === 0) {
    // No subjects, add defaults
    await saveSubjectsToDB(DEFAULT_SUBJECTS);
  }
}

// ============ Local cache functions (for fast UI) ============

// Get subjects (from localStorage cache)
export function getSubjects() {
  const stored = localStorage.getItem('gradex_subjects');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [...DEFAULT_SUBJECTS];
    }
  }
  return [...DEFAULT_SUBJECTS];
}

// Save to localStorage and sync to DB immediately
export async function saveSubjects(subjects) {
  localStorage.setItem('gradex_subjects', JSON.stringify(subjects));
  window.dispatchEvent(new Event('subjectsUpdated'));
  // Sync to DB immediately - await to ensure it completes
  await saveSubjectsToDB(subjects);
}

// Add subject locally and sync immediately
export async function addSubject(subject) {
  const subjects = getSubjects();
  const newSubject = {
    name: subject.name,
    code: subject.code || subject.name.split(' ').map(w => w[0]).join('').toUpperCase(),
    room: subject.room || 'LH-11'
  };
  subjects.push(newSubject);
  await saveSubjects(subjects);
  return subjects;
}

// Remove subject locally and sync immediately
export async function removeSubject(code) {
  const subjects = getSubjects();
  const filtered = subjects.filter(s => s.code !== code);
  await saveSubjects(filtered);
  // Also remove from DB immediately
  await removeSubjectFromDB(code);
  return filtered;
}

// Sync local cache with DB (call on login)
export async function syncSubjectsWithDB() {
  const dbSubjects = await loadSubjectsFromDB();
  if (dbSubjects.length > 0) {
    localStorage.setItem('gradex_subjects', JSON.stringify(dbSubjects));
    window.dispatchEvent(new Event('subjectsUpdated'));
  } else {
    // No subjects in DB, initialize defaults
    await initializeDefaultSubjects();
    const defaults = [...DEFAULT_SUBJECTS];
    localStorage.setItem('gradex_subjects', JSON.stringify(defaults));
    window.dispatchEvent(new Event('subjectsUpdated'));
  }
}
