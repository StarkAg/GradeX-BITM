// Activity log for tracking all Supabase updates

const MAX_LOG_ENTRIES = 100; // Keep last 100 entries

// Get user-specific storage key
function getLogKey() {
  const userId = localStorage.getItem('gradex_user_id');
  return userId ? `gradex_activity_log_${userId}` : 'gradex_activity_log';
}

export function logActivity(type, details) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    id: Date.now(),
    timestamp,
    type,
    details
  };

  // Get existing logs for current user
  const logKey = getLogKey();
  const existingLogs = JSON.parse(localStorage.getItem(logKey) || '[]');
  
  // Add new entry at the beginning
  existingLogs.unshift(logEntry);
  
  // Keep only last MAX_LOG_ENTRIES
  const trimmedLogs = existingLogs.slice(0, MAX_LOG_ENTRIES);
  
  // Save back to localStorage with error handling for quota exceeded
  try {
    localStorage.setItem(logKey, JSON.stringify(trimmedLogs));
  } catch (e) {
    // If storage is full, try deleting oldest entries and retry
    if (e.name === 'QuotaExceededError' || e.code === 22) {
      try {
        // Reduce to half the entries and try again
        const reducedLogs = trimmedLogs.slice(0, Math.floor(MAX_LOG_ENTRIES / 2));
        localStorage.setItem(logKey, JSON.stringify(reducedLogs));
      } catch (e2) {
        // If still failing, clear all logs and save just the new entry
        console.warn('localStorage full, clearing activity log');
        localStorage.setItem(logKey, JSON.stringify([logEntry]));
      }
    } else {
      // Other errors, just log and continue
      console.error('Error saving activity log:', e);
    }
  }
  
  return logEntry;
}

export function getActivityLog() {
  const logKey = getLogKey();
  return JSON.parse(localStorage.getItem(logKey) || '[]');
}

export function clearActivityLog() {
  const logKey = getLogKey();
  localStorage.removeItem(logKey);
}

// Format timestamp for display
export function formatTimestamp(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: '2-digit',
    minute: '2-digit'
  });
}
