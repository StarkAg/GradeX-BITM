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

// Color palette
export const colorPalette = [
  '#FFF200', '#F8B739', '#92D050', '#C9DA2A', '#00B050', '#52BE80', '#1ABC9C',
  '#4ECDC4', '#45B7D1', '#3498DB', '#4A86E8', '#6FA8DC', '#5DADE2', '#8EA9DB',
  '#85C1E2', '#98D8C8', '#C6EFCE', '#F7DC6F', '#F4B183', '#F39C12', '#E67E22',
  '#B7B51A', '#BB8FCE', '#9B59B6', '#FF6B6B', '#EC7063', '#E74C3C', '#16A085', '#D35400',
];

export function getSubjectColor(index) {
  return colorPalette[index % colorPalette.length];
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

// Save to localStorage and sync to DB
export function saveSubjects(subjects) {
  localStorage.setItem('gradex_subjects', JSON.stringify(subjects));
  window.dispatchEvent(new Event('subjectsUpdated'));
  // Sync to DB in background
  saveSubjectsToDB(subjects);
}

// Add subject locally and sync
export function addSubject(subject) {
  const subjects = getSubjects();
  const newSubject = {
    name: subject.name,
    code: subject.code || subject.name.split(' ').map(w => w[0]).join('').toUpperCase(),
    room: subject.room || 'LH-11'
  };
  subjects.push(newSubject);
  saveSubjects(subjects);
  return subjects;
}

// Remove subject locally and sync
export function removeSubject(code) {
  const subjects = getSubjects();
  const filtered = subjects.filter(s => s.code !== code);
  saveSubjects(filtered);
  // Also remove from DB
  removeSubjectFromDB(code);
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
