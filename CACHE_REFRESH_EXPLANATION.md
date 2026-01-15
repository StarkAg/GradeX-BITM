# Cache Refresh Behavior

## How Cache Refresh Works

### Current Behavior: **Lazy Refresh (On-Demand)**

The cache does NOT automatically refresh after 1 hour. Instead:

1. **Cache expires after 1 hour** (TTL = 60 minutes)
2. **Cache refreshes on the NEXT request** after expiration
3. **First user after expiration** triggers the refresh (takes ~5-15 seconds)
4. **Subsequent users** get instant results from refreshed cache

### Timeline Example:

```
10:00 AM - Cache created (first request)
10:00-11:00 AM - All requests use cache (instant, ~10-50ms)
11:00 AM - Cache expires (but still exists)
11:00-11:05 AM - No requests (cache still expired)
11:05 AM - User A searches → Cache expired, triggers refresh (~15 seconds)
11:05 AM - User B searches (while A is refreshing) → Waits for refresh
11:05 AM - Refresh complete → Both users get results
11:05-12:05 PM - All requests use fresh cache (instant)
```

## Current Implementation

**Cache TTL:** 1 hour (3,600,000 milliseconds)

**Refresh Trigger:** Next request after expiration

**Code Flow:**
```javascript
// Check if cache is expired
if (age < ALL_CAMPUS_CACHE_TTL) {
  // Use cache (instant)
  return cachedData;
} else {
  // Cache expired - fetch fresh data
  return await fetchAllCampusData(date);
}
```

## Options for Refresh Behavior

### Option 1: Keep Current (Lazy Refresh) ✅
- **Pros:** Simple, no background jobs needed
- **Cons:** First user after expiration waits ~15 seconds
- **Best for:** Low-medium traffic

### Option 2: Proactive Refresh (Before Expiration)
- Refresh cache at 50 minutes (before 1-hour expiration)
- **Pros:** Cache always fresh, no user waits
- **Cons:** More complex, requires background job/cron
- **Best for:** High traffic

### Option 3: Stale-While-Revalidate
- Serve stale cache immediately, refresh in background
- **Pros:** Users never wait, cache stays fresh
- **Cons:** Most complex implementation
- **Best for:** Very high traffic

## Recommendation

**For your use case:** Keep current lazy refresh is fine because:
- Most users search within the same hour
- Cache refresh only happens once per hour
- Only the first user after expiration waits
- Simple and reliable

**If you want proactive refresh:** I can add a background job that refreshes cache at 50 minutes, but it requires:
- Vercel Cron Jobs (Pro plan) OR
- External cron service (cron-job.org, etc.)

## How to Check Cache Age

**Via API:**
```bash
GET /api/cache-status
```

**Response:**
```json
{
  "inMemory": {
    "age": 3600000,  // milliseconds
    "ageFormatted": "1h 0m 0s",
    "isExpired": true  // true if > 1 hour
  }
}
```

## Summary

**Question:** Does cache refresh in 1 hour?
**Answer:** Cache EXPIRES after 1 hour, but REFRESHES on the next request after expiration (lazy refresh).

If you want automatic refresh before expiration, I can implement that!

