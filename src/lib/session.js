// What this device remembers about the signed-in student between launches,
// outside of the sign-in tokens themselves (those are kept by Convex Auth).
//
// The app opens from this before Convex has answered, and on an offline start
// it is all there is.

import { ConvexError } from 'convex/values';

// The offline copy of one account's subjects, timetable and attendance, and
// the key recording whose copy it is (see buildLocalSnapshot in
// ./academic-data.js).
export const ACADEMIC_CACHE_OWNER_KEY = 'gradex_cache_owner';
export const ACADEMIC_CACHE_KEYS = [
  'gradex_subjects',
  'gradex_timetable',
  'gradex_daily_attendance',
  'gradex_manual_attendance',
  'gradex_holidays',
];

const IDENTITY_KEYS = ['gradex_user_id', 'gradex_username', 'gradex_user_name', 'gradex_user_email'];

function read(key) {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return '';
  }
}

// Remembers who is signed in. `profile` is what users:syncCurrentUser and
// users:getCurrentProfile return.
export function cacheIdentity(profile) {
  if (!profile?.id) return;

  const next = {
    gradex_user_id: profile.id,
    gradex_username: profile.username || 'user',
    gradex_user_name: profile.name || profile.username || 'User',
    gradex_user_email: profile.email || '',
  };
  // Written, and announced, only when something changed: this runs from
  // effects, and an unconditional 'storage' event would re-render every
  // listener each time.
  if (IDENTITY_KEYS.every((key) => read(key) === next[key])) return;

  IDENTITY_KEYS.forEach((key) => localStorage.setItem(key, next[key]));
  localStorage.removeItem('gradex_view_only_mode');
  window.dispatchEvent(new Event('storage'));
}

export function readCachedIdentity() {
  const id = read('gradex_user_id');
  if (!id) return null;

  const username = read('gradex_username') || 'user';
  return {
    id,
    username,
    name: read('gradex_user_name') || username,
    email: read('gradex_user_email'),
  };
}

// True when a signed-in session left an identity behind. Signing out clears
// it (clearLocalAuthCache below), so it stays false for signed-out visitors.
export function hasCachedIdentity() {
  return Boolean(read('gradex_user_id'));
}

// Signing out always takes the academic cache with it: the next person to
// sign in on the same phone must never be shown the previous person's
// timetable and attendance. Writes still waiting to be sent are kept; they
// are stamped with their owner and go out when that owner signs back in.
export function clearLocalAuthCache() {
  const keys = [
    ...IDENTITY_KEYS,
    'gradex-attendance',
    'gradex-courses',
    ACADEMIC_CACHE_OWNER_KEY,
    ...ACADEMIC_CACHE_KEYS,
  ];
  if (!keys.some((key) => localStorage.getItem(key) !== null)) return;

  keys.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event('storage'));
}

// The server only lets a message through to a production client when it is a
// ConvexError (see convex/auth.ts); everything else arrives as "Server Error"
// and is replaced by `fallbackMessage`.
export function getAuthErrorMessage(error, fallbackMessage) {
  if (error instanceof ConvexError && typeof error.data === 'string') {
    return error.data;
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return 'You are offline. Connect to the internet and try again.';
  }
  return fallbackMessage;
}
