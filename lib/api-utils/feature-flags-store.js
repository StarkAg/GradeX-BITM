/**
 * Feature flag storage helper
 * Persists flags to Upstash Redis (preferred) or Vercel KV when available,
 * with in-memory fallback for local development.
 */

const FLAG_KEYS = {
  ADVANCED_RADAR: 'feature:advanced_radar_enabled',
};

const inMemoryFlags = new Map();
let kvClient = null;
let kvClientType = null; // 'upstash' | 'vercel' | 'memory'
let kvInitAttempted = false;

const DEFAULTS = {
  [FLAG_KEYS.ADVANCED_RADAR]: false,
};

const parseBoolean = (value, defaultValue = false) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true;
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false;
  }
  return defaultValue;
};

const ensureKVClient = async () => {
  if (kvClient || kvClientType) {
    return kvClient;
  }

  if (kvInitAttempted) {
    return kvClient;
  }

  kvInitAttempted = true;

  const redisUrl =
    process.env.UPSTASH_REDIS__KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_REST_URL;

  const redisToken =
    process.env.UPSTASH_REDIS__KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_REST_TOKEN;

  if (redisUrl && redisToken) {
    try {
      const { Redis } = await import('@upstash/redis');
      kvClient = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      kvClientType = 'upstash';
      return kvClient;
    } catch (err) {
      console.warn('[feature-flags] Failed to init Upstash Redis client:', err.message);
      kvClient = null;
      kvClientType = null;
    }
  }

  if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    try {
      const { kv } = await import('@vercel/kv');
      kvClient = kv;
      kvClientType = 'vercel';
      return kvClient;
    } catch (err) {
      console.warn('[feature-flags] Failed to init Vercel KV client:', err.message);
      kvClient = null;
      kvClientType = null;
    }
  }

  kvClient = null;
  kvClientType = 'memory';
  return null;
};

const getFlagValue = async (key) => {
  const defaultValue = DEFAULTS[key] ?? false;

  const client = await ensureKVClient();
  if (!client || kvClientType === 'memory') {
    return inMemoryFlags.has(key) ? inMemoryFlags.get(key) : defaultValue;
  }

  try {
    const value = await client.get(key);
    const parsed = parseBoolean(value, defaultValue);
    inMemoryFlags.set(key, parsed);
    return parsed;
  } catch (err) {
    console.warn(`[feature-flags] Failed to read flag ${key}:`, err.message);
    return inMemoryFlags.has(key) ? inMemoryFlags.get(key) : defaultValue;
  }
};

const setFlagValue = async (key, value) => {
  const normalized = value === true;
  const client = await ensureKVClient();

  if (!client || kvClientType === 'memory') {
    inMemoryFlags.set(key, normalized);
    return { persisted: false };
  }

  try {
    if (kvClientType === 'upstash') {
      await client.set(key, normalized ? 'true' : 'false');
    } else {
      await client.set(key, normalized);
    }
    inMemoryFlags.set(key, normalized);
    return { persisted: true };
  } catch (err) {
    console.warn(`[feature-flags] Failed to write flag ${key}:`, err.message);
    inMemoryFlags.set(key, normalized);
    return { persisted: false, error: err.message };
  }
};

export const getAdvancedRadarEnabled = () => getFlagValue(FLAG_KEYS.ADVANCED_RADAR);

export const setAdvancedRadarEnabled = (value) => setFlagValue(FLAG_KEYS.ADVANCED_RADAR, value === true);

export const getAllFeatureFlags = async () => ({
  advancedRadarEnabled: await getAdvancedRadarEnabled(),
});

export const FEATURE_FLAG_KEYS = FLAG_KEYS;


