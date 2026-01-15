# Real-Time Cache Monitoring Guide

## How to View Cache in Real-Time

### Method 1: API Endpoint (Recommended)

**Endpoint:** `GET /api/cache-status`

**Usage:**
```bash
# In browser or curl
https://your-domain.vercel.app/api/cache-status
```

**Response:**
```json
{
  "status": "success",
  "inMemory": {
    "exists": true,
    "date": "24-11-2025",
    "timestamp": 1234567890,
    "age": 3600000,
    "ageFormatted": "1h 0m 0s",
    "size": 1500,
    "isExpired": false
  },
  "redis": {
    "available": true,
    "connected": true,
    "keys": ["campus_cache:24-11-2025", "campus_cache:any"],
    "sampleKeys": ["campus_cache:24-11-2025"],
    "sampleData": {
      "key": "campus_cache:24-11-2025",
      "timestamp": 1234567890,
      "age": 3600000,
      "dataSize": 1500
    }
  },
  "stats": {
    "hits": 45,
    "misses": 3,
    "writes": 2,
    "errors": 0,
    "lastHit": 1234567890,
    "lastMiss": 1234567800,
    "lastWrite": 1234567000,
    "hitRate": "93.8%"
  }
}
```

### Method 2: Browser Console Logs

**What to look for:**
- `✅ CACHE HIT` - Cache found and used
- `❌ CACHE MISS` - Cache not found, fetching fresh data
- `💾 CACHE WRITE` - Data saved to cache
- `⚠️ CACHE EXPIRED` - Cache expired, refreshing
- `❌ CACHE ERROR` - Error accessing cache

**Example logs:**
```
[getAllCampusDataCache] ✅ CACHE HIT - Using in-memory cache (age: 300s, 1500 RAs)
[getAllCampusDataCache] ✅ CACHE HIT - Found valid Upstash Redis cache (age: 1200s)
[getAllCampusDataCache] ❌ CACHE MISS - RA RA2311003012253 not found in global cache
[getAllCampusDataCache] 💾 CACHE WRITE - Saved 1500 unique RAs to Redis
```

### Method 3: Vercel Function Logs

1. Go to Vercel Dashboard
2. Select your project
3. Go to **Deployments** → Latest deployment
4. Click **Functions** tab
5. Select `/api/seating` or `/api/cache-status`
6. View **Logs** tab

**What you'll see:**
- Real-time cache operations
- Cache hits/misses
- Cache writes
- Errors (if any)

### Method 4: Upstash Dashboard

1. Go to https://console.upstash.com/
2. Select your database: `oriented-swift-40099`
3. Go to **Data Browser**
4. View keys: `campus_cache:*`
5. Click on a key to see cached data

## Cache Statistics Explained

### Hit Rate
- **High (90%+)**: Cache working well, most requests served from cache
- **Low (<50%)**: Cache may be expiring too quickly or not being used

### Cache Age
- **< 1 hour**: Cache is fresh and valid
- **> 1 hour**: Cache expired, will refresh on next request

### Cache Size
- Number of unique RAs cached
- Typical: 1000-5000 RAs per date

## Real-Time Monitoring Setup

### Option 1: Simple Page Refresh
```javascript
// Auto-refresh every 5 seconds
setInterval(() => {
  fetch('/api/cache-status')
    .then(r => r.json())
    .then(data => {
      console.log('Cache Status:', data);
      // Update UI with cache stats
    });
}, 5000);
```

### Option 2: Admin Portal Integration
Add cache status to your Admin Portal:
```javascript
// In AdminPortal.jsx
const [cacheStatus, setCacheStatus] = useState(null);

useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch('/api/cache-status');
    const data = await res.json();
    setCacheStatus(data);
  }, 5000); // Refresh every 5 seconds
  
  return () => clearInterval(interval);
}, []);
```

## What to Monitor

1. **Cache Hit Rate**: Should be >80% after initial cache
2. **Cache Age**: Should stay < 1 hour
3. **Cache Size**: Number of RAs cached
4. **Redis Connection**: Should be `connected: true`
5. **Errors**: Should be 0 or minimal

## Troubleshooting

### Cache Not Working?
1. Check `/api/cache-status` endpoint
2. Verify Redis connection: `redis.connected: true`
3. Check environment variables are set
4. Look for error messages in logs

### Low Hit Rate?
1. Cache may be expiring too quickly
2. Different dates being searched (each date has separate cache)
3. Cache not being written (check `writes` count)

### Cache Expired?
- Normal behavior after 1 hour
- Will auto-refresh on next request
- Check `ageFormatted` to see how old cache is

