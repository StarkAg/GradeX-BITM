/**
 * Mode Toggle Utility
 * Manages switching between VPS mode and Mac mode
 */

const MODE_STORAGE_KEY = 'gradex_server_mode';
const MODE_VPS = 'vps';
const MODE_MAC = 'mac';

/**
 * Get current server mode
 * @returns {'vps' | 'mac'} Current mode (defaults to 'vps')
 */
// Track if we've already processed URL parameter to avoid infinite loops
let urlParamProcessed = false;

export function getServerMode() {
  if (typeof window === 'undefined') {
    // Server-side: check environment variable
    return process.env.SERVER_MODE === 'mac' ? MODE_MAC : MODE_VPS;
  }
  
  // Client-side: check URL parameter first (for testing) - only once
  if (!urlParamProcessed) {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('mode') === 'mac') {
      // Auto-set Mac mode if URL parameter is present (only once)
      localStorage.setItem(MODE_STORAGE_KEY, MODE_MAC);
      urlParamProcessed = true;
      return MODE_MAC;
    }
    urlParamProcessed = true;
  }
  
  // Then check localStorage
  const stored = localStorage.getItem(MODE_STORAGE_KEY);
  return stored === MODE_MAC ? MODE_MAC : MODE_VPS;
}

/**
 * Set server mode
 * @param {'vps' | 'mac'} mode - Mode to set
 */
export function setServerMode(mode) {
  if (typeof window === 'undefined') {
    // Server-side: set environment variable (for current process only)
    process.env.SERVER_MODE = mode;
    return;
  }
  
  // Client-side: store in localStorage
  if (mode === MODE_MAC || mode === MODE_VPS) {
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    // Dispatch custom event so components can react to mode changes
    window.dispatchEvent(new CustomEvent('serverModeChanged', { detail: { mode } }));
  }
}

/**
 * Check if currently in Mac mode
 * @returns {boolean} True if in Mac mode
 */
export function isMacMode() {
  return getServerMode() === MODE_MAC;
}

/**
 * Check if currently in VPS mode
 * @returns {boolean} True if in VPS mode
 */
export function isVPSMode() {
  return getServerMode() === MODE_VPS;
}

/**
 * Get mode display name
 * @returns {string} Human-readable mode name
 */
export function getModeDisplayName() {
  return isMacMode() ? 'Mac Mode' : 'VPS Mode';
}

export { MODE_VPS, MODE_MAC };

