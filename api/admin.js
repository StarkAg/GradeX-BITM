/**
 * Unified Admin API endpoint
 * Handles multiple admin operations via query parameter routing
 * 
 * GET /api/admin?action=enquiries - Fetch enquiries
 * GET /api/admin?action=social-clicks - Fetch social click stats
 * POST /api/admin?action=clear-cache - Clear all caches
 */

import { supabaseAdmin, isSupabaseConfigured, supabase } from '../lib/api-utils/supabase-client.js';
import { clearAllCampusDataCache, clearStudentDataCache } from '../lib/api-utils/seating-utils.js';
import { getAllFeatureFlags, getAdvancedRadarEnabled, setAdvancedRadarEnabled } from '../lib/api-utils/feature-flags-store.js';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  const action = req.query.action || req.body?.action;
  
  // Route to appropriate handler
  if (action === 'enquiries') {
    return handleEnquiries(req, res);
  } else if (action === 'social-clicks') {
    return handleSocialClicks(req, res);
  } else if (action === 'unique-users') {
    return handleUniqueUsers(req, res);
  } else if (action === 'clear-cache') {
    return handleClearCache(req, res);
  } else if (action === 'refresh-csv') {
    return handleRefreshCSV(req, res);
  } else if (action === 'feedback') {
    return handleFeedback(req, res);
  } else if (action === 'track-groupgrid') {
    return handleTrackGroupGrid(req, res);
  } else if (action === 'groupgrid-visits') {
    return handleGroupGridVisits(req, res);
  } else if (action === 'cache-status') {
    return handleCacheStatus(req, res);
  } else if (action === 'feature-flags') {
    return handleFeatureFlags(req, res);
  } else if (action === 'get-name-by-last-digits') {
    return handleGetNameByLastDigits(req, res);
  } else {
    res.status(400).json({
      status: 'error',
      error: 'Invalid action. Use ?action=enquiries, ?action=social-clicks, ?action=unique-users, ?action=clear-cache, ?action=refresh-csv, ?action=feedback, ?action=track-groupgrid, ?action=groupgrid-visits, ?action=cache-status, ?action=feature-flags, or ?action=get-name-by-last-digits',
    });
  }
}

/**
 * Handle enquiries fetch
 */
async function handleEnquiries(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
    return;
  }
  
  try {
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      res.status(500).json({
        status: 'error',
        error: 'Supabase not configured',
      });
      return;
    }
    
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 50, 10), 200);
    const hours = parseInt(req.query.hours);
    const searchTermRaw = typeof req.query.search === 'string' ? req.query.search : '';
    const searchTerm = searchTermRaw.trim();
    const offset = (page - 1) * pageSize;
    
    let filterTime = null;
    
    if (hours && hours > 0) {
      // Use UTC to match database timestamps (searched_at is stored in UTC)
      // Subtract hours in milliseconds first, then round down to the nearest hour
      const hoursAgo = new Date();
      hoursAgo.setTime(hoursAgo.getTime() - (hours * 60 * 60 * 1000));
      hoursAgo.setUTCMinutes(0);
      hoursAgo.setUTCSeconds(0);
      hoursAgo.setUTCMilliseconds(0);
      filterTime = hoursAgo.toISOString();
      console.log(`[admin] Filtering enquiries from last ${hours} hours, filter time: ${filterTime}`);
    }
    
    const applyFilters = (query) => {
      let nextQuery = query;
      if (filterTime) {
        nextQuery = nextQuery.gte('searched_at', filterTime);
      }
      if (searchTerm) {
        nextQuery = nextQuery.ilike('student_name', `%${searchTerm}%`);
      }
      return nextQuery;
    };
    
    // Build query with optional time or search filter
    let countQuery = applyFilters(clientToUse.from('enquiries').select('*', { count: 'exact', head: true }));
    let dataQuery = applyFilters(clientToUse.from('enquiries').select('*'));
    
    if (searchTerm) {
      console.log(`[admin] Applying name search filter: "${searchTerm}"`);
    }
    
    // Fetch total count and statistics once
    const { count, error: countError } = await countQuery;
    
    if (countError) {
      console.error('[admin] Count error:', countError);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch total search count',
        message: countError.message,
      });
      return;
    }
    
    // Fetch total successful and failed counts across all data
    const { count: successfulCount, error: successfulError } = await applyFilters(
      clientToUse
      .from('enquiries')
      .select('*', { count: 'exact', head: true })
        .eq('results_found', true)
    );
    
    if (successfulError) {
      console.error('[admin] Successful count error:', successfulError);
    }
    
    const totalSuccessful = successfulCount || 0;
    const totalFailed = (count || 0) - totalSuccessful;
    const totalFoundRate = count && count > 0 
      ? ((totalSuccessful / count) * 100).toFixed(1)
      : '0.0';
    
    // Fetch paginated enquiries (or all if hours filter is used)
    let finalQuery = dataQuery.order('searched_at', { ascending: false });
    
    let data;
    let error;
    
    if (!hours || hours === 0) {
      finalQuery = finalQuery.range(offset, offset + pageSize - 1);
      const result = await finalQuery;
      data = result.data;
      error = result.error;
    } else {
      // For chart data, fetch ALL records using pagination to bypass Supabase limits
      // Supabase has a default limit, so we'll fetch in batches
      const batchSize = 1000; // Supabase's typical max per request
      let allData = [];
      let hasMore = true;
      let currentOffset = 0;
      
      while (hasMore) {
        const batchQuery = dataQuery
          .order('searched_at', { ascending: false })
          .range(currentOffset, currentOffset + batchSize - 1);
        
        const batchResult = await batchQuery;
        
        if (batchResult.error) {
          error = batchResult.error;
          break;
        }
        
        if (batchResult.data && batchResult.data.length > 0) {
          allData = allData.concat(batchResult.data);
          // If we got fewer records than batchSize, we've reached the end
          hasMore = batchResult.data.length === batchSize;
          currentOffset += batchSize;
        } else {
          hasMore = false;
        }
        
        // Safety limit: don't fetch more than 50k records
        if (allData.length >= 50000) {
          console.warn('[admin] Reached safety limit of 50k records, stopping pagination');
          hasMore = false;
        }
      }
      
      data = allData;
      console.log(`[admin] Fetched ${data.length} total records in ${Math.ceil(data.length / batchSize)} batches`);
    }
      
    if (error) {
      console.error('[admin] Error:', error);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch enquiries',
        message: error.message,
      });
      return;
    }
    
    // Debug: log timestamp range of returned data
    if (data && data.length > 0 && hours && hours > 0) {
      const timestamps = data.map(e => e.searched_at).filter(Boolean).sort();
      if (timestamps.length > 0) {
        console.log(`[admin] Total count in DB: ${count}, Returned ${data.length} enquiries, timestamp range: ${timestamps[0]} to ${timestamps[timestamps.length - 1]}`);
        if (count && data.length < count) {
          console.warn(`[admin] WARNING: Only returned ${data.length} of ${count} total records! Data may be truncated.`);
        }
        // Group by hour to see distribution
        const hourGroups = new Map();
        timestamps.forEach(ts => {
          const date = new Date(ts);
          date.setUTCMinutes(0);
          date.setUTCSeconds(0);
          date.setUTCMilliseconds(0);
          const hourKey = date.toISOString();
          hourGroups.set(hourKey, (hourGroups.get(hourKey) || 0) + 1);
        });
        console.log(`[admin] Data distribution: ${Array.from(hourGroups.entries()).map(([k, v]) => `${k}: ${v}`).join(', ')}`);
      }
    }
      
    // Return data
    res.status(200).json({
      status: 'success',
      count: data.length,
      totalCount: count || 0,
      totalSuccessful,
      totalFailed,
      totalFoundRate,
      page,
      pageSize,
      data: data || [],
    });
  } catch (error) {
    console.error('Error in admin enquiries:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Handle social clicks fetch
 */
async function handleSocialClicks(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
    return;
  }
  
  try {
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      return res.status(500).json({
        status: 'error',
        error: 'Supabase client not available',
      });
    }
    
    // Get total counts for each platform
    const { data: allClicks, error } = await clientToUse
      .from('social_clicks')
      .select('platform, clicked_at')
      .order('clicked_at', { ascending: false });
    
    if (error) {
      console.error('[admin] Supabase query error:', error);
      return res.status(500).json({
        status: 'error',
        error: error.message || 'Failed to fetch click data',
      });
    }
    
    // Calculate statistics
    const githubClicks = allClicks?.filter(c => c.platform === 'github') || [];
    const linkedinClicks = allClicks?.filter(c => c.platform === 'linkedin') || [];
    
    // Get counts for last 24 hours
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const githubLast24h = githubClicks.filter(c => new Date(c.clicked_at) >= yesterday).length;
    const linkedinLast24h = linkedinClicks.filter(c => new Date(c.clicked_at) >= yesterday).length;
    
    // Get counts for last 7 days
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const githubLast7d = githubClicks.filter(c => new Date(c.clicked_at) >= last7Days).length;
    const linkedinLast7d = linkedinClicks.filter(c => new Date(c.clicked_at) >= last7Days).length;
    
    return res.status(200).json({
      status: 'success',
      data: {
        github: {
          total: githubClicks.length,
          last24h: githubLast24h,
          last7d: githubLast7d,
        },
        linkedin: {
          total: linkedinClicks.length,
          last24h: linkedinLast24h,
          last7d: linkedinLast7d,
        },
        total: allClicks?.length || 0,
      },
    });
  } catch (error) {
    console.error('[admin] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Handle unique users fetch
 */
async function handleUniqueUsers(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
    return;
  }
  
  try {
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      res.status(500).json({
        status: 'error',
        error: 'Supabase not configured',
      });
      return;
    }
    
    const hours = parseInt(req.query.hours);
    
    const { data, error: uniqueDataError } = await fetchUniqueUsersData(clientToUse, { hours });
    
    if (uniqueDataError) {
      console.error('[admin] Unique users error:', uniqueDataError);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch unique users',
        message: uniqueDataError.message,
      });
      return;
    }
    
    const sanitizedData = [];
    const periodUniqueIPs = new Set();
    if (Array.isArray(data)) {
      data.forEach((enquiry) => {
        if (enquiry?.ip_address) {
          periodUniqueIPs.add(enquiry.ip_address);
          sanitizedData.push(enquiry);
        }
      });
    }
    
    const { count: allTimeUniqueCount, error: allTimeError } = await countUniqueIPsAllTime(clientToUse);
    if (allTimeError) {
      console.error('[admin] Unique users (all time) error:', allTimeError);
      res.status(500).json({
        status: 'error',
        error: 'Failed to fetch all-time unique users',
        message: allTimeError.message,
      });
      return;
    }
    
    res.status(200).json({
      status: 'success',
      totalUnique: periodUniqueIPs.size,
      totalUniqueAllTime: allTimeUniqueCount,
      data: sanitizedData,
    });
  } catch (error) {
    console.error('Error in admin unique users:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message,
    });
  }
}

async function fetchUniqueUsersData(client, { hours } = {}) {
  const batchSize = 1000;
  const maxRows = 50000;
  const results = [];
  let offset = 0;
  const filterTime = hours && hours > 0
    ? new Date(Date.now() - hours * 60 * 60 * 1000).toISOString()
    : null;
  
  while (true) {
    let query = client
      .from('enquiries')
      .select('ip_address, searched_at')
      .not('ip_address', 'is', null)
      .order('searched_at', { ascending: false })
      .range(offset, offset + batchSize - 1);
    
    if (filterTime) {
      query = query.gte('searched_at', filterTime);
    }
    
    const { data, error } = await query;
    if (error) {
      return { error };
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    results.push(...data);
    
    if (data.length < batchSize || results.length >= maxRows) {
      if (results.length >= maxRows) {
        console.warn('[admin] fetchUniqueUsersData hit maxRows cap, truncating results');
      }
      break;
    }
    
    offset += batchSize;
  }
  
  return { data: results };
}

async function countUniqueIPsAllTime(client, { batchSize = 1000, maxRows = 200000 } = {}) {
  const ipSet = new Set();
  let offset = 0;
  
  while (true) {
    const { data, error } = await client
      .from('enquiries')
      .select('ip_address')
      .not('ip_address', 'is', null)
      .order('ip_address', { ascending: true })
      .range(offset, offset + batchSize - 1);
    
    if (error) {
      return { error };
    }
    
    if (!data || data.length === 0) {
      break;
    }
    
    data.forEach((row) => {
      if (row?.ip_address) {
        ipSet.add(row.ip_address);
      }
    });
    
    if (data.length < batchSize || ipSet.size >= maxRows) {
      if (ipSet.size >= maxRows) {
        console.warn('[admin] countUniqueIPsAllTime hit maxRows cap, partial count returned');
      }
      break;
    }
    
    offset += batchSize;
  }
  
  return { count: ipSet.size };
}

/**
 * Handle cache clearing
 */
async function handleClearCache(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
  }
  
  try {
    console.log('[admin] Clearing all caches...');
    
    // Clear in-memory caches
    clearAllCampusDataCache();
    clearStudentDataCache();
    
    // Clear Redis cache (all campus_cache keys)
    let redisCleared = false;
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
        const { Redis } = await import('@upstash/redis');
        const redis = new Redis({
          url: redisUrl,
          token: redisToken,
        });
        
        // Get all cache keys
        const keys = await redis.keys('campus_cache:*');
        
        if (keys && keys.length > 0) {
          // Delete all cache keys
          await redis.del(...keys);
          console.log(`[admin] ✅ Cleared ${keys.length} Redis cache keys`);
          redisCleared = true;
        } else {
          console.log('[admin] No Redis cache keys found');
          redisCleared = true; // Still success, just nothing to clear
        }
      }
    } catch (redisError) {
      console.warn('[admin] Error clearing Redis cache:', redisError.message);
      // Continue even if Redis clear fails
    }
    
    // Try Vercel KV as fallback
    try {
      if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
        const { kv } = await import('@vercel/kv');
        // Note: Vercel KV doesn't have a direct way to list all keys
        // We'll just log that we attempted it
        console.log('[admin] Vercel KV cache will expire naturally');
      }
    } catch (kvError) {
      console.warn('[admin] Error with Vercel KV:', kvError.message);
    }
    
    console.log('[admin] ✅ All caches cleared successfully');
    
    return res.status(200).json({
      status: 'success',
      message: 'All caches cleared successfully',
      cleared: {
        inMemory: true,
        redis: redisCleared,
      },
    });
  } catch (error) {
    console.error('[admin] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to clear caches',
    });
  }
}

/**
 * Handle CSV refresh - broadcasts signal to reload CSV
 */
async function handleRefreshCSV(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
  }
  
  try {
    console.log('[admin] CSV refresh requested');
    
    // Return success - the actual refresh will be handled client-side via BroadcastChannel
    return res.status(200).json({
      status: 'success',
      message: 'CSV refresh signal sent',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[admin] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Failed to refresh CSV',
    });
  }
}

/**
 * Handle feedback fetch
 */
async function handleFeedback(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({
      status: 'error',
      error: 'Method not allowed',
    });
    return;
  }
  
  try {
    const clientToUse = supabaseAdmin || supabase;
    
    if (!clientToUse) {
      res.status(500).json({
        status: 'error',
        error: 'Supabase not configured',
      });
      return;
    }
    
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize) || 50, 10), 200);
    const offset = (page - 1) * pageSize;
    
    // Get total count
    const { count: totalCount } = await clientToUse
      .from('feedback')
      .select('*', { count: 'exact', head: true });
    
    // Fetch feedback with pagination
    const { data, error } = await clientToUse
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);
    
    if (error) {
      console.error('[admin] Supabase error:', error);
      return res.status(500).json({
        status: 'error',
        error: error.message || 'Failed to fetch feedback',
      });
    }
    
    return res.status(200).json({
      status: 'success',
      data: data || [],
      page,
      pageSize,
      totalCount: totalCount || 0,
    });
  } catch (error) {
    console.error('[admin] Error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Handle GroupGrid visit tracking
 */
async function handleTrackGroupGrid(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  if (!isSupabaseConfigured() || !supabaseAdmin) {
    return res.status(500).json({
      status: 'error',
      error: 'Supabase not configured',
    });
  }

  try {
    const body = req.body || {};
    const registerNumber = (body.registerNumber || '').toString().trim().toUpperCase();
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.connection?.remoteAddress || null;
    const userAgent = req.headers['user-agent'] || null;

    const { error } = await supabaseAdmin
      .from('groupgrid_visits')
      .insert({
        register_number: registerNumber || null,
        visited_at: body.timestamp || new Date().toISOString(),
        ip_address: ipAddress,
        user_agent: userAgent,
      });

    if (error) {
      // If table doesn't exist, silently fail (non-blocking)
      console.warn('[admin] GroupGrid tracking failed (table may not exist):', error.message);
      return res.status(200).json({ status: 'ok', tracked: false });
    }

    return res.status(200).json({ status: 'ok', tracked: true });
  } catch (error) {
    console.error('[admin] GroupGrid tracking error:', error);
    return res.status(200).json({ status: 'ok', tracked: false }); // Non-blocking
  }
}

/**
 * Handle GroupGrid visits fetch
 */
async function handleGroupGridVisits(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  if (!isSupabaseConfigured() || !supabase) {
    return res.status(500).json({
      status: 'error',
      error: 'Supabase not configured',
    });
  }

  try {
    const hours = parseInt(req.query.hours) || 24;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;

    const now = new Date();
    const startTime = new Date(now.getTime() - hours * 60 * 60 * 1000);

    // Fetch visits with pagination
    const { data, error, count } = await supabase
      .from('groupgrid_visits')
      .select('*', { count: 'exact' })
      .gte('visited_at', startTime.toISOString())
      .order('visited_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1);

    if (error) {
      throw error;
    }

    // Count unique RAs
    const { data: uniqueData } = await supabase
      .from('groupgrid_visits')
      .select('register_number')
      .gte('visited_at', startTime.toISOString())
      .not('register_number', 'is', null);

    const uniqueRAs = new Set((uniqueData || []).map(r => r.register_number)).size;

    return res.status(200).json({
      status: 'success',
      data: data || [],
      page,
      pageSize,
      totalCount: count || 0,
      uniqueRAs,
    });
  } catch (error) {
    console.error('[admin] GroupGrid visits error:', error);
    return res.status(500).json({
      status: 'error',
      error: error.message || 'Internal server error',
    });
  }
}

/**
 * Handle cache status
 */
async function handleCacheStatus(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    const { getCacheStatus } = await import('../lib/api-utils/seating-utils.js');
    const status = await getCacheStatus();
    
    res.status(200).json({
      status: 'success',
      ...status,
    });
  } catch (error) {
    console.error('Cache Status API Error:', error);
    
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message,
    });
  }
}

/**
 * Handle feature flags
 */
async function handleFeatureFlags(req, res) {
  if (req.method === 'GET') {
    try {
      const flags = await getAllFeatureFlags();
      res.status(200).json({
        status: 'success',
        ...flags,
      });
    } catch (err) {
      console.error('[admin] Failed to load flags:', err);
      res.status(500).json({
        status: 'error',
        error: 'Unable to load feature flags',
      });
    }
    return;
  }

  if (req.method === 'POST') {
    try {
      const { advancedRadarEnabled } = req.body || {};

      if (typeof advancedRadarEnabled !== 'boolean') {
        res.status(400).json({
          status: 'error',
          error: 'advancedRadarEnabled must be a boolean',
        });
        return;
      }

      await setAdvancedRadarEnabled(advancedRadarEnabled);
      const current = await getAdvancedRadarEnabled();
      res.status(200).json({
        status: 'success',
        advancedRadarEnabled: current,
      });
    } catch (err) {
      console.error('[admin] Failed to update flags:', err);
      res.status(500).json({
        status: 'error',
        error: 'Unable to update feature flags',
      });
    }
    return;
  }

  res.status(405).json({ status: 'error', error: 'Method not allowed' });
}

/**
 * Handle get name by last digits
 */
async function handleGetNameByLastDigits(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ status: 'error', error: 'Method not allowed' });
  }

  try {
    const { lastDigits, fullRA } = req.query;
    
    if (!lastDigits || typeof lastDigits !== 'string' || lastDigits.length === 0) {
      res.status(400).json({ status: 'error', error: 'lastDigits parameter is required' });
      return;
    }
    
    if (!isSupabaseConfigured() || !supabase) {
      res.status(500).json({ status: 'error', error: 'Supabase not configured' });
      return;
    }
    
    const { data, error } = await supabase
      .from('students')
      .select('register_number, name')
      .ilike('register_number', `%${lastDigits}`)
      .limit(20);
    
    if (error) {
      console.error('Supabase error:', error);
      res.status(500).json({ status: 'error', error: error.message });
      return;
    }
    
    if (!data || data.length === 0) {
      res.status(404).json({
        status: 'error',
        error: 'No student found with these last digits'
      });
      return;
    }
    
    if (fullRA) {
      const fullRAMatch = data.find(record => 
        record.register_number && 
        record.register_number.toUpperCase() === fullRA.toUpperCase()
      );
      if (fullRAMatch) {
        res.status(200).json({
          status: 'success',
          success: true,
          registerNumber: fullRAMatch.register_number,
          name: fullRAMatch.name
        });
        return;
      }
    }
    
    const exactMatch = data.find(record => 
      record.register_number && 
      record.register_number.toUpperCase().endsWith(lastDigits.toUpperCase())
    );
    
    if (exactMatch) {
      res.status(200).json({
        status: 'success',
        success: true,
        registerNumber: exactMatch.register_number,
        name: exactMatch.name
      });
    } else {
      res.status(200).json({
        status: 'success',
        success: true,
        matches: data.map(r => ({
          registerNumber: r.register_number,
          name: r.name
        })),
        note: data.length === 1 ? 'Single match found' : 'Multiple matches found'
      });
    }
  } catch (error) {
    console.error('Error in get-name-by-last-digits:', error);
    res.status(500).json({
      status: 'error',
      error: 'Internal server error',
      message: error.message
    });
  }
}

