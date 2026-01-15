# Cache Time Analysis & Recommendations

## Current Cache Configuration

### 1. Global Campus Cache (ALL_CAMPUS_CACHE_TTL)
- **Current**: 3 hours (10,800 seconds)
- **Purpose**: Caches ALL seating data for a specific date across all campuses
- **Storage**: In-memory + Upstash Redis (persistent)
- **Scope**: Date-specific (each date has its own cache key)

### 2. Per-RA Cache
- **Current**: 15 minutes (900 seconds)
- **Purpose**: Legacy cache for individual RA lookups
- **Storage**: In-memory only (resets on serverless restart)
- **Note**: Less critical now due to global cache

### 3. Fast Fail Threshold
- **Current**: 30 minutes
- **Purpose**: If cache is fresh and RA not found, return empty immediately
- **Benefit**: Prevents unnecessary API calls when data is known to be complete

## Data Characteristics Analysis

### Exam Seating Data Nature
1. **Static Once Published**: Exam seating arrangements are typically published once and rarely change
2. **Date-Specific**: Each exam date has completely independent data
3. **High Query Repetition**: Same dates queried multiple times by different students
4. **Peak Usage Patterns**: 
   - Heavy usage during exam periods
   - Students check seats multiple times before exams
   - Same date queried by hundreds/thousands of students

### Data Volatility by Date Type
- **Past Dates**: Completely static (never changes) → Can cache indefinitely
- **Today's Date**: Very low volatility (rarely changes after initial publish) → Can cache 6-12 hours
- **Future Dates**: Low volatility (may have minor updates) → Can cache 6-24 hours

## Performance Impact Analysis

### Current Performance (3-hour cache)
- **Cache Hit Rate**: High (estimated 80-90%+ during peak periods)
- **API Call Reduction**: Significant (only fetches when cache expires)
- **Response Time**: 
  - Cache hit: < 50ms (in-memory) or < 200ms (Redis)
  - Cache miss: 5-15 seconds (fetching from 5 campuses)

### Cost Considerations
- **API Calls**: Each cache miss triggers 5 campus fetches (expensive)
- **Redis Storage**: Minimal cost (data is small, ~few MB per date)
- **Serverless Invocations**: Reduced with longer cache

## Recommended Cache Strategy

### Option 1: Conservative (Recommended for Production)
**Global Campus Cache: 6 hours**
- **Rationale**: 
  - Balances freshness with performance
  - Handles any late-day updates
  - Still provides excellent cache hit rates
  - Safe for production use

**Benefits**:
- 2x longer than current (3h → 6h)
- Reduces API calls by ~50%
- Maintains data freshness
- Low risk of stale data

### Option 2: Aggressive (Best Performance)
**Global Campus Cache: 12 hours**
- **Rationale**:
  - Exam data rarely changes after initial publish
  - Most updates happen in morning/afternoon
  - 12 hours covers a full exam day cycle

**Benefits**:
- 4x longer than current (3h → 12h)
- Reduces API calls by ~75%
- Excellent for high-traffic periods
- Still refreshes daily

### Option 3: Smart Date-Based (Optimal) ✅ **IMPLEMENTED**
**Different cache times based on date:**
- **Past dates**: 24 hours (data never changes)
- **Today's date**: 6 hours (handles any same-day updates)
- **Tomorrow**: 2 hours (short to catch late releases - seats might be published at last hour)
- **Future dates (2+ days ahead)**: 12 hours (covers planning period)

**Implementation**: ✅ Implemented with `getCacheTTLForDate()` function that:
- Parses date string (supports DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD)
- Compares with current date to determine relationship
- Returns appropriate TTL in milliseconds
- Applied to both in-memory and Redis cache

## Performance Metrics to Monitor

### Key Metrics
1. **Cache Hit Rate**: Target > 85%
2. **Average Response Time**: 
   - Cache hits: < 200ms
   - Cache misses: < 15s
3. **API Call Frequency**: Track calls per hour
4. **Cache Age Distribution**: Monitor how old cache is when accessed

### Current Patterns (Estimated)
- **Peak Hours**: 8 AM - 10 PM IST
- **Query Volume**: Highest on exam days
- **Date Distribution**: 
  - Today: 40% of queries
  - Tomorrow: 30% of queries
  - Other dates: 30% of queries

## Recommendation

### **✅ IMPLEMENTED: Smart Date-Based Caching (Option 3)**

**Why Smart Date-Based?**
1. **Optimal Performance**: Different cache times for different date types
2. **Handles Edge Cases**: Tomorrow's seats (2h cache) catches late releases
3. **Maximum Efficiency**: Past dates (24h) never need refreshing
4. **Balanced Approach**: Today (6h) and future (12h) provide good coverage
5. **Production Ready**: Handles real-world scenarios including last-minute seat releases

### Implementation ✅
```javascript
function getCacheTTLForDate(date) {
  // Past dates: 24 hours
  // Today: 6 hours
  // Tomorrow: 2 hours (catches late releases)
  // Future (2+ days): 12 hours
}
```

**Cache Times:**
- **Past dates**: 24 hours (86,400 seconds)
- **Today**: 6 hours (21,600 seconds)
- **Tomorrow**: 2 hours (7,200 seconds) - **Key for late seat releases**
- **Future dates**: 12 hours (43,200 seconds)

## Monitoring After Change

After implementing the new cache time, monitor:
1. **Cache hit rate** (should increase)
2. **API call frequency** (should decrease)
3. **User complaints** about stale data (should be zero)
4. **Response times** (should improve)

## Conclusion

✅ **IMPLEMENTED: Smart Date-Based Caching**

**Final Implementation:**
- **Past dates**: 24 hours - Data never changes, maximum cache efficiency
- **Today**: 6 hours - Handles same-day updates while maintaining performance
- **Tomorrow**: 2 hours - **Critical**: Catches late seat releases (seats published at last hour)
- **Future dates**: 12 hours - Covers planning period with good performance

**Benefits:**
1. **Handles Real-World Scenarios**: Tomorrow's 2h cache ensures late seat releases are caught
2. **Maximum Efficiency**: Past dates cached for 24h (never need refresh)
3. **Balanced Performance**: Today and future dates have appropriate cache times
4. **Production Ready**: Addresses the concern about last-minute seat publications

**Key Feature**: The 2-hour cache for tomorrow ensures that even if seats are published at 11 PM the night before, they'll be refreshed within 2 hours, ensuring students get the latest information.

