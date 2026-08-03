// Ported from GradeX's src/lib/appUpdate.js. Same cleanup/refresh contract,
// with BITM's own storage keys - see clearLocalAuthCache in ./clerk.js for the
// keys this app actually writes.

export const PRESERVED_UI_STORAGE_KEYS = [
  'gradex-theme',
  'gradex-sidebar-collapsed',
  'bitm_timetable_mobile_view',
];

export const PRESERVED_AUTH_STORAGE_KEYS = [
  'gradex_user_id',
  'gradex_username',
  'gradex_user_name',
  'gradex_user_email',
];

// Convex keeps its local query cache in IndexedDB. Wiping it on every forced
// update would throw away the offline snapshot the app falls back to, so it is
// preserved while every other database is dropped.
const defaultKeepIndexedDbName = (name) => Boolean(name && name.toLowerCase().includes('convex'));

const uniqueKeys = (keys = []) => [...new Set(keys.filter(Boolean))];

const removeStorageKeysExcept = (storage, preserveKeys = []) => {
  const keep = new Set(uniqueKeys(preserveKeys));

  Object.keys(storage).forEach((key) => {
    if (!keep.has(key)) {
      storage.removeItem(key);
    }
  });
};

export async function clearClientRuntime({
  clearLocalStorage = false,
  preserveLocalStorageKeys = [],
  clearSessionStorage = false,
  preserveSessionStorageKeys = [],
  clearCacheStorage = true,
  clearServiceWorkers = true,
  requestServiceWorkerUpdate = false,
  clearIndexedDb = true,
  keepIndexedDbName = defaultKeepIndexedDbName,
} = {}) {
  if (clearLocalStorage) {
    removeStorageKeysExcept(window.localStorage, preserveLocalStorageKeys);
  }

  if (clearSessionStorage) {
    removeStorageKeysExcept(window.sessionStorage, preserveSessionStorageKeys);
  }

  if (clearCacheStorage && 'caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((name) => caches.delete(name)));
  }

  if (clearIndexedDb && 'indexedDB' in window && typeof indexedDB.databases === 'function') {
    try {
      const databases = await indexedDB.databases();
      const deletions = databases
        .filter((db) => db?.name && !keepIndexedDbName(db.name))
        .map((db) => new Promise((resolve) => {
          try {
            const request = indexedDB.deleteDatabase(db.name);
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
            request.onblocked = () => resolve(false);
          } catch (_) {
            resolve(false);
          }
        }));

      await Promise.all(deletions);
    } catch (error) {
      console.warn('[AppUpdate] IndexedDB cleanup failed:', error);
    }
  }

  if (clearServiceWorkers && 'serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();

    if (requestServiceWorkerUpdate) {
      await Promise.all(registrations.map((registration) => registration.update().catch(() => undefined)));
    }

    await Promise.all(registrations.map((registration) => registration.unregister().catch(() => undefined)));
  }
}

export function buildRefreshUrl(target = window.location.href) {
  const nextUrl = new URL(target, window.location.origin);
  nextUrl.searchParams.set('_refresh', Date.now().toString());
  return `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`;
}

export async function hardRefreshApp({
  redirectTo,
  ...clearOptions
} = {}) {
  // Storage or service-worker APIs can stay pending indefinitely (notably in an
  // embedded WebView). Never let cleanup hold the user on the update splash -
  // reload anyway after 2s and let the next load finish the job.
  const cleanup = clearClientRuntime(clearOptions).catch((error) => {
    console.warn('[AppUpdate] Runtime cleanup failed:', error);
  });

  await Promise.race([
    cleanup,
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);

  window.location.replace(buildRefreshUrl(redirectTo || window.location.href));
}
