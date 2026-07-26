export const CONVEX_STATUS_EVENT = 'gradex-bitm-convex-status';

const CONVEX_AVAILABILITY_STORAGE_KEY = 'gradex_bitm_convex_available';

export function getConvexUrl() {
  const configured = import.meta.env.VITE_CONVEX_URL;
  return (configured && String(configured).trim()) || '';
}

export function readConvexAvailability() {
  if (typeof window === 'undefined') return true;
  return window.localStorage.getItem(CONVEX_AVAILABILITY_STORAGE_KEY) !== '0';
}

export function publishConvexAvailability(available) {
  if (typeof window === 'undefined') return;

  const normalized = Boolean(available);
  window.localStorage.setItem(CONVEX_AVAILABILITY_STORAGE_KEY, normalized ? '1' : '0');
  window.dispatchEvent(new CustomEvent(CONVEX_STATUS_EVENT, {
    detail: {
      available: normalized,
      timestamp: Date.now(),
    },
  }));
}

export async function checkConvexAvailability({ timeoutMs = 3500 } = {}) {
  if (typeof window === 'undefined') return true;

  const convexUrl = getConvexUrl();
  if (!convexUrl) return false;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const baseUrl = convexUrl.replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/version`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal,
    });
    return response.ok;
  } catch (_) {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
