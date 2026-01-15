/**
 * Seating Arrangement Fetch System - Core Utilities
 * Fetches exam seating details from SRM exam cell endpoints
 */

// Campus endpoints configuration
// Each campus has a base URL and a fetch_data.php endpoint for POST requests
const CAMPUS_ENDPOINTS = {
  'Main Campus': {
    base: 'https://examcell.srmist.edu.in/main/seating/bench',
    fetchData: 'https://examcell.srmist.edu.in/main/seating/bench/fetch_data.php'
  },
  'Tech Park': {
    base: 'https://examcell.srmist.edu.in/tp/seating/bench',
    fetchData: 'https://examcell.srmist.edu.in/tp/seating/bench/fetch_data.php'
  },
  'Tech Park 2': {
    base: 'https://examcell.srmist.edu.in/tp2/seating/bench',
    fetchData: 'https://examcell.srmist.edu.in/tp2/seating/bench/fetch_data.php'
  },
  'Biotech & Architecture': {
    base: 'https://examcell.srmist.edu.in/bio/seating/bench',
    fetchData: 'https://examcell.srmist.edu.in/bio/seating/bench/fetch_data.php'
  },
  'University Building': {
    base: 'https://examcell.srmist.edu.in/ub/seating/bench',
    fetchData: 'https://examcell.srmist.edu.in/ub/seating/bench/fetch_data.php'
  },
};

// Cache storage (in-memory, resets on serverless function restart)
const cache = new Map();

// Student data cache (loaded once per serverless function instance)
let studentDataCache = null;
let studentDataLoadPromise = null;

// Global campus data cache - stores ALL seating data from all campuses
// Structure: { timestamp: number, data: Map<RA, Array<matches>>, date: string }
// NOTE: In-memory cache resets on Vercel serverless function restart
// For persistent cache, we use Upstash Redis (see getAllCampusDataCache)
let allCampusDataCache = null;
let allCampusDataLoadPromise = null;

/**
 * Get cache TTL based on date (Smart Date-Based Caching)
 * - Past dates: 24 hours (data never changes)
 * - Today: 6 hours (handles any same-day updates)
 * - Tomorrow: 2 hours (short to catch late releases - seats might be published at last hour)
 * - Future dates (2+ days ahead): 12 hours (covers planning period)
 * @param {string} date - Date string (DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD)
 * @returns {number} - TTL in milliseconds
 */
function getCacheTTLForDate(date) {
  if (!date || date === 'any') {
    // Default to 6 hours for 'any' date
    return 6 * 60 * 60 * 1000;
  }

  try {
    // Parse date string to Date object
    let parsedDate = null;
    const parts = date.split(/[-\/]/);
    
    if (parts.length === 3) {
      let day, month, year;
      
      if (parts[0].length === 4) {
        // YYYY-MM-DD format
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        day = parseInt(parts[2], 10);
      } else {
        // DD-MM-YYYY or DD/MM/YYYY format
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        year = parseInt(parts[2], 10);
      }
      
      parsedDate = new Date(year, month, day);
      parsedDate.setHours(0, 0, 0, 0); // Set to start of day
    }
    
    if (!parsedDate || isNaN(parsedDate.getTime())) {
      // Invalid date, default to 6 hours
      return 6 * 60 * 60 * 1000;
    }
    
    // Get today's date (IST - India Standard Time)
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    // Calculate difference in days
    const diffTime = parsedDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    // Determine TTL based on date relationship
    if (diffDays < 0) {
      // Past date - data never changes, cache for 24 hours
      return 24 * 60 * 60 * 1000;
    } else if (diffDays === 0) {
      // Today - 6 hours (handles any same-day updates)
      return 6 * 60 * 60 * 1000;
    } else if (diffDays === 1) {
      // Tomorrow - 2 hours (short to catch late releases)
      // Seats might be published at the last hour before exam
      return 2 * 60 * 60 * 1000;
    } else {
      // Future date (2+ days ahead) - 12 hours (covers planning period)
      return 12 * 60 * 60 * 1000;
    }
  } catch (error) {
    console.warn(`[getCacheTTLForDate] Error parsing date "${date}":`, error.message);
    // Default to 6 hours on error
    return 6 * 60 * 60 * 1000;
  }
}

// Cache statistics for monitoring
let cacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
  errors: 0,
  lastHit: null,
  lastMiss: null,
  lastWrite: null,
};

function formatDateAsDDMMYYYY(dateStr) {
  if (!dateStr) return null;
  const parts = dateStr.split(/[\/-]/);
  if (parts.length !== 3) return dateStr;
  let day;
  let month;
  let year;
  if (parts[0].length === 4) {
    year = parts[0];
    month = parts[1];
    day = parts[2];
  } else {
    day = parts[0];
    month = parts[1];
    year = parts[2];
  }
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

async function fetchSeatsFromSupabase(normalizedRA, date) {
  try {
    const { supabase, isSupabaseConfigured } = await import('./supabase-client.js');
    if (!isSupabaseConfigured() || !supabase) {
      return null;
    }

    let query = supabase
      .from('seats')
      .select(
        'register_number, search_date, session, campus, hall, bench, department, subject_code, floor'
      )
      .eq('register_number', normalizedRA);

    if (date && date !== 'any') {
      const variants = generateDateVariants(date)
        .map((variant) => formatDateAsDDMMYYYY(variant))
        .filter(Boolean);
      if (variants.length > 0) {
        query = query.in('search_date', variants);
      }
    }

    const { data, error } = await query.limit(500);
    if (error) {
      console.warn('[SupabaseSeatLookup] Error fetching seats:', error.message);
      return null;
    }
    if (!data || data.length === 0) {
      return null;
    }

    const results = {};
    data.forEach((row) => {
      const campusName = row.campus || 'Supabase';
      if (!results[campusName]) {
        results[campusName] = [];
      }
      results[campusName].push({
        ra: row.register_number,
        hall: row.hall || '-',
        bench: row.bench || 'N/A',
        department: row.department || 'N/A',
        subjectCode: row.subject_code || null,
        campus: campusName,
        session: row.session || null,
        floor: row.floor || null,
        searchDate: row.search_date || null,
        source: 'supabase',
      });
    });

    return {
      status: 'ok',
      lastUpdated: new Date().toISOString(),
      results,
      source: 'supabase',
    };
  } catch (err) {
    console.warn('[SupabaseSeatLookup] Fatal error:', err.message);
    return null;
  }
}

/**
 * Fetch ALL seating data from a single campus (no RA filtering)
 * Same as fetchCampusSeating but without RA filtering - fetches all data
 * @param {string} campusName - Campus name
 * @param {string[]} dateVariants - Date format variants
 * @returns {Promise<string>} - Combined HTML from all sessions
 */
async function fetchAllCampusDataRaw(campusName, dateVariants) {
  const campusConfig = CAMPUS_ENDPOINTS[campusName];
  if (!campusConfig) return '';
  
  try {
    // NOTE: No delay here - delays are handled in fetchAllCampusData() parent function
    // This matches the original fetchCampusSeating approach
    
    let allHtmlSources = [];
    
    if (dateVariants && dateVariants.length > 0) {
      const dateParam = dateVariants[0];
      
      // Try both Forenoon and Afternoon sessions (sequential, same as original)
      const sessions = ['FN', 'AN'];
      
      for (const session of sessions) {
        try {
          // Format date for POST (usually DD/MM/YYYY or DD-MM-YYYY)
          let formattedDate = dateParam;
          if (dateParam.includes('-')) {
            formattedDate = dateParam.replace(/-/g, '/');
          }
          
          // Create form data
          const formData = new URLSearchParams();
          formData.append('dated', formattedDate);
          formData.append('session', session);
          formData.append('submit', 'Submit');
          
          // Fetch room-wise data from fetch_data.php (same timeout and retry as original)
          const postHtml = await fetchPage(
            campusConfig.fetchData,
            12000,  // Same 12s timeout as original
            1,      // Same 1 retry as original
            {
              method: 'POST',
              body: formData.toString(),
            }
          );
          
          // Check if we got actual data with RA numbers (same validation as original)
          const hasRAPattern = /(?:>|"|'|\b)(RA\d{2,})/i.test(postHtml);
          
          if (postHtml.length > 5000 && hasRAPattern) {
            allHtmlSources.push(postHtml);
            console.log(`[fetchAllCampusDataRaw] ${campusName} ${session}: ${postHtml.length} bytes`);
          }
        } catch (e) {
          console.error(`Error fetching ${campusName} ${session}:`, e.message);
          continue; // Continue to next session even if one fails
        }
      }
    }
    
    // Merge all HTML sources (same as original)
    return allHtmlSources.join('\n<!-- MERGED FROM MULTIPLE SOURCES -->\n');
  } catch (error) {
    console.error(`Error fetching all data from ${campusName}:`, error.message);
    return '';
  }
}

/**
 * Fetch and parse ALL seating data from all campuses for a given date
 * @param {string} date - Date string
 * @returns {Promise<Map>} - Map of RA -> Array of matches from all campuses
 */
async function fetchAllCampusData(date) {
  console.log(`[fetchAllCampusData] Starting to fetch all campus data for date: ${date}`);
  const startTime = Date.now();
  
  const dateVariants = date ? generateDateVariants(date) : [];
  const campusNames = Object.keys(CAMPUS_ENDPOINTS);
  
  // Fetch campuses SEQUENTIALLY with polite delays (same as original approach)
  // This prevents server overload and ensures reliability
  const campusResults = [];
  for (const campusName of campusNames) {
    try {
      // Polite delay between campus fetches (300-700ms) - same as original
      const delay = 300 + Math.random() * 400;
      await new Promise(resolve => setTimeout(resolve, delay));
      
      const html = await fetchAllCampusDataRaw(campusName, dateVariants);
      campusResults.push({ campusName, html });
      console.log(`[fetchAllCampusData] ✅ ${campusName}: ${html.length} bytes`);
    } catch (error) {
      console.error(`[fetchAllCampusData] Error fetching ${campusName}:`, error.message);
      campusResults.push({ campusName, html: '' });
    }
  }
  
  // Parse all HTML and build a Map of RA -> matches
  const raMatchesMap = new Map();
  
  for (const { campusName, html } of campusResults) {
    if (!html || html.length === 0) {
      console.log(`[fetchAllCampusData] ${campusName}: No data`);
      continue;
    }
    
    // Parse HTML to extract ALL RAs (pass null to extract all, not just one)
    const allRows = extractSeatingRows(html, null); // null = extract all RAs
    
    console.log(`[fetchAllCampusData] ${campusName}: Found ${allRows.length} total entries`);
    
    // Group by RA
    for (const row of allRows) {
      const ra = normalizeRA(row.ra);
      if (!ra) continue;
      
      if (!raMatchesMap.has(ra)) {
        raMatchesMap.set(ra, []);
      }
      
      // Build URL for this match
      const dateParam = dateVariants[0] || '';
      const sessionParam = row.session === 'Forenoon' ? 'FN' : (row.session === 'Afternoon' ? 'AN' : 'FN');
      let formattedDate = dateParam;
      if (dateParam.includes('-')) {
        formattedDate = dateParam.replace(/-/g, '/');
      }
      
      raMatchesMap.get(ra).push({
        ...row,
        matched: true,
        campus: campusName,
        url: `${CAMPUS_ENDPOINTS[campusName].fetchData}?dated=${encodeURIComponent(formattedDate)}&session=${sessionParam}`,
      });
    }
  }
  
  const elapsed = Date.now() - startTime;
  console.log(`[fetchAllCampusData] Completed in ${elapsed}ms. Cached ${raMatchesMap.size} unique RAs`);
  
  return raMatchesMap;
}

/**
 * Get cached all-campus data or fetch if expired/missing
 * Uses both in-memory cache (fast) and Supabase (persistent across restarts)
 * @param {string} date - Date string
 * @returns {Promise<Map>} - Map of RA -> Array of matches
 */
async function getAllCampusDataCache(date) {
  // Calculate TTL based on date (Smart Date-Based Caching)
  const cacheTTL = getCacheTTLForDate(date);
  
  // Normalize date format to ensure consistent cache keys
  // Accept DD/MM/YYYY, DD-MM-YYYY, or YYYY-MM-DD and convert to DD/MM/YYYY
  let cacheKey = date || 'any';
  if (date && date !== 'any') {
    // If date contains dashes, try to convert to DD/MM/YYYY format
    if (date.includes('-')) {
      const parts = date.split(/[-\/]/);
      if (parts.length === 3) {
        // Check if it's YYYY-MM-DD or DD-MM-YYYY
        if (parts[0].length === 4) {
          // YYYY-MM-DD -> DD/MM/YYYY
          cacheKey = `${parts[2]}/${parts[1]}/${parts[0]}`;
        } else {
          // DD-MM-YYYY -> DD/MM/YYYY
          cacheKey = `${parts[0]}/${parts[1]}/${parts[2]}`;
        }
      }
    }
  }
  
  // STEP 1: Check in-memory cache first (fastest)
  if (allCampusDataCache && allCampusDataCache.date === cacheKey) {
    const age = Date.now() - allCampusDataCache.timestamp;
    if (age < cacheTTL) {
      cacheStats.hits++;
      cacheStats.lastHit = Date.now();
      console.log(`[getAllCampusDataCache] ✅ CACHE HIT - Using in-memory cache (age: ${Math.round(age / 1000)}s, ${allCampusDataCache.data.size} RAs)`);
      return allCampusDataCache.data;
    } else {
      console.log(`[getAllCampusDataCache] ⚠️ CACHE EXPIRED - In-memory cache expired (age: ${Math.round(age / 1000)}s), checking Redis...`);
    }
  }
  
  // STEP 2: Check Upstash Redis cache first (fastest persistent storage)
  try {
    // Try Upstash Redis (via Marketplace)
    // Supports multiple naming conventions (default, custom prefix, legacy)
    const redisUrl = process.env.UPSTASH_REDIS__KV_REST_API_URL ||  // Custom prefix (UPSTASH_REDIS__)
                     process.env.UPSTASH_REDIS_REST_URL ||          // Default naming
                     process.env.REDIS_REST_URL ||                   // Alternative naming
                     process.env.KV_REST_API_URL;                    // Legacy KV naming
    const redisToken = process.env.UPSTASH_REDIS__KV_REST_API_TOKEN ||  // Custom prefix (UPSTASH_REDIS__)
                       process.env.UPSTASH_REDIS_REST_TOKEN ||          // Default naming
                       process.env.REDIS_REST_TOKEN ||                   // Alternative naming
                       process.env.KV_REST_API_TOKEN;                    // Legacy KV naming
    
    if (redisUrl && redisToken) {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      
      const redisKey = `campus_cache:${cacheKey}`;
      const cachedData = await redis.get(redisKey);
      
      if (cachedData) {
        const { timestamp, data: cachedDataMap } = cachedData;
        const age = Date.now() - timestamp;
        
        if (age < cacheTTL) {
          // Cache is valid, restore to in-memory
          cacheStats.hits++;
          cacheStats.lastHit = Date.now();
          console.log(`[getAllCampusDataCache] ✅ CACHE HIT - Found valid Upstash Redis cache (age: ${Math.round(age / 1000)}s)`);
          
          // Convert object back to Map
          const dataMap = new Map();
          if (cachedDataMap && typeof cachedDataMap === 'object') {
            for (const [ra, matches] of Object.entries(cachedDataMap)) {
              dataMap.set(ra, matches);
            }
          }
          
          // Restore to in-memory cache
          allCampusDataCache = {
            timestamp,
            date: cacheKey,
            data: dataMap,
          };
          
          console.log(`[getAllCampusDataCache] ✅ Restored ${dataMap.size} RAs from Upstash Redis to in-memory cache`);
          return dataMap;
    } else {
      console.log(`[getAllCampusDataCache] ⚠️ CACHE EXPIRED - Upstash Redis cache expired (age: ${Math.round(age / 1000)}s), will refresh...`);
    }
      }
    }
    // Fallback: Try Vercel KV (legacy, if still available)
    else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const kvKey = `campus_cache:${cacheKey}`;
      
      const cachedData = await kv.get(kvKey);
      if (cachedData) {
        const { timestamp, data: cachedDataMap } = cachedData;
        const age = Date.now() - timestamp;
        
        if (age < cacheTTL) {
          console.log(`[getAllCampusDataCache] ✅ Found valid Vercel KV cache (age: ${Math.round(age / 1000)}s)`);
          
          const dataMap = new Map();
          if (cachedDataMap && typeof cachedDataMap === 'object') {
            for (const [ra, matches] of Object.entries(cachedDataMap)) {
              dataMap.set(ra, matches);
            }
          }
          
          allCampusDataCache = {
            timestamp,
            date: cacheKey,
            data: dataMap,
          };
          
          console.log(`[getAllCampusDataCache] Restored ${dataMap.size} RAs from Vercel KV to in-memory cache`);
          return dataMap;
        }
      }
    }
  } catch (error) {
    console.warn(`[getAllCampusDataCache] Error checking Redis cache:`, error.message);
    // Continue to fetch if Redis unavailable
  }
  
  // STEP 3: If already fetching, wait for that promise
  if (allCampusDataLoadPromise) {
    console.log(`[getAllCampusDataCache] Already fetching, waiting...`);
    return await allCampusDataLoadPromise;
  }
  
  // STEP 4: Fetch fresh data
  allCampusDataLoadPromise = fetchAllCampusData(date).then(async (data) => {
    // Update in-memory cache
    allCampusDataCache = {
      timestamp: Date.now(),
      date: cacheKey,
      data,
    };
    
    // Save to persistent storage (Upstash Redis or Vercel KV)
    saveCacheToRedis(cacheKey, data, date).then(() => {
      cacheStats.writes++;
      cacheStats.lastWrite = Date.now();
      console.log(`[getAllCampusDataCache] 💾 CACHE WRITE - Saved ${data.size} unique RAs to Redis`);
    }).catch(err => {
      cacheStats.errors++;
      console.warn(`[getAllCampusDataCache] ❌ CACHE WRITE ERROR - Failed to save to Redis:`, err.message);
    });
    
    allCampusDataLoadPromise = null;
    console.log(`[getAllCampusDataCache] ✅ Cache refreshed: ${data.size} unique RAs`);
    return data;
  }).catch(error => {
    console.error(`[getAllCampusDataCache] Error:`, error);
    allCampusDataLoadPromise = null;
    throw error;
  });
  
  return await allCampusDataLoadPromise;
}

/**
 * Save cache to Redis (Upstash Redis or Vercel KV)
 * @param {string} cacheKey - Cache key (date or 'any')
 * @param {Map} dataMap - Map of RA -> Array of matches
 * @param {string} date - Original date string (for TTL calculation)
 */
async function saveCacheToRedis(cacheKey, dataMap, date) {
  // Convert Map to plain object for JSON storage
  const dataObject = {};
  for (const [ra, matches] of dataMap.entries()) {
    dataObject[ra] = matches;
  }
  
  const timestamp = Date.now();
  
  // Calculate TTL based on date (Smart Date-Based Caching)
  const cacheTTL = getCacheTTLForDate(date);
  const cacheTTLSeconds = Math.floor(cacheTTL / 1000); // Convert to seconds for Redis
  
  // Try Upstash Redis first (via Marketplace - recommended)
  try {
    // Supports multiple naming conventions (default, custom prefix, legacy)
    const redisUrl = process.env.UPSTASH_REDIS__KV_REST_API_URL ||  // Custom prefix (UPSTASH_REDIS__)
                     process.env.UPSTASH_REDIS_REST_URL ||          // Default naming
                     process.env.REDIS_REST_URL ||                   // Alternative naming
                     process.env.KV_REST_API_URL;                    // Legacy KV naming
    const redisToken = process.env.UPSTASH_REDIS__KV_REST_API_TOKEN ||  // Custom prefix (UPSTASH_REDIS__)
                       process.env.UPSTASH_REDIS_REST_TOKEN ||          // Default naming
                       process.env.REDIS_REST_TOKEN ||                   // Alternative naming
                       process.env.KV_REST_API_TOKEN;                    // Legacy KV naming
    
    if (redisUrl && redisToken) {
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      
      const redisKey = `campus_cache:${cacheKey}`;
      
      await redis.set(redisKey, {
        timestamp,
        data: dataObject,
      }, { ex: cacheTTLSeconds }); // TTL: Dynamic based on date
      
      console.log(`[saveCacheToRedis] ✅ Saved ${dataMap.size} RAs to Upstash Redis cache`);
      return; // Success
    }
    // Fallback: Try Vercel KV (legacy, if still available)
    else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const { kv } = await import('@vercel/kv');
      const kvKey = `campus_cache:${cacheKey}`;
      
      await kv.set(kvKey, {
        timestamp,
        data: dataObject,
      });
      
      await kv.expire(kvKey, cacheTTLSeconds); // TTL: Dynamic based on date
      
      console.log(`[saveCacheToRedis] ✅ Saved ${dataMap.size} RAs to Vercel KV cache`);
      return;
    }
  } catch (error) {
    console.warn(`[saveCacheToRedis] Redis save failed:`, error.message);
    throw error; // Don't fallback, just log the error
  }
}

/**
 * Clear the global campus data cache (useful for manual refresh)
 */
export function clearAllCampusDataCache() {
  console.log('[clearAllCampusDataCache] Clearing global campus data cache');
  allCampusDataCache = null;
  allCampusDataLoadPromise = null;
  cacheStats = {
    hits: 0,
    misses: 0,
    writes: 0,
    errors: 0,
    lastHit: null,
    lastMiss: null,
    lastWrite: null,
  };
}

/**
 * Get cache status and statistics
 * @returns {Promise<Object>} - Cache status information
 */
export async function getCacheStatus() {
  // Calculate TTL based on cached date (if available)
  const cachedDate = allCampusDataCache?.date || null;
  const cacheTTL = cachedDate ? getCacheTTLForDate(cachedDate) : 6 * 60 * 60 * 1000; // Default 6 hours
  
  const status = {
    inMemory: {
      exists: allCampusDataCache !== null,
      date: allCampusDataCache?.date || null,
      timestamp: allCampusDataCache?.timestamp || null,
      age: allCampusDataCache ? Date.now() - allCampusDataCache.timestamp : null,
      ageFormatted: null,
      size: allCampusDataCache?.data?.size || 0,
      isExpired: allCampusDataCache ? (Date.now() - allCampusDataCache.timestamp) > cacheTTL : true,
      ttl: cacheTTL,
      ttlFormatted: `${Math.floor(cacheTTL / (60 * 60 * 1000))}h`,
    },
    redis: {
      available: false,
      connected: false,
      keys: [],
      sampleKeys: [],
    },
    stats: {
      ...cacheStats,
      hitRate: cacheStats.hits + cacheStats.misses > 0 
        ? ((cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100).toFixed(1) + '%'
        : '0%',
    },
  };
  
  // Format age
  if (status.inMemory.age !== null) {
    const seconds = Math.floor(status.inMemory.age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    if (hours > 0) {
      status.inMemory.ageFormatted = `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      status.inMemory.ageFormatted = `${minutes}m ${seconds % 60}s`;
    } else {
      status.inMemory.ageFormatted = `${seconds}s`;
    }
  }
  
  // Check Redis connection
  try {
    const redisUrl = process.env.UPSTASH_REDIS__KV_REST_API_URL || 
                     process.env.UPSTASH_REDIS_REST_URL || 
                     process.env.REDIS_REST_URL || 
                     process.env.KV_REST_API_URL;
    const redisToken = process.env.UPSTASH_REDIS__KV_REST_API_TOKEN || 
                       process.env.UPSTASH_REDIS_REST_TOKEN || 
                       process.env.REDIS_REST_TOKEN || 
                       process.env.KV_REST_API_TOKEN;
    
    if (redisUrl && redisToken) {
      status.redis.available = true;
      
      const { Redis } = await import('@upstash/redis');
      const redis = new Redis({
        url: redisUrl,
        token: redisToken,
      });
      
      // Test connection
      try {
        await redis.ping();
        status.redis.connected = true;
        
        // Get cache keys (sample)
        const keys = await redis.keys('campus_cache:*');
        status.redis.keys = keys;
        status.redis.sampleKeys = keys.slice(0, 10); // First 10 keys
        
        // Get sample cache data
        if (keys.length > 0) {
          const sampleKey = keys[0];
          const sampleData = await redis.get(sampleKey);
          if (sampleData) {
            status.redis.sampleData = {
              key: sampleKey,
              timestamp: sampleData.timestamp,
              age: Date.now() - sampleData.timestamp,
              dataSize: sampleData.data ? Object.keys(sampleData.data).length : 0,
            };
          }
        }
      } catch (err) {
        status.redis.error = err.message;
      }
    }
  } catch (error) {
    status.redis.error = error.message;
  }
  
  return status;
}

/**
 * Normalize RA number
 * @param {string} ra - Register number
 * @returns {string} - Normalized RA (uppercase, trimmed)
 */
export function normalizeRA(ra) {
  if (!ra) return '';
  return ra.trim().toUpperCase().replace(/\s+/g, '');
}

/**
 * Generate date variants for matching
 * @param {string} date - Date string (YYYY-MM-DD or DD-MM-YYYY or DD/MM/YYYY)
 * @returns {string[]} - Array of date format variants
 */
export function generateDateVariants(date) {
  if (!date) return [];
  
  const variants = new Set();
  
  // Original format
  variants.add(date);
  
  // Try to parse and generate variants
  let parsedDate = null;
  
  // Try YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    variants.add(`${day}-${month}-${year}`); // DD-MM-YYYY
    variants.add(`${day}/${month}/${year}`); // DD/MM/YYYY
    parsedDate = { day, month, year };
  }
  // Try DD-MM-YYYY or DD/MM/YYYY (4-digit year)
  else if (/^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(date)) {
    const parts = date.split(/[-\/]/);
    const [day, month, year] = parts;
    variants.add(`${year}-${month}-${day}`); // YYYY-MM-DD
    variants.add(`${day}-${month}-${year}`); // DD-MM-YYYY
    variants.add(`${day}/${month}/${year}`); // DD/MM/YYYY
    parsedDate = { day, month, year };
  }
  // Try DD-MM-YY or DD/MM/YY (2-digit year) - assume 20XX
  else if (/^\d{2}[-\/]\d{2}[-\/]\d{2}$/.test(date)) {
    const parts = date.split(/[-\/]/);
    let [day, month, yearShort] = parts;
    // Convert 2-digit year to 4-digit (assume 2000-2099)
    const year = yearShort.length === 2 ? `20${yearShort}` : yearShort;
    variants.add(`${day}-${month}-${year}`); // DD-MM-YYYY
    variants.add(`${day}/${month}/${year}`); // DD/MM/YYYY
    variants.add(`${year}-${month}-${day}`); // YYYY-MM-DD
    parsedDate = { day, month, year };
  }
  
  // Add common text formats
  if (parsedDate) {
    const { day, month, year } = parsedDate;
    // Remove leading zeros for some variants
    const dayNoZero = String(parseInt(day, 10));
    const monthNoZero = String(parseInt(month, 10));
    variants.add(`${dayNoZero}-${monthNoZero}-${year}`);
    variants.add(`${dayNoZero}/${monthNoZero}/${year}`);
  }
  
  return Array.from(variants);
}

/**
 * Fetch HTML page with timeout and retry
 * @param {string} url - URL to fetch
 * @param {number} timeout - Timeout in milliseconds (default: 12000)
 * @param {number} retries - Number of retries (default: 1)
 * @param {Object} options - Additional options (method, body, headers)
 * @returns {Promise<string>} - HTML content
 */
export async function fetchPage(url, timeout = 12000, retries = 1, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const defaultHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };
    
    // For POST requests, add form content type
    if (options.method === 'POST') {
      defaultHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }
    
    const response = await fetch(url, {
      signal: controller.signal,
      method: options.method || 'GET',
      body: options.body || null,
      headers: { ...defaultHeaders, ...(options.headers || {}) },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    return html;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (retries > 0 && error.name !== 'AbortError') {
      // Wait a bit before retry
      await new Promise(resolve => setTimeout(resolve, 500));
      return fetchPage(url, timeout, retries - 1, options);
    }
    
    throw error;
  }
}

/**
 * Guess session from context text
 * @param {string} text - Context text around RA
 * @returns {string|null} - Session name or null
 */
export function guessSessionFromContext(text) {
  if (!text) return null;
  
  const upperText = text.toUpperCase();
  
  // Check for explicit session indicators
  if (upperText.includes('FORENOON') || upperText.includes('FN')) {
    return 'Forenoon';
  }
  if (upperText.includes('AFTERNOON') || upperText.includes('AN')) {
    return 'Afternoon';
  }
  
  return null;
}

/**
 * Parse hall and bench from text context
 * @param {string} text - Text containing hall/bench info
 * @returns {{hall: string|null, bench: string|null}} - Extracted hall and bench
 */
export function parseHallAndBench(text) {
  if (!text) return { hall: null, bench: null };
  
  // Common patterns:
  // "Hall: S45", "Room: TP603", "Hall S45", "S45", "TP603", "H216", "H301B"
  // "Bench: A12", "Bench A12", "A12", "12", "SEAT NO: 1"
  
  let hall = null;
  let bench = null;
  
  // Try to find hall/room patterns (SRM uses formats like H216, H301B, TP603, etc.)
  const hallPatterns = [
    /ROOM\s+NO[:\s]+([A-Z0-9]+)/i,
    /(?:Hall|Room)[\s:]*([A-Z]?\d+[A-Z]?)/i,
    /\b([A-Z]{1,3}\d{2,4}[A-Z]?)\b/, // TP603, S45, UB101, H216, H301B
    /\b(Hall\s+[A-Z]?\d+)/i,
  ];
  
  for (const pattern of hallPatterns) {
    const match = text.match(pattern);
    if (match) {
      hall = match[1] || match[0];
      break;
    }
  }
  
  // Try to find bench/seat patterns
  const benchPatterns = [
    /SEAT\s+NO[:\s]*(\d+)/i,
    /(?:Bench|Seat)[\s:]*([A-Z]?\d+)/i,
    /\b([A-Z]\d{1,3})\b/, // A12, B5
    /\b(Bench\s+[A-Z]?\d+)/i,
  ];
  
  for (const pattern of benchPatterns) {
    const match = text.match(pattern);
    if (match) {
      bench = match[1] || match[0];
      break;
    }
  }
  
  return { hall, bench };
}

/**
 * Extract seating rows from HTML (table-based or text-based)
 * @param {string} html - HTML content
 * @param {string} targetRA - Optional: specific RA to search for (if provided, only extract rows for this RA)
 * @returns {Array<{ra: string, session: string, hall: string, bench: string, context: string}>} - Extracted rows
 */
export function extractSeatingRows(html, targetRA = null) {
  const rows = [];
  
  if (!html) return rows;
  
  // Extract room/hall information from headers
  // Pattern: ROOM NO:H216, ROOM NO:H301B, or ROOM NO:TPTP-201
  const roomPattern = /ROOM\s+NO[:\s]+([A-Z0-9\-]+)/gi;
  const roomMatches = [...html.matchAll(roomPattern)];
  
  // Extract session from headers
  // Pattern: SESSION : FN or SESSION : AN
  const sessionPattern = /SESSION\s*[:\s]+(FN|AN)/gi;
  const sessionMatches = [...html.matchAll(sessionPattern)];
  
  // Current room and session (will be updated as we parse)
  let currentRoom = null;
  let currentSession = null;
  
  // Method 1: Simple approach - Find RA, then look above for "ROOM NO:"
  // If targetRA is provided, only search for that specific RA with exact matching
  let allRAMatches = [];
  if (targetRA) {
    // Search for the specific RA with word boundaries to ensure exact match
    // This prevents matching similar RAs (e.g., RA2311026010094 vs RA2311056010094)
    const escapedRA = targetRA.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Use word boundary or HTML tag boundary to ensure exact match
    let raPattern = new RegExp(`(?:>|"|'|\\b|\\s)(${escapedRA})(?:<|"|'|\\b|\\s)`, 'gi');
    let matches = [...html.matchAll(raPattern)];
    
    // If strict pattern finds nothing, try a simpler pattern (fallback for edge cases)
    if (matches.length === 0) {
      raPattern = new RegExp(`(${escapedRA})`, 'gi');
      matches = [...html.matchAll(raPattern)];
    }
    
    // Filter to ensure we only get exact matches (case-insensitive) and extract the RA
    allRAMatches = matches
      .filter(match => {
        const matchedRA = match[1] || match[0];
        return matchedRA.toUpperCase() === targetRA.toUpperCase();
      })
      .map(match => {
        const matchedRA = match[1] || match[0];
        const matchStart = match.index;
        // If we used the simpler pattern, the index is already correct
        // If we used the strict pattern, adjust index to point to RA
        const raIndex = match[1] ? matchStart + (match[0].indexOf(match[1])) : matchStart;
        return {
          0: matchedRA, // The actual RA
          index: raIndex
        };
      });
  } else {
    // Search for all RAs
    const raPattern = /(?:>|"|'|\b|\s)(RA\d{10,15})(?:<|"|'|\b|\s)/gi;
    const matches = [...html.matchAll(raPattern)];
    allRAMatches = matches.map(match => ({
      0: match[1],
      index: match.index + (match[0].indexOf(match[1]))
    }));
  }
  
  console.log(`[DEBUG extractSeatingRows] targetRA: ${targetRA}, found ${allRAMatches.length} RA matches`);
  
  // Track unique entries to avoid duplicates (same RA + room + session)
  const seenEntries = new Set();
  
  // OPTIMIZATION: Early exit if we found the target RA and have matches
  let foundTargetRA = false;
  
  for (const raMatch of allRAMatches) {
    const ra = raMatch[0].toUpperCase();
    const raIndex = raMatch.index;
    
    // Look backwards (above) for the nearest "ROOM NO:" header
    // First, replace HTML entities to make matching easier
    const beforeRA = html.substring(0, raIndex).replace(/&nbsp;/gi, ' ');
    // Match ROOM NO: followed by room name (handle spaces and colons)
    const roomMatch = beforeRA.match(/ROOM\s+NO\s*[: ]+\s*([A-Z0-9\-]+)/gi);
    
    console.log(`[DEBUG extractSeatingRows] RA: ${ra}, roomMatch: ${roomMatch ? roomMatch.length : 0} matches`);
    
    if (!roomMatch || roomMatch.length === 0) {
      console.log(`[DEBUG extractSeatingRows] No room found for RA ${ra}`);
      continue;
    }
    
    // Get the last (nearest) room match and extract room name
    const lastRoomMatch = roomMatch[roomMatch.length - 1];
    // Extract room name: everything after "ROOM NO:" or "ROOM NO "
    const roomNameMatch = lastRoomMatch.match(/ROOM\s+NO\s*[: ]+\s*([A-Z0-9\-]+)/i);
    const roomName = roomNameMatch ? roomNameMatch[1] : lastRoomMatch.replace(/ROOM\s+NO\s*[: ]+\s*/i, '').trim();
    
    // Find the index of the room header to limit session search to this room section
    const lastRoomMatchIndex = beforeRA.lastIndexOf(lastRoomMatch);
    const roomSectionStart = lastRoomMatchIndex >= 0 ? lastRoomMatchIndex : 0;
    const roomSection = beforeRA.substring(roomSectionStart);
    
    console.log(`[DEBUG extractSeatingRows] RA: ${ra}, extracted room: ${roomName}, lastRoomMatch: ${lastRoomMatch}`);
    
    // Find session (look in the room section between ROOM NO and RA, not in entire beforeRA)
    // This ensures we get the correct session for this specific room
    let session = 'Unknown';
    const sessionMatch = roomSection.match(/SESSION\s*[: ]\s*(FN|AN|FORENOON|AFTERNOON)/i);
    if (sessionMatch) {
      const sessionValue = sessionMatch[1].toUpperCase();
      if (sessionValue === 'FN' || sessionValue === 'FORENOON') {
        session = 'Forenoon';
      } else if (sessionValue === 'AN' || sessionValue === 'AFTERNOON') {
        session = 'Afternoon';
      }
    } else {
      // Fallback: look in entire beforeRA if not found in room section
      const fallbackSessionMatch = beforeRA.match(/SESSION\s*[: ]\s*(FN|AN|FORENOON|AFTERNOON)/i);
      if (fallbackSessionMatch) {
        const sessionValue = fallbackSessionMatch[1].toUpperCase();
        if (sessionValue === 'FN' || sessionValue === 'FORENOON') {
          session = 'Forenoon';
        } else if (sessionValue === 'AN' || sessionValue === 'AFTERNOON') {
          session = 'Afternoon';
        }
      }
    }
    
    // Find the table row containing this RA
    let trStart = html.lastIndexOf('<tr', raIndex);
    if (trStart === -1) continue;
    
    let trEnd = html.indexOf('</tr>', raIndex);
    if (trEnd === -1) continue;
    trEnd += 5;
    
    const rowHtml = html.substring(trStart, trEnd);
    
    // Extract data from table cells
    const tdMatches = rowHtml.match(/<td[^>]*>([^<]*)<\/td>/gi);
    let seatNumber = null;
    let department = null;
    let subjectCode = null;
    
    if (tdMatches) {
      // Find all non-empty cells
      const nonEmptyCells = tdMatches
        .map(cell => cell.replace(/<[^>]+>/g, '').trim())
        .filter(cell => cell.length > 0);
      
      // Look for seat number (numeric value)
      for (const cell of nonEmptyCells) {
        if (/^\d+$/.test(cell)) {
          seatNumber = cell;
          break;
        }
      }
      
      // Look for department (contains "/" like "CSE/21MAB201T")
      for (const cell of nonEmptyCells) {
        if (cell.includes('/') && !cell.match(/^\d+$/)) {
          // Split department and subject code
          const parts = cell.split('/');
          if (parts.length >= 2) {
            department = parts[0].trim();
            subjectCode = parts[1].trim();
            console.log(`[DEBUG extractSeatingRows] Split "${cell}" into department="${department}", subjectCode="${subjectCode}"`);
          } else {
            department = cell;
          }
          break;
        }
      }
      
      console.log(`[DEBUG extractSeatingRows] Final values - department: ${department}, subjectCode: ${subjectCode}, seatNumber: ${seatNumber}`);
      
      // If no department found with "/", take first non-empty non-numeric cell
      if (!department && nonEmptyCells.length > 0) {
        for (const cell of nonEmptyCells) {
          if (!/^\d+$/.test(cell) && cell.length > 2) {
            department = cell;
            break;
          }
        }
      }
    }
    
    // Extract text content for context
    const textContent = rowHtml
      .replace(/<[^>]+>/g, '|')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Create unique key for this entry (RA + room + session)
    // This prevents duplicates when merging HTML from multiple sources
    const entryKey = `${ra}_${roomName}_${session}`;
    
    // If we've already seen this exact entry, skip it (duplicate from merged HTML)
    if (seenEntries.has(entryKey)) {
      console.log(`[DEBUG extractSeatingRows] Skipping duplicate entry: ${entryKey}`);
      continue;
    }
    
    seenEntries.add(entryKey);
    
    rows.push({
      ra,
      session: session,
      hall: roomName,
      bench: seatNumber || 'N/A',
      department: department || 'N/A',
      subjectCode: subjectCode || null,
      context: textContent.substring(0, 150),
    });
    
    // OPTIMIZATION: Early exit if we found the target RA and have a complete match
    if (targetRA && ra.toUpperCase() === targetRA.toUpperCase() && roomName && session) {
      foundTargetRA = true;
      console.log(`[DEBUG extractSeatingRows] Target RA ${targetRA} found, stopping further parsing`);
      break; // Exit early - we found what we need
    }
  }
  
  // OPTIMIZATION: If we found target RA early, return immediately
  if (foundTargetRA && rows.length > 0) {
    console.log(`[DEBUG extractSeatingRows] Early exit - target RA found, returning ${rows.length} matches`);
    return rows;
  }
  
  // Method 2: If no table rows found, do regex text scanning
  if (rows.length === 0) {
    // Look for RA patterns in the entire HTML (longer format)
    // Use flexible pattern that works in HTML context
    const raPattern = /(?:>|"|'|\b)(RA\d{10,15})(?:<|"|'|\s|\b)/gi;
    let raMatches = [...html.matchAll(raPattern)];
    
    // If no matches with boundaries, try without boundaries
    if (raMatches.length === 0) {
      const flexiblePattern = /(RA\d{10,15})/gi;
      raMatches = [...html.matchAll(flexiblePattern)];
    }
    
    for (const match of raMatches) {
      // Extract the RA from the match (group 1 is the captured RA)
      const ra = (match[1] || match[0]).toUpperCase();
      const matchIndex = match.index;
      
      // Find nearest room and session
      let nearestRoom = null;
      let nearestSession = null;
      
      for (const roomMatch of roomMatches) {
        if (roomMatch.index < matchIndex && (!nearestRoom || roomMatch.index > roomMatches.find(r => r[1] === nearestRoom)?.index)) {
          nearestRoom = roomMatch[1];
        }
      }
      
      for (const sessionMatch of sessionMatches) {
        if (sessionMatch.index < matchIndex) {
          nearestSession = sessionMatch[1] === 'FN' ? 'Forenoon' : 'Afternoon';
        }
      }
      
      // Extract context window
      const start = Math.max(0, matchIndex - 100);
      const end = Math.min(html.length, matchIndex + match[0].length + 100);
      const context = html.substring(start, end)
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      rows.push({
        ra,
        session: nearestSession || 'Unknown',
        hall: nearestRoom || 'N/A',
        bench: 'N/A',
        department: 'N/A',
        subjectCode: null,
        context: context.substring(0, 150),
      });
    }
  }
  
  // Debug: Log extraction results
  if (rows.length > 0) {
    console.log(`[DEBUG extractSeatingRows] Final rows extracted: ${rows.length}`);
  }
  
  // Filter to ensure only one entry per RA + session combination
  // A student cannot be in multiple rooms in the same session
  const uniqueRows = [];
  const raSessionKeys = new Set();
  
  for (const row of rows) {
    const key = `${row.ra}_${row.session}`;
    if (!raSessionKeys.has(key)) {
      raSessionKeys.add(key);
      uniqueRows.push(row);
    } else {
      console.log(`[DEBUG extractSeatingRows] Filtering duplicate RA+session: ${row.ra} in ${row.session} (keeping first occurrence)`);
    }
  }
  
  return uniqueRows;
}

/**
 * Find matches in HTML for given RA and date variants
 * @param {string} html - HTML content
 * @param {string} ra - Normalized RA number
 * @param {string[]} dateVariants - Array of date format variants
 * @returns {Array} - Matching seating information
 */
export function findMatchesInHTML(html, ra, dateVariants) {
  const matches = [];
  
  if (!html || !ra) return matches;
  
  // Extract seating rows for the specific RA (more efficient)
  const rows = extractSeatingRows(html, ra);
  
  // All returned rows should match the RA, but filter to be safe
  const raMatches = rows.filter(row => 
    row.ra.toUpperCase() === ra.toUpperCase()
  );
  
  if (raMatches.length === 0) return matches;
  
  // Check if any date variant appears in the HTML or context
  const htmlLower = html.toLowerCase();
  const hasDateMatch = dateVariants.some(dateVariant => {
    const normalized = dateVariant.toLowerCase().replace(/[-\/]/g, '[-\/]?');
    return htmlLower.includes(dateVariant.toLowerCase());
  });
  
  // If date variants provided but none match, still return RA matches
  // (date might be in a different part of the page)
  if (dateVariants.length > 0 && !hasDateMatch) {
    // Still return matches but mark as potential
    return raMatches.map(row => ({
      ...row,
      matched: true,
      dateMatched: false,
    }));
  }
  
  // Return matches with date confirmation
  return raMatches.map(row => ({
    ...row,
    matched: true,
    dateMatched: hasDateMatch,
  }));
}

/**
 * Parse RA range (e.g., "RA2411042010001-RA2411042010027")
 * @param {string} rangeStr - RA range string
 * @param {string} ra - RA number to check
 * @returns {boolean} - True if RA is in range
 */
function isRAInRange(rangeStr, ra) {
  if (!rangeStr || !ra) return false;
  
  // Match pattern: RA2411042010001-RA2411042010027
  const rangeMatch = rangeStr.match(/RA(\d+)-RA(\d+)/i);
  if (!rangeMatch) return false;
  
  const startRA = BigInt(rangeMatch[1]);
  const endRA = BigInt(rangeMatch[2]);
  const raNum = BigInt(ra.replace(/^RA/i, ''));
  
  // Compare as BigInt to handle large RA numbers
  return raNum >= startRA && raNum <= endRA;
}

/**
 * Parse consolidated report HTML for RA ranges
 * @param {string} html - HTML content from consolidated report
 * @param {string} ra - Normalized RA number
 * @param {string[]} dateVariants - Date format variants
 * @returns {Array} - Array of matches
 */
function parseConsolidatedReport(html, ra, dateVariants) {
  const matches = [];
  
  if (!html || !ra) return matches;
  
  // For consolidated reports, we already filtered by date when fetching via POST
  // So we can be lenient with date matching - just check if HTML contains date-like patterns
  const htmlLower = html.toLowerCase();
  let hasDateMatch = true; // Default to true for consolidated reports
  
  // Only do strict date matching if we want to verify, but since we POSTed with the date,
  // the response should already be filtered. Just check if HTML has date-like content
  if (dateVariants && dateVariants.length > 0 && html.length > 0) {
    // Check if HTML contains any date-like pattern (day/month/year or month name)
    const hasDatePattern = /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/.test(html) || 
                          /\d{1,2}[-\/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-\/]\d{2,4}/i.test(html);
    
    // If HTML has date patterns and RA numbers, assume it's valid
    if (hasDatePattern && /\bRA\d{2}/i.test(html)) {
      hasDateMatch = true;
    } else {
      // Try to match date variants
      hasDateMatch = dateVariants.some(dateVariant => {
        const normalized = dateVariant.toLowerCase();
        return htmlLower.includes(normalized);
      });
      
      // Also check for month name format (e.g., "17/NOV/2025")
      if (!hasDateMatch) {
        const monthNames = {
          '01': ['jan', 'january'], '02': ['feb', 'february'], '03': ['mar', 'march'],
          '04': ['apr', 'april'], '05': ['may'], '06': ['jun', 'june'],
          '07': ['jul', 'july'], '08': ['aug', 'august'], '09': ['sep', 'september'],
          '10': ['oct', 'october'], '11': ['nov', 'november'], '12': ['dec', 'december']
        };
        
        for (const dateVariant of dateVariants) {
          const parts = dateVariant.split(/[-\/]/);
          if (parts.length === 3) {
            const [day, month, year] = parts;
            const monthVariants = monthNames[month];
            if (monthVariants) {
              for (const monthName of monthVariants) {
                const variants = [
                  `${day}/${monthName}/${year}`,
                  `${day}-${monthName}-${year}`,
                  `${day} ${monthName} ${year}`,
                  `${day}/${monthName.toUpperCase()}/${year}`,
                  `${day}-${monthName.toUpperCase()}-${year}`,
                  `${day} ${monthName.toUpperCase()} ${year}`
                ];
                
                hasDateMatch = variants.some(variant => 
                  htmlLower.includes(variant.toLowerCase())
                );
                
                if (hasDateMatch) break;
              }
              if (hasDateMatch) break;
            }
          }
        }
      }
    }
  }
  
  // Parse table rows - format: <tr><td>DEGREE</td><td>DEPARTMENT</td><td>SUBCODE</td><td>REGISTER NO.</td><td>ROOM NO.</td><td>TOTAL NO.</td></tr>
  const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
  const rows = html.match(rowPattern) || [];
  
  for (const rowHtml of rows) {
    // Extract cells - handle both <td>content</td> and <td >content</td>
    // Use a more robust pattern that captures content between tags
    const cellPattern = /<td[^>]*>([^<]*)<\/td>/gi;
    const cells = [];
    let match;
    while ((match = cellPattern.exec(rowHtml)) !== null) {
      cells.push(match[1].trim());
    }
    
    if (!cells || cells.length < 5) continue;
    
    // Skip header row (contains "DEGREE", "DEPARTMENT", "REGISTER NO.", etc.)
    if (cells[0] && (cells[0].toUpperCase().includes('DEGREE') || 
        cells[1]?.toUpperCase().includes('DEPARTMENT') ||
        cells[3]?.toUpperCase().includes('REGISTER'))) {
      continue;
    }
    
    // Get register number (4th cell, index 3) and room (5th cell, index 4)
    const registerCell = cells[3];
    const roomCell = cells[4];
    const departmentCell = cells[1];
    const subcodeCell = cells[2];
    
    if (!registerCell || !roomCell) continue;
    
    // Skip if register cell doesn't contain RA pattern
    if (!/RA\d+/i.test(registerCell)) continue;
    
    // Check if RA is in the range
    if (isRAInRange(registerCell, ra)) {
      // Extract session from HTML context
      let session = 'Unknown';
      if (htmlLower.includes('session : an') || htmlLower.includes('session: an')) {
        session = 'Afternoon';
      } else if (htmlLower.includes('session : fn') || htmlLower.includes('session: fn')) {
        session = 'Forenoon';
      }
      
      matches.push({
        ra: ra.toUpperCase(),
        session,
        hall: roomCell,
        bench: 'N/A', // Consolidated report doesn't have individual seat numbers
        department: departmentCell || 'N/A',
        context: `${departmentCell || ''} ${subcodeCell || ''} ${registerCell}`.trim(),
        matched: true,
        dateMatched: hasDateMatch,
        source: 'consolidated'
      });
    }
  }
  
  return matches;
}

/**
 * Fetch seating info for a single campus
 * @param {string} campusName - Campus name
 * @param {string} ra - Normalized RA number
 * @param {string[]} dateVariants - Date format variants
 * @returns {Promise<Array>} - Array of matches for this campus
 */
export async function fetchCampusSeating(campusName, ra, dateVariants, fastFail = false) {
  const campusConfig = CAMPUS_ENDPOINTS[campusName];
  if (!campusConfig) return [];
  
  try {
    // Reduced delay for fast fail mode (100-200ms) vs normal (300-700ms)
    const delay = fastFail ? (100 + Math.random() * 100) : (300 + Math.random() * 400);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    let html = '';
    let fetchUrl = campusConfig.fetchData;
    
    // Try POST request to fetch_data.php with date and session (room-wise data only)
    // Collect HTML from all sessions to merge results
    let allHtmlSources = [];
    
    if (dateVariants && dateVariants.length > 0) {
      const dateParam = dateVariants[0];
      
      // Try both Forenoon and Afternoon sessions
      const sessions = ['FN', 'AN'];
      
      for (const session of sessions) {
        try {
          // Format date for POST (usually DD/MM/YYYY or DD-MM-YYYY)
          // Convert to DD/MM/YYYY format which is common for date pickers
          let formattedDate = dateParam;
          if (dateParam.includes('-')) {
            formattedDate = dateParam.replace(/-/g, '/');
          }
          
          // Create form data
          const formData = new URLSearchParams();
          formData.append('dated', formattedDate);
          formData.append('session', session);
          formData.append('submit', 'Submit');
          
          // Fetch room-wise data from fetch_data.php
          // Use shorter timeout for fast fail mode (3s) vs normal (12s)
          const timeout = fastFail ? 3000 : 12000;
          const postHtml = await fetchPage(
            campusConfig.fetchData,
            timeout,
            1,
            {
              method: 'POST',
              body: formData.toString(),
            }
          );
          
          // Check if we got actual data with RA numbers
          // Use flexible pattern that works in HTML context
          const hasRAPattern = /(?:>|"|'|\b)(RA\d{2,})/i.test(postHtml);
          // Also check if the target RA is in the HTML (if provided)
          const hasTargetRA = ra ? new RegExp(ra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(postHtml) : true;
          
          if (postHtml.length > 5000 && (hasRAPattern || hasTargetRA)) {
            allHtmlSources.push(postHtml);
            fetchUrl = `${campusConfig.fetchData}?dated=${encodeURIComponent(formattedDate)}&session=${session}`;
            console.log(`[DEBUG ${campusName}] Found HTML from ${session} session, length: ${postHtml.length}, hasTargetRA: ${hasTargetRA}`);
            
            // OPTIMIZATION: Skip Afternoon if Forenoon has the target RA
            // If we found the target RA in Forenoon session, no need to check Afternoon
            if (ra && hasTargetRA && session === 'FN') {
              console.log(`[DEBUG ${campusName}] Target RA found in Forenoon, skipping Afternoon session`);
              break; // Exit session loop early
            }
          }
        } catch (e) {
          console.error(`Error POSTing to ${campusName} (${session}):`, e.message);
          continue;
        }
      }
    }
    
    // Merge all HTML sources (combine them to find all entries)
    if (allHtmlSources.length > 0) {
      // Combine all HTML sources - this ensures we find all entries across all endpoints
      html = allHtmlSources.join('\n<!-- MERGED FROM MULTIPLE SOURCES -->\n');
      console.log(`[DEBUG ${campusName}] Merged ${allHtmlSources.length} HTML sources, total length: ${html.length}`);
    }
    
    
    // Debug: Check HTML structure
    const debugInfo = {
      htmlLength: html.length,
      hasTableRows: html.length > 0 ? /<tr[^>]*>/i.test(html) : false,
      hasRAs: html.length > 0 ? /(?:>|"|'|\b)(RA\d{2,})/i.test(html) : false,
      hasTargetRA: html.length > 0 ? new RegExp(ra.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(html) : false,
    };
    
    if (html.length > 0) {
      console.log(`[DEBUG ${campusName}] HTML length: ${html.length}, Has table rows: ${debugInfo.hasTableRows}, Has RAs: ${debugInfo.hasRAs}, Has target RA ${ra}: ${debugInfo.hasTargetRA}`);
    } else {
      console.log(`[DEBUG ${campusName}] HTML is empty!`);
    }
    
    // Get matches from room-wise report only
    const matches = findMatchesInHTML(html, ra, dateVariants);
    
    // Debug: Log match results
    console.log(`[DEBUG ${campusName}] Found ${matches.length} matches for RA ${ra}`);
    
    // Store debug info in matches for API response
    if (matches.length === 0 && debugInfo.hasTargetRA) {
      console.log(`[DEBUG ${campusName}] RA found in HTML but no matches returned - extraction issue!`);
    }
    
    // Use only room-wise matches
    const allMatches = matches;
    
    return allMatches.map(match => ({
      ...match,
      url: fetchUrl,
      campus: campusName,
    }));
  } catch (error) {
    console.error(`Error fetching ${campusName}:`, error.message);
    return [];
  }
}

/**
 * Get cache key for RA + date combination
 * @param {string} ra - RA number
 * @param {string} date - Date string
 * @returns {string} - Cache key
 */
function getCacheKey(ra, date) {
  return `seating_${ra}_${date || 'any'}`;
}

/**
 * Get cached result if available and not expired
 * @param {string} ra - RA number
 * @param {string} date - Date string
 * @returns {Object|null} - Cached result or null
 */
export function getCachedResult(ra, date) {
  const key = getCacheKey(ra, date);
  const cached = cache.get(key);
  
  if (!cached) return null;
  
  // Check if cache is still valid (15 minutes TTL - increased for better performance)
  const now = Date.now();
  const age = now - cached.timestamp;
  const ttl = 15 * 60 * 1000; // 15 minutes - increased from 5 minutes for better speed
  
  if (age > ttl) {
    cache.delete(key);
    return null;
  }
  
  return cached.data;
}

/**
 * Set cache result
 * @param {string} ra - RA number
 * @param {string} date - Date string
 * @param {Object} data - Data to cache
 */
export function setCachedResult(ra, date, data) {
  const key = getCacheKey(ra, date);
  cache.set(key, {
    timestamp: Date.now(),
    data,
  });
}

/**
 * Load student data from Supabase (primary) or seat-data.json (fallback)
 * @returns {Promise<Map>} - Map of RA -> {name}
 */
async function loadStudentData() {
  // Return cached data if already loaded and valid (not empty)
  if (studentDataCache && studentDataCache.size > 0) {
    console.log(`[loadStudentData] Using cached data: ${studentDataCache.size} records`);
    return studentDataCache;
  }
  
  // If cache exists but is empty, clear it and reload
  if (studentDataCache && studentDataCache.size === 0) {
    console.log(`[loadStudentData] Cache is empty, clearing and reloading...`);
    studentDataCache = null;
    studentDataLoadPromise = null;
  }
  
  // If already loading, wait for that promise
  if (studentDataLoadPromise) {
    return studentDataLoadPromise;
  }
  
  // Start loading
  studentDataLoadPromise = (async () => {
    let studentData = null;
    let loadMethod = 'unknown';
    
    try {
      // STRATEGY 0: Try Supabase first (most reliable)
      try {
        console.log(`[loadStudentData] Attempting to load from Supabase...`);
        const { supabase, isSupabaseConfigured } = await import('./supabase-client.js');
        
        if (isSupabaseConfigured() && supabase) {
          const { data, error } = await supabase
            .from('students')
            .select('register_number, name');
          
          if (error) {
            console.log(`[loadStudentData] Supabase error: ${error.message}`);
          } else if (data && data.length > 0) {
            // Convert to Map
            const lookup = new Map();
            data.forEach(entry => {
              if (entry.register_number && entry.name) {
                const ra = normalizeRA(entry.register_number);
                if (ra) {
                  lookup.set(ra, {
                    name: entry.name || null,
                  });
                }
              }
            });
            
            studentData = lookup;
            loadMethod = 'Supabase';
            console.log(`[loadStudentData] ✓ Successfully loaded ${lookup.size} records from Supabase`);
          } else {
            console.log(`[loadStudentData] Supabase returned no data`);
          }
        } else {
          console.log(`[loadStudentData] Supabase not configured, trying fallback...`);
        }
      } catch (supabaseError) {
        console.log(`[loadStudentData] Supabase failed: ${supabaseError.message}`);
      }
      
      // STRATEGY 1: Fallback to JSON file if Supabase failed
      if (!studentData || studentData.size === 0) {
        console.log(`[loadStudentData] Falling back to JSON file...`);
        let fileContent = null;
        
        // Try createRequire (works in Node.js serverless functions)
      try {
        console.log(`[loadStudentData] Attempting createRequire...`);
        const { createRequire } = await import('module');
        const require = createRequire(import.meta.url);
        const path = await import('path');
        const { fileURLToPath } = await import('url');
        
        // Get current file directory
        const currentFileUrl = import.meta.url;
        const currentFilePath = fileURLToPath(currentFileUrl);
        const currentDir = path.dirname(currentFilePath);
        
        // Try multiple paths
        const possibleRequirePaths = [
          path.join(currentDir, 'data', 'seat-data.json'),
          path.join(currentDir, '..', 'data', 'seat-data.json'),
          './data/seat-data.json',
          '../data/seat-data.json',
        ];
        
        for (const requirePath of possibleRequirePaths) {
          try {
            console.log(`[loadStudentData] Trying require: ${requirePath}`);
            const data = require(requirePath);
            fileContent = JSON.stringify(data);
            loadMethod = `createRequire: ${requirePath}`;
            console.log(`[loadStudentData] ✓ Successfully loaded via createRequire (${fileContent.length} bytes)`);
            break;
          } catch (reqError) {
            console.log(`[loadStudentData] require failed for ${requirePath}: ${reqError.message}`);
            continue;
          }
        }
      } catch (requireError) {
        console.log(`[loadStudentData] createRequire approach failed: ${requireError.message}`);
      }
      
      // STRATEGY 1: Try file system (if direct import failed)
      if (!fileContent) {
        console.log(`[loadStudentData] Attempting to load from file system...`);
        const fs = await import('fs');
        const path = await import('path');
        
        console.log(`[loadStudentData] process.cwd(): ${process.cwd()}`);
        
        // Try to get __dirname equivalent for ES modules first
        let currentDir = null;
        try {
          const { fileURLToPath } = await import('url');
          const currentFileUrl = import.meta.url;
          const currentFilePath = fileURLToPath(currentFileUrl);
          currentDir = path.dirname(currentFilePath);
          console.log(`[loadStudentData] __dirname: ${currentDir}`);
        } catch (e) {
          console.log(`[loadStudentData] Could not get __dirname: ${e.message}`);
        }
        
        // Try multiple possible paths for Vercel serverless functions
        // NOTE: api/data/seat-data.json will be included in the serverless function bundle
        const possiblePaths = [];
        
        // Add paths relative to current file location (most reliable)
        if (currentDir) {
          possiblePaths.push(path.join(currentDir, 'data', 'seat-data.json')); // api/data/seat-data.json
          possiblePaths.push(path.join(currentDir, '..', 'public', 'seat-data.json'));
        }
        
        // Add paths relative to process.cwd()
        possiblePaths.push(
          path.join(process.cwd(), 'api', 'data', 'seat-data.json'),
          path.join(process.cwd(), 'data', 'seat-data.json'),
          path.join(process.cwd(), 'public', 'seat-data.json'),
          path.join(process.cwd(), '..', 'public', 'seat-data.json'),
          path.join(process.cwd(), 'seat-data.json')
        );
        
        // Add absolute paths for Vercel
        possiblePaths.push(
          '/var/task/api/data/seat-data.json',
          '/var/task/data/seat-data.json',
          '/var/task/public/seat-data.json',
          '/var/task/seat-data.json'
        );
        
        console.log(`[loadStudentData] Trying paths:`, possiblePaths);
        
        for (const tryPath of possiblePaths) {
          try {
            console.log(`[loadStudentData] Checking: ${tryPath}`);
            if (fs.existsSync(tryPath)) {
              console.log(`[loadStudentData] ✓ Found file at: ${tryPath}`);
              fileContent = fs.readFileSync(tryPath, 'utf-8');
              loadMethod = `File: ${tryPath}`;
              console.log(`[loadStudentData] ✓ Successfully loaded from file system: ${tryPath} (${fileContent.length} bytes)`);
              break;
            } else {
              console.log(`[loadStudentData] ✗ File does not exist: ${tryPath}`);
            }
          } catch (e) {
            console.log(`[loadStudentData] ✗ File system error for ${tryPath}: ${e.message}`);
            continue;
          }
        }
      }
      
      // STRATEGY 2: Try API endpoint if file system failed
      if (!fileContent) {
        console.log(`[loadStudentData] File system failed, trying API endpoint...`);
        const possibleUrls = [];
        
        // Get the correct base URL
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : process.env.VERCEL 
            ? 'https://gradex.vercel.app'
            : 'https://gradex.vercel.app';
        
        possibleUrls.push(`${baseUrl}/api/student-data`);
        possibleUrls.push('https://gradex.vercel.app/api/student-data');
        
        // Try fetching from API endpoint
        for (const url of possibleUrls) {
          try {
            console.log(`[loadStudentData] Attempting to fetch from API: ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            const response = await fetch(url, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'GradeX-SeatFinder/1.0',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              fileContent = JSON.stringify(await response.json());
              loadMethod = `API: ${url}`;
              console.log(`[loadStudentData] ✓ Successfully loaded from API ${url} (${fileContent.length} bytes)`);
              break;
            } else {
              console.log(`[loadStudentData] API ${url} returned status ${response.status}`);
            }
          } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
              console.log(`[loadStudentData] Timeout fetching from ${url}`);
            } else {
              console.log(`[loadStudentData] Error fetching from ${url}: ${fetchError.message}`);
            }
            continue;
          }
        }
      }
      
      // STRATEGY 3: Last resort - try public URL
      if (!fileContent) {
        console.log(`[loadStudentData] API failed, trying public URL as last resort...`);
        const possibleUrls = [
          'https://gradex.vercel.app/seat-data.json',
        ];
        
        for (const url of possibleUrls) {
          try {
            console.log(`[loadStudentData] Attempting to fetch from public URL: ${url}`);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(url, {
              headers: {
                'Accept': 'application/json',
                'User-Agent': 'GradeX-SeatFinder/1.0',
              },
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              fileContent = await response.text();
              loadMethod = `Public URL: ${url}`;
              console.log(`[loadStudentData] ✓ Successfully loaded from public URL ${url} (${fileContent.length} bytes)`);
              break;
            } else {
              console.log(`[loadStudentData] Public URL ${url} returned status ${response.status}`);
            }
          } catch (fetchError) {
            if (fetchError.name === 'AbortError') {
              console.log(`[loadStudentData] Timeout fetching from ${url}`);
            } else {
              console.log(`[loadStudentData] Error fetching from ${url}: ${fetchError.message}`);
            }
            continue;
          }
        }
      }
      
      // Process JSON file content if we got it
      if (!fileContent) {
        const errorMsg = `[loadStudentData] ✗ Failed to load seat-data.json from any source`;
        console.error(errorMsg);
        // Don't throw - return empty map if both Supabase and JSON fail
        studentData = new Map();
        loadMethod = 'Failed - no data source';
      } else {
        // Read and parse the JSON file
        let seatData;
        try {
          seatData = JSON.parse(fileContent);
        } catch (parseError) {
          console.error(`[loadStudentData] JSON parse error: ${parseError.message}`);
          studentData = new Map();
          loadMethod = 'JSON parse error';
        }
        
        if (seatData && Array.isArray(seatData)) {
          console.log(`[loadStudentData] ✓ Parsed JSON successfully: ${seatData.length} entries (loaded via ${loadMethod})`);
          
          // Create a lookup map: RA -> {name} (only name from JSON, department comes from API)
          const lookup = new Map();
          let entriesWithNames = 0;
          
          seatData.forEach((entry, index) => {
            if (!entry || typeof entry !== 'object') {
              console.log(`[loadStudentData] Skipping invalid entry at index ${index}`);
              return;
            }
            
            if (entry.registerNumber && entry.name) {
              const ra = normalizeRA(entry.registerNumber);
              if (ra) {
                // Store the first occurrence or update if we have better data
                if (!lookup.has(ra) || (entry.name && !lookup.get(ra).name)) {
                  lookup.set(ra, {
                    name: entry.name || null,
                    // Department removed - comes from API only
                  });
                  if (entry.name) entriesWithNames++;
                }
              }
            }
          });
          
          studentData = lookup;
          loadMethod = `JSON: ${loadMethod}`;
          console.log(`[loadStudentData] ✓ Created lookup map: ${lookup.size} unique RAs`);
          console.log(`[loadStudentData]   - Entries with names: ${entriesWithNames}`);
        } else {
          console.error(`[loadStudentData] JSON is not an array or invalid`);
          studentData = new Map();
        }
      }
    }
    
    // Test lookup with a known RA
    if (studentData && studentData.size > 0) {
      const testRA = 'RA2311003012124';
      const testResult = studentData.get(normalizeRA(testRA));
      if (testResult) {
        console.log(`[loadStudentData] ✓ Test lookup for ${testRA}: Name=${testResult.name || 'N/A'}`);
      } else {
        console.log(`[loadStudentData] ⚠ Test lookup for ${testRA}: NOT FOUND`);
      }
    }
    
    // Only cache if we have valid data
    if (studentData && studentData.size > 0) {
      studentDataCache = studentData;
      console.log(`[loadStudentData] ✓ Cached ${studentData.size} student records (loaded via ${loadMethod})`);
    } else {
      console.error(`[loadStudentData] ⚠ No valid student data found - not caching empty map`);
      studentDataCache = null; // Don't cache empty data
      studentData = new Map(); // Return empty map instead of null
    }
    
    return studentData || new Map();
    } catch (error) {
      console.error('[loadStudentData] Error loading student data:', error);
      // Don't cache empty map on error - set to null so we retry next time
      studentDataCache = null;
      studentDataLoadPromise = null; // Reset promise so we can retry
      // Return empty map for this request, but don't cache it
      return new Map();
    }
  })();
  
  return studentDataLoadPromise;
}

/**
 * Clear student data cache (useful for debugging or forced reload)
 */
export function clearStudentDataCache() {
  console.log('[clearStudentDataCache] Clearing student data cache');
  studentDataCache = null;
  studentDataLoadPromise = null;
}

/**
 * Lookup student name by RA number (department comes from API)
 * @param {string} ra - Register number
 * @returns {Promise<Object>} - {name} or {name: null}
 */
async function lookupStudentInfo(ra) {
  const normalizedRA = normalizeRA(ra);
  if (!normalizedRA) {
    console.log(`[lookupStudentInfo] Invalid RA: ${ra}`);
    return { name: null };
  }
  
  try {
    const studentData = await loadStudentData();
    const result = studentData.get(normalizedRA) || { name: null };
    console.log(`[lookupStudentInfo] RA: ${normalizedRA}, Found: ${result.name ? 'YES' : 'NO'}, Name: ${result.name || 'N/A'}`);
    return result;
  } catch (error) {
    console.error('Error looking up student info:', error);
    return { name: null };
  }
}

/**
 * Enhance matches with student information
 * @param {Array} matches - Array of match objects
 * @param {string} ra - Register number
 * @returns {Promise<Array>} - Enhanced matches with name and department
 */
async function enhanceMatchesWithStudentInfo(matches, ra) {
  if (!matches || matches.length === 0) {
    return matches;
  }
  
  // Lookup student info once
  const studentInfo = await lookupStudentInfo(ra);
  
  // Add name from JSON, department comes from API (match.department)
  return matches.map(match => ({
    ...match,
    name: studentInfo.name || match.name || null, // Name from JSON
    // Department comes from API (match.department from exam seating data)
    // Keep all other API fields: hall, bench, session, subjectCode, etc.
  }));
}

/**
 * Enhance matches with pre-loaded student information (from JSON)
 * Only name comes from JSON, everything else (department, venue details) comes from API
 * @param {Array} matches - Array of match objects
 * @param {Object} studentInfo - Pre-loaded student info {name} (department removed)
 * @returns {Array} - Enhanced matches with name from JSON, all else from API
 */
function enhanceMatchesWithPreloadedStudentInfo(matches, studentInfo) {
  if (!matches || matches.length === 0) {
    return matches;
  }
  
  console.log(`[enhanceMatchesWithPreloadedStudentInfo] Called with ${matches.length} matches`);
  console.log(`[enhanceMatchesWithPreloadedStudentInfo] studentInfo:`, JSON.stringify(studentInfo));
  
  if (!studentInfo) {
    studentInfo = { name: null };
    console.log(`[enhanceMatchesWithPreloadedStudentInfo] No student info provided, using null values`);
  } else {
    console.log(`[enhanceMatchesWithPreloadedStudentInfo] Enhancing ${matches.length} matches with Name="${studentInfo.name || 'N/A'}"`);
    console.log(`[enhanceMatchesWithPreloadedStudentInfo] studentInfo.name type: ${typeof studentInfo.name}, value: ${studentInfo.name}`);
  }
  
  // Add name from Supabase/JSON, use API for everything else (department, venue details)
  // Ensure both name and venue details are preserved
  const enhanced = matches.map(match => {
    // Use studentInfo.name from Supabase/JSON if it exists
    // Only fall back to match.name if studentInfo.name is null/undefined
    const finalName = (studentInfo && studentInfo.name !== null && studentInfo.name !== undefined && studentInfo.name !== '-')
      ? studentInfo.name
      : (match.name || null);
    
    console.log(`[enhanceMatchesWithPreloadedStudentInfo] Match enhancement:`, {
      originalName: match.name,
      studentInfoName: studentInfo?.name,
      finalName: finalName,
      hasStudentInfo: !!studentInfo,
    });
    
    // Use API department (from match.department) - this comes from exam seating data
    // This is the department from the exam (e.g., "CSE" from "CSE/21MAB201T")
    const finalDept = match.department || null;
    
    // Preserve all venue details from API
    return {
      ...match, // This includes all venue details: hall, bench, session, subjectCode, department, etc.
      name: finalName, // Name from JSON only
      department: finalDept, // Department from API (exam department)
      // Keep all other API fields: hall, bench, session, subjectCode, context, url, etc.
    };
  });
  
  // Log first match for debugging
  if (enhanced.length > 0) {
    const firstMatch = enhanced[0];
    console.log(`[enhanceMatchesWithPreloadedStudentInfo] First match enhanced: Name=${firstMatch.name || 'N/A'}, Dept=${firstMatch.department || 'N/A'}, Hall=${firstMatch.hall || 'N/A'}, Bench=${firstMatch.bench || 'N/A'}, Session=${firstMatch.session || 'N/A'}`);
  }
  
  return enhanced;
}

/**
 * Main function to get seating information
 * @param {string} ra - Register number
 * @param {string} date - Date string (YYYY-MM-DD, DD-MM-YYYY, or DD/MM/YYYY)
 * @returns {Promise<Object>} - Seating information response
 */
export async function getSeatingInfo(ra, date) {
  // Normalize inputs
  const normalizedRA = normalizeRA(ra);
  if (!normalizedRA) {
    return {
      status: 'error',
      error: 'RA number is required',
      lastUpdated: new Date().toISOString(),
      results: {},
    };
  }
  
  // STEP 1: Load student name from Supabase/JSON FIRST (before API fetch)
  // Only name comes from Supabase/JSON, department and venue details come from API
  console.log(`[getSeatingInfo] Pre-loading student name for RA: ${normalizedRA}`);
  console.log(`[getSeatingInfo] Environment check - SUPABASE_URL: ${process.env.SUPABASE_URL ? 'SET' : 'NOT SET'}, SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'SET' : 'NOT SET'}`);
  let studentInfo = { name: null };
  
  // Try multiple times with different strategies
  let studentData = null;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts && !studentData) {
    attempts++;
    try {
      console.log(`[getSeatingInfo] Attempt ${attempts}/${maxAttempts} to load student data...`);
      studentData = await loadStudentData();
      
      if (studentData && studentData.size > 0) {
        console.log(`[getSeatingInfo] ✓ Student data map loaded: ${studentData.size} records`);
        break;
      } else {
        console.log(`[getSeatingInfo] ⚠ Student data map is empty, clearing cache and retrying...`);
        // Clear cache and retry
        studentDataCache = null;
        studentDataLoadPromise = null;
        studentData = null;
        if (attempts < maxAttempts) {
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`[getSeatingInfo] Attempt ${attempts} failed:`, error.message);
      studentDataCache = null;
      studentDataLoadPromise = null;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Try direct lookup
  if (studentData && studentData.size > 0) {
    console.log(`[getSeatingInfo] Student data map has ${studentData.size} entries`);
    console.log(`[getSeatingInfo] Looking up RA: "${normalizedRA}"`);
    
    // Check if the exact RA exists in the map
    const hasExactKey = studentData.has(normalizedRA);
    console.log(`[getSeatingInfo] Has exact key "${normalizedRA}": ${hasExactKey}`);
    
    const lookupResult = studentData.get(normalizedRA);
    if (lookupResult) {
      studentInfo = lookupResult;
      console.log(`[getSeatingInfo] ✓ Student found in map: Name="${studentInfo.name || 'N/A'}"`);
    } else {
      console.log(`[getSeatingInfo] ⚠ Student NOT found in map for RA: ${normalizedRA}`);
      // Try case-insensitive search
      let found = false;
      for (const [key, value] of studentData.entries()) {
        if (key.toUpperCase() === normalizedRA.toUpperCase()) {
          studentInfo = value;
          found = true;
          console.log(`[getSeatingInfo] ✓ Student found (case-insensitive): Key="${key}", Name="${studentInfo.name || 'N/A'}"`);
          break;
        }
      }
      if (!found && !studentInfo.name) {
        console.log(`[getSeatingInfo] Sample RAs in map (first 10):`, Array.from(studentData.keys()).slice(0, 10));
        // Check if a close match exists (for debugging)
        const closeMatches = Array.from(studentData.keys()).filter(k => k.includes(normalizedRA.substring(0, 10)));
        if (closeMatches.length > 0) {
          console.log(`[getSeatingInfo] Close matches found:`, closeMatches.slice(0, 3));
        }
        console.log(`[getSeatingInfo] No exact match found for RA: ${normalizedRA}`);
      }
    }
  } else {
    console.error(`[getSeatingInfo] ✗ Failed to load student data after ${maxAttempts} attempts`);
    console.error(`[getSeatingInfo] studentData is:`, studentData ? `Map with ${studentData.size} entries` : 'null/undefined');
  }
  
  // Fallback: Direct Supabase lookup if map lookup failed
  if (!studentInfo || !studentInfo.name) {
    try {
      console.log(`[getSeatingInfo] Attempting direct Supabase lookup for RA: ${normalizedRA}`);
      const { supabase: supabaseClient, isSupabaseConfigured } = await import('./supabase-client.js');
      if (isSupabaseConfigured() && supabaseClient) {
        const { data, error } = await supabaseClient
          .from('students')
          .select('name')
          .eq('register_number', normalizedRA)
          .single();
        
        if (!error && data && data.name) {
          studentInfo = { name: data.name };
          console.log(`[getSeatingInfo] ✓ Direct Supabase lookup successful: Name="${studentInfo.name}"`);
        } else if (error) {
          console.log(`[getSeatingInfo] Direct Supabase lookup error: ${error.message}`);
        }
      }
    } catch (fallbackError) {
      console.error(`[getSeatingInfo] Direct Supabase fallback failed:`, fallbackError.message);
    }
  }
  
  // STEP 1.5: Try Supabase seats table before touching caches/external endpoints
  const supabaseSeatResult = await fetchSeatsFromSupabase(normalizedRA, date);
  if (supabaseSeatResult && supabaseSeatResult.results) {
    const enhancedResults = {};
    for (const [campusName, matches] of Object.entries(supabaseSeatResult.results)) {
      enhancedResults[campusName] = enhanceMatchesWithPreloadedStudentInfo(matches, studentInfo);
    }
    const response = {
      ...supabaseSeatResult,
      results: enhancedResults,
      cached: true,
    };
    setCachedResult(normalizedRA, date, response);
    return response;
  }
  
  // Check per-RA cache first (legacy, for backward compatibility)
  const cached = getCachedResult(normalizedRA, date);
  if (cached) {
    // Enhance cached results with pre-loaded student information
    const enhancedCachedResults = {};
    for (const [campusName, matches] of Object.entries(cached.results || {})) {
      enhancedCachedResults[campusName] = enhanceMatchesWithPreloadedStudentInfo(matches, studentInfo);
    }
    
    return {
      ...cached,
      results: enhancedCachedResults,
      cached: true,
    };
  }
  
  // STEP 2: Try global all-campus cache (NEW - ULTRA FAST)
  let cacheExists = false;
  let cacheSize = 0;
  try {
    let allCampusData = await getAllCampusDataCache(date);
    cacheExists = allCampusData && allCampusData.size > 0;
    cacheSize = allCampusData ? allCampusData.size : 0;
    let matches = allCampusData ? allCampusData.get(normalizedRA) : null;
    
    if (matches && matches.length > 0) {
      console.log(`[getSeatingInfo] ✅ Found RA ${normalizedRA} in global cache (${matches.length} matches)`);
      
      // Group matches by campus
      const results = {};
      for (const match of matches) {
        const campusName = match.campus || 'Unknown';
        if (!results[campusName]) {
          results[campusName] = [];
        }
        results[campusName].push(match);
      }
      
      // Enhance with student info
      const enhancedResults = {};
      for (const [campusName, campusMatches] of Object.entries(results)) {
        enhancedResults[campusName] = enhanceMatchesWithPreloadedStudentInfo(campusMatches, studentInfo);
      }
      
      const response = {
        status: 'ok',
        lastUpdated: allCampusDataCache.timestamp,
        results: enhancedResults,
        cached: true,
        source: 'global_cache',
      };
      
      // Also cache in per-RA cache for backward compatibility
      setCachedResult(normalizedRA, date, response);
      
      return response;
    } else {
      // FAST FAIL: If RA not in cache and cache is fresh, fail immediately
      // Don't waste time fetching all campuses if we know it's not there
      cacheStats.misses++;
      cacheStats.lastMiss = Date.now();
      console.log(`[getSeatingInfo] ❌ CACHE MISS - RA ${normalizedRA} not found in global cache`);
      
      // Check if cache is fresh (less than 30 minutes old)
      const cacheAge = allCampusDataCache ? (Date.now() - allCampusDataCache.timestamp) : Infinity;
      const CACHE_FRESH_THRESHOLD = 30 * 60 * 1000; // 30 minutes
      
      if (cacheAge < CACHE_FRESH_THRESHOLD && cacheExists && cacheSize > 0) {
        console.log(`[getSeatingInfo] ⚡ FAST FAIL - Cache is fresh (${Math.round(cacheAge / 1000)}s old, ${cacheSize} RAs), RA not found. Returning empty result immediately.`);
        
        // Return empty result immediately - no need to fetch
        const response = {
          status: 'ok',
          lastUpdated: new Date(allCampusDataCache.timestamp).toISOString(),
          results: {},
          cached: true,
          source: 'global_cache_fast_fail',
        };
        
        // Cache the empty result to avoid future fetches
        setCachedResult(normalizedRA, date, response);
        
        return response;
      } else {
        console.log(`[getSeatingInfo] Cache is stale or empty, falling back to direct fetch`);
      }
    }
  } catch (error) {
    cacheStats.errors++;
    console.warn(`[getSeatingInfo] ⚠️ CACHE ERROR - Error accessing global cache:`, error.message);
    // Fall through to direct fetch
  }
  
  // STEP 3: Fallback to direct fetch (if not in cache)
  // Generate date variants
  const dateVariants = date ? generateDateVariants(date) : [];
  
  // Fetch from all campuses with early exit optimization
  const campusNames = Object.keys(CAMPUS_ENDPOINTS);
  const results = {};
  let hasErrors = false;
  let foundRA = false;
  
  // Determine if we should use fast fail mode (cache exists but is stale)
  const useFastFail = cacheExists; // Use fast fail if cache exists (even if stale)
  
  // OPTIMIZATION: Fetch campuses one by one and exit early if RA found
  // This is faster than Promise.all when RA is found early
  for (const campusName of campusNames) {
    try {
      const campusMatches = await fetchCampusSeating(campusName, normalizedRA, dateVariants, useFastFail);
      results[campusName] = campusMatches;
      
      // OPTIMIZATION: Early exit if RA found in any campus
      // Check if we have matches for the target RA
      if (campusMatches && campusMatches.length > 0) {
        const hasTargetRA = campusMatches.some(match => 
          match.ra && match.ra.toUpperCase() === normalizedRA.toUpperCase()
        );
        
        if (hasTargetRA) {
          foundRA = true;
          console.log(`[getSeatingInfo] ✅ Target RA ${normalizedRA} found in ${campusName}, stopping other campus fetches`);
          // Cancel remaining fetches by breaking the loop
          // Note: Already started fetches will complete, but we won't wait for them
          break;
        }
      }
    } catch (error) {
      hasErrors = true;
      results[campusName] = [];
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('404')) {
        console.log(`[${campusName}] Not available (404) - skipping`);
      } else {
        console.warn(`[${campusName}] Failed to fetch:`, errorMsg);
      }
    }
  }
  
  // STEP 3: Enhance all matches with pre-loaded student information
  // Use the student info we loaded at the start (from JSON)
  console.log(`[getSeatingInfo] About to enhance results with studentInfo:`, JSON.stringify(studentInfo));
  const enhancedResults = {};
  for (const [campusName, matches] of Object.entries(results)) {
    console.log(`[getSeatingInfo] Enhancing ${matches.length} matches for ${campusName}`);
    const enhanced = enhanceMatchesWithPreloadedStudentInfo(matches, studentInfo);
    enhancedResults[campusName] = enhanced;
    if (enhanced.length > 0) {
      console.log(`[getSeatingInfo] First enhanced match for ${campusName}:`, JSON.stringify(enhanced[0]));
    }
  }
  
  // Build response
  const response = {
    status: hasErrors ? 'partial' : 'ok',
    lastUpdated: new Date().toISOString(),
    results: enhancedResults,
  };
  
  // Cache the result
  setCachedResult(normalizedRA, date, response);
  
  return response;
}

/**
 * Streaming version of getSeatingInfo - yields results as they come in
 * @param {string} ra - RA number
 * @param {string} date - Date string
 * @param {Function} onCampusResult - Callback when a campus completes (campusName, matches, complete)
 * @param {Function} onComplete - Callback when all campuses complete (finalResult)
 */
export async function getSeatingInfoStreaming(ra, date, onCampusResult, onComplete) {
  // Normalize inputs
  const normalizedRA = normalizeRA(ra);
  if (!normalizedRA) {
    onComplete({
      status: 'error',
      error: 'RA number is required',
      lastUpdated: new Date().toISOString(),
      results: {},
    });
    return;
  }
  
  // STEP 1: Load student name from Supabase/JSON (same as getSeatingInfo)
  console.log(`[getSeatingInfoStreaming] Pre-loading student name for RA: ${normalizedRA}`);
  let studentInfo = { name: null };
  
  let studentData = null;
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts && !studentData) {
    attempts++;
    try {
      studentData = await loadStudentData();
      if (studentData && studentData.size > 0) {
        console.log(`[getSeatingInfoStreaming] ✓ Student data map loaded: ${studentData.size} records`);
        break;
      } else {
        studentDataCache = null;
        studentDataLoadPromise = null;
        studentData = null;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    } catch (error) {
      console.error(`[getSeatingInfoStreaming] Attempt ${attempts} failed:`, error.message);
      studentDataCache = null;
      studentDataLoadPromise = null;
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }
  
  // Try direct lookup
  if (studentData && studentData.size > 0) {
    const lookupResult = studentData.get(normalizedRA);
    if (lookupResult) {
      studentInfo = lookupResult;
    } else {
      // Try case-insensitive search
      for (const [key, value] of studentData.entries()) {
        if (key.toUpperCase() === normalizedRA.toUpperCase()) {
          studentInfo = value;
          break;
        }
      }
    }
  }
  
  // Fallback: Direct Supabase lookup if map lookup failed
  if (!studentInfo || !studentInfo.name) {
    try {
      const { supabase: supabaseClient, isSupabaseConfigured } = await import('./supabase-client.js');
      if (isSupabaseConfigured() && supabaseClient) {
        const { data, error } = await supabaseClient
          .from('students')
          .select('name')
          .eq('register_number', normalizedRA)
          .single();
        
        if (!error && data && data.name) {
          studentInfo = { name: data.name };
        }
      }
    } catch (fallbackError) {
      console.error(`[getSeatingInfoStreaming] Direct Supabase fallback failed:`, fallbackError.message);
    }
  }
  
  // Check cache first
  const cached = getCachedResult(normalizedRA, date);
  if (cached) {
    // Enhance cached results
    const enhancedCachedResults = {};
    for (const [campusName, matches] of Object.entries(cached.results || {})) {
      enhancedCachedResults[campusName] = enhanceMatchesWithPreloadedStudentInfo(matches, studentInfo);
    }
    
    onComplete({
      ...cached,
      results: enhancedCachedResults,
      cached: true,
    });
    return;
  }
  
  // Generate date variants
  const dateVariants = date ? generateDateVariants(date) : [];
  
  // STEP 2: Fetch campuses and stream results
  const campusNames = Object.keys(CAMPUS_ENDPOINTS);
  const results = {};
  let hasErrors = false;
  let foundRA = false;
  
  for (const campusName of campusNames) {
    try {
      const campusMatches = await fetchCampusSeating(campusName, normalizedRA, dateVariants);
      results[campusName] = campusMatches;
      
      // Enhance matches before streaming
      const enhanced = enhanceMatchesWithPreloadedStudentInfo(campusMatches, studentInfo);
      
      // Stream this campus result immediately
      onCampusResult({
        campusName,
        matches: enhanced,
        complete: false,
      });
      
      // Early exit if RA found
      if (campusMatches && campusMatches.length > 0) {
        const hasTargetRA = campusMatches.some(match => 
          match.ra && match.ra.toUpperCase() === normalizedRA.toUpperCase()
        );
        
        if (hasTargetRA) {
          foundRA = true;
          console.log(`[getSeatingInfoStreaming] ✅ Target RA ${normalizedRA} found in ${campusName}, stopping other campus fetches`);
          break;
        }
      }
    } catch (error) {
      hasErrors = true;
      results[campusName] = [];
      onCampusResult({
        campusName,
        matches: [],
        complete: false,
        error: error.message,
      });
    }
  }
  
  // STEP 3: Enhance all matches (already done above, but ensure consistency)
  const enhancedResults = {};
  for (const [campusName, matches] of Object.entries(results)) {
    enhancedResults[campusName] = enhanceMatchesWithPreloadedStudentInfo(matches, studentInfo);
  }
  
  // Build final result
  const finalResult = {
    status: hasErrors ? 'partial' : 'ok',
    lastUpdated: new Date().toISOString(),
    results: enhancedResults,
    foundRA,
  };
  
  // Cache the result
  setCachedResult(normalizedRA, date, finalResult);
  
  // Send final complete result
  onComplete(finalResult);
}

const MAX_ADVANCED_RESULTS = 350;

const normalizeClassIdentifier = (value) => {
  if (!value) return '';
  return value.toString().trim().toUpperCase();
};

const compactIdentifier = (value) => value.replace(/\s+/g, '');

const entryMatchesClassTarget = (entry, normalizedTarget, compactTarget) => {
  if (!normalizedTarget) return false;
  const candidates = [
    entry?.room,
    entry?.hall,
    entry?.context,
    entry?.originalHall,
    entry?.originalRawRoom,
  ];
  return candidates.some(candidate => {
    if (!candidate) return false;
    const upper = candidate.toString().toUpperCase();
    return upper.includes(normalizedTarget) || upper.replace(/\s+/g, '').includes(compactTarget);
  });
};

const pickBestEntry = (entries = []) => {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const sorted = [...entries].sort((a, b) => {
    const benchScore = (val) => (val && val !== '-' ? 0 : 1);
    const roomScore = (val) => (val && val !== '-' ? 0 : 1);
    const aBenchScore = benchScore(a?.bench);
    const bBenchScore = benchScore(b?.bench);
    if (aBenchScore !== bBenchScore) return aBenchScore - bBenchScore;
    const aRoomScore = roomScore(a?.room || a?.hall);
    const bRoomScore = roomScore(b?.room || b?.hall);
    if (aRoomScore !== bRoomScore) return aRoomScore - bRoomScore;
    return 0;
  });
  return sorted[0];
};

const buildAdvancedRow = (ra, entry, studentLookup) => {
  const studentInfo = studentLookup?.get(ra) || {};
  return {
    ra,
    name: studentInfo.name || entry?.name || null,
    bench: entry?.bench || entry?.seat || entry?.benchNumber || null,
    room: entry?.room || entry?.hall || entry?.originalHall || null,
    floor: entry?.floor || entry?.level || null,
    building: entry?.building || entry?.block || null,
    campus: entry?.campus || null,
    session: entry?.session || entry?.sessionShort || null,
    subjectCode: entry?.subjectCode || entry?.subcode || null,
    department: entry?.department || null,
    url: entry?.url || null,
  };
};

export async function getClassSeatingOverview(date, classIdentifier) {
  const normalizedDate = (date || '').trim();
  if (!normalizedDate) {
    return {
      status: 'error',
      error: 'Exam date is required for class lookup',
    };
  }

  const normalizedClass = normalizeClassIdentifier(classIdentifier);
  if (!normalizedClass) {
    return {
      status: 'error',
      error: 'Class / room number is required',
    };
  }

  try {
    const allCampusData = await getAllCampusDataCache(normalizedDate);
    if (!allCampusData || allCampusData.size === 0) {
      return {
        status: 'error',
        error: 'Seat data is not cached yet for this date. Try again shortly.',
      };
    }

    const studentData = await loadStudentData();
    const results = [];
    let totalMatches = 0;
    const compactTarget = compactIdentifier(normalizedClass);

    for (const [ra, entries] of allCampusData.entries()) {
      if (!Array.isArray(entries)) continue;

      const matchingEntry = entries.find(entry =>
        entryMatchesClassTarget(entry, normalizedClass, compactTarget)
      );

      if (matchingEntry) {
        totalMatches++;
        if (results.length < MAX_ADVANCED_RESULTS) {
          results.push(buildAdvancedRow(ra, matchingEntry, studentData));
        }
      }
    }

    results.sort((a, b) => {
      const roomCompare = (a.room || '').localeCompare(b.room || '');
      if (roomCompare !== 0) return roomCompare;
      const benchCompare = (a.bench || '').localeCompare(b.bench || '');
      if (benchCompare !== 0) return benchCompare;
      return (a.ra || '').localeCompare(b.ra || '');
    });

    return {
      status: 'ok',
      results,
      meta: {
        type: 'class',
        room: normalizedClass,
        date: normalizedDate,
        total: results.length,
        totalMatches,
        limit: MAX_ADVANCED_RESULTS,
        limitReached: totalMatches > results.length,
        lastUpdated: allCampusDataCache?.timestamp
          ? new Date(allCampusDataCache.timestamp).toISOString()
          : new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[getClassSeatingOverview] Error:', error);
    return {
      status: 'error',
      error: 'Failed to load class seating data',
    };
  }
}

export async function getSeatingRangeOverview(date, startRA, endRA) {
  const normalizedDate = (date || '').trim();
  if (!normalizedDate) {
    return {
      status: 'error',
      error: 'Exam date is required for RA range lookup',
    };
  }

  const normalizedStart = normalizeRA(startRA || '');
  const normalizedEnd = normalizeRA(endRA || '');

  if (!normalizedStart || !normalizedEnd) {
    return {
      status: 'error',
      error: 'Both start and end RA numbers are required',
    };
  }

  let rangeStart = normalizedStart;
  let rangeEnd = normalizedEnd;
  if (rangeStart > rangeEnd) {
    [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  }

  try {
    const allCampusData = await getAllCampusDataCache(normalizedDate);
    if (!allCampusData || allCampusData.size === 0) {
      return {
        status: 'error',
        error: 'Seat data is not cached yet for this date. Try again shortly.',
      };
    }

    const studentData = await loadStudentData();
    const results = [];
    let totalMatches = 0;

    const sortedRAs = Array.from(allCampusData.keys()).sort();
    for (const ra of sortedRAs) {
      if (ra < rangeStart) continue;
      if (ra > rangeEnd) break;

      const entry = pickBestEntry(allCampusData.get(ra));
      if (entry) {
        totalMatches++;
        if (results.length < MAX_ADVANCED_RESULTS) {
          results.push(buildAdvancedRow(ra, entry, studentData));
        }
      }
    }

    return {
      status: 'ok',
      results,
      meta: {
        type: 'range',
        start: rangeStart,
        end: rangeEnd,
        date: normalizedDate,
        total: results.length,
        totalMatches,
        limit: MAX_ADVANCED_RESULTS,
        limitReached: totalMatches > results.length,
        lastUpdated: allCampusDataCache?.timestamp
          ? new Date(allCampusDataCache.timestamp).toISOString()
          : new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('[getSeatingRangeOverview] Error:', error);
    return {
      status: 'error',
      error: 'Failed to load RA range data',
    };
  }
}

