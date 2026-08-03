export function splitDisplayName(name) {
  const trimmed = (name || '').trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' '),
  };
}

export function getClerkUsername(user) {
  return (
    user?.username ||
    user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'user'
  );
}

export function getClerkDisplayName(user) {
  const unsafeDisplayName = user?.unsafeMetadata?.displayName;

  if (typeof unsafeDisplayName === 'string' && unsafeDisplayName.trim()) {
    return unsafeDisplayName.trim();
  }

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim();
  if (fullName) return fullName;

  return getClerkUsername(user);
}

export function buildBridgeUser(user) {
  if (!user) return null;

  return {
    id: user.id,
    username: getClerkUsername(user),
    name: getClerkDisplayName(user),
  };
}

export function syncClerkUserToLocalStorage(user) {
  const bridgeUser = buildBridgeUser(user);
  if (!bridgeUser) return null;

  localStorage.setItem('gradex_user_id', bridgeUser.id);
  localStorage.setItem('gradex_username', bridgeUser.username);
  localStorage.setItem('gradex_user_name', bridgeUser.name || bridgeUser.username);
  localStorage.removeItem('gradex_view_only_mode');
  window.dispatchEvent(new Event('storage'));

  return bridgeUser;
}

// True when a previous signed-in session left an identity behind. Clerk fetches
// its SDK from its own CDN, so on an offline cold start it can never load and
// `isSignedIn` stays false forever - without this the app would sit on its
// spinner rather than showing cached data. Signing out clears these keys via
// clearLocalAuthCache below, so this stays false for genuinely signed-out users.
export function hasCachedIdentity() {
  try {
    return Boolean(localStorage.getItem('gradex_user_id'));
  } catch {
    return false;
  }
}

export function clearLocalAuthCache(includeAcademicData = false) {
  const keys = [
    'gradex_user_id',
    'gradex_username',
    'gradex_user_name',
    'gradex_user_email',
    'gradex-attendance',
    'gradex-courses',
  ];

  if (includeAcademicData) {
    keys.push(
      'gradex_subjects',
      'gradex_timetable',
      'gradex_daily_attendance'
    );
  }

  keys.forEach((key) => localStorage.removeItem(key));
  window.dispatchEvent(new Event('storage'));
}

export function getClerkErrorMessage(error, fallbackMessage) {
  if (Array.isArray(error?.errors) && error.errors.length > 0) {
    return error.errors
      .map((entry) => entry?.longMessage || entry?.message || entry?.code)
      .filter(Boolean)
      .join(' ');
  }

  return error?.message || fallbackMessage;
}
