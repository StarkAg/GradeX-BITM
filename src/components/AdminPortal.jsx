import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// Convert name to proper case (title case)
const toProperCase = (name) => {
  if (!name || name === '-' || name === 'N/A') return name;
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const PAGE_SIZE = 50;
const MAX_ENTRIES = 500;

export default function AdminPortal() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [boundedCount, setBoundedCount] = useState(0);
  const [totalSuccessful, setTotalSuccessful] = useState(0);
  const [totalFailed, setTotalFailed] = useState(0);
  const [totalFoundRate, setTotalFoundRate] = useState('0.0');
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState('24h'); // '24h', '7d', '30d'
  const [uniqueUsersChartData, setUniqueUsersChartData] = useState([]);
  const [uniqueUsersPeriod, setUniqueUsersPeriod] = useState('24h'); // '24h', '7d', '30d'
  const [totalUniqueUsers, setTotalUniqueUsers] = useState(0);
  const [uniqueUsersLastHour, setUniqueUsersLastHour] = useState(0);
  const [uniqueUsersDisplayMode, setUniqueUsersDisplayMode] = useState('24h');
  const [totalUniqueUsersAllTime, setTotalUniqueUsersAllTime] = useState(0);
  const [manualRefreshInFlight, setManualRefreshInFlight] = useState(false);
  const [clearingCache, setClearingCache] = useState(false);
  const [cacheClearMessage, setCacheClearMessage] = useState(null);
  const [refreshingCSV, setRefreshingCSV] = useState(false);
  const [csvRefreshMessage, setCsvRefreshMessage] = useState(null);
  const [socialClicks, setSocialClicks] = useState({ github: { total: 0, last24h: 0, last7d: 0 }, linkedin: { total: 0, last24h: 0, last7d: 0 }, total: 0 });
  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalCount, setFeedbackTotalCount] = useState(0);
  const [featureFlags, setFeatureFlags] = useState({ advancedRadarEnabled: false });
  const [featureFlagsLoading, setFeatureFlagsLoading] = useState(true);
  const [featureFlagsMessage, setFeatureFlagsMessage] = useState(null);
  const [updatingAdvancedRadar, setUpdatingAdvancedRadar] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [activeSearchTerm, setActiveSearchTerm] = useState('');
  const [groupgridVisits, setGroupgridVisits] = useState([]);
  const [groupgridVisitsLoading, setGroupgridVisitsLoading] = useState(false);
  const [groupgridVisitsPage, setGroupgridVisitsPage] = useState(1);
  const [groupgridVisitsTotal, setGroupgridVisitsTotal] = useState(0);
  const [groupgridVisitsUniqueRAs, setGroupgridVisitsUniqueRAs] = useState(0);
  const pageRef = useRef(1);
  const isFetchingRef = useRef(false);
  const searchRef = useRef('');

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(Math.max(1, boundedCount) / PAGE_SIZE)),
    [boundedCount]
  );

  const fetchEnquiries = useCallback(async (showSpinner = false, nextPage, overrideSearchTerm) => {
    const targetPage = Math.max(nextPage ?? pageRef.current ?? 1, 1);
    const effectiveSearch = typeof overrideSearchTerm === 'string'
      ? overrideSearchTerm
      : (searchRef.current || '');
    
    // Skip if already fetching (prevent overlapping requests)
    if (isFetchingRef.current && !showSpinner) {
      return;
    }
    
    isFetchingRef.current = true;
    if (showSpinner) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }
    setError(null);

    try {
      console.log('[AdminPortal] Fetching enquiries', {
        page: targetPage,
        search: effectiveSearch || null,
      });
      
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      let response;
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          pageSize: String(PAGE_SIZE),
        });
        if (effectiveSearch) {
          params.set('search', effectiveSearch);
        }
        response = await fetch(`/api/admin?action=enquiries&${params.toString()}`, {
        cache: 'no-store',
          signal: controller.signal,
      });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timed out. Please try again.');
        }
        throw fetchError;
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[AdminPortal] API error:', response.status, errorText);
        throw new Error(`Failed to fetch enquiries (${response.status})`);
      }

      const payload = await response.json();
      console.log('[AdminPortal] Received payload:', { status: payload.status, count: payload.count });
      if (payload.status !== 'success') {
        throw new Error(payload.error || 'Unexpected response from admin API');
      }

      const fetchedTotal = payload.totalCount || 0;
      const boundedTotal = Math.min(fetchedTotal, MAX_ENTRIES);

      setEnquiries(payload.data || []);
      setTotalCount(fetchedTotal);
      setBoundedCount(boundedTotal);
      setTotalSuccessful(payload.totalSuccessful || 0);
      setTotalFailed(payload.totalFailed || 0);
      setTotalFoundRate(payload.totalFoundRate || '0.0');

      const safePage = Math.min(
        Math.max(payload.page || targetPage, 1),
        Math.max(1, Math.ceil(Math.max(1, boundedTotal) / PAGE_SIZE))
      );
      setPage(safePage);
      pageRef.current = safePage;
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[AdminPortal] Fetch error:', err);
      setError(err.message || 'Unable to load enquiries');
    } finally {
      // Always clear loading state and fetching flag
      isFetchingRef.current = false;
      if (showSpinner) {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
      console.log('[AdminPortal] Fetch complete, loading states cleared');
    }
  }, []);

  useEffect(() => {
    pageRef.current = page;
  }, [page]);

  useEffect(() => {
    searchRef.current = activeSearchTerm;
  }, [activeSearchTerm]);

  const fetchChartData = useCallback(async (period = chartPeriod) => {
    try {
      // Determine hours to fetch based on period
      // Fetch 25 hours for 24h period to ensure we capture all data including current hour
      let hoursToFetch = 25;
      if (period === '7d') hoursToFetch = 24 * 7 + 1;
      else if (period === '30d') hoursToFetch = 24 * 30 + 1;
      
      // Fetch enquiries for the selected period
      // Use a high pageSize to ensure we get all records (Supabase may limit, but we try)
      const response = await fetch(`/api/admin?action=enquiries&pageSize=10000&hours=${hoursToFetch}`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'success' && payload.data) {
          const now = new Date();
          const dataMap = new Map();
          
          if (period === '24h') {
            // Group by hour for 24 hours (using UTC to match database timestamps)
            // Calculate start time: go back 24 hours from current time, rounded down to hour
            const startTime = new Date(now);
            // Round current time down to the nearest hour
            startTime.setUTCMinutes(0);
            startTime.setUTCSeconds(0);
            startTime.setUTCMilliseconds(0);
            // Subtract 24 hours to get the first hour (we fetch 25 hours of data, so create 25 slots to capture all)
            // This ensures we don't miss data that's slightly outside the 24-hour window
            startTime.setTime(startTime.getTime() - (24 * 60 * 60 * 1000));
            
            // Create 25 hour slots in UTC to match the 25 hours of data we fetch
            // We'll display 24 hours but need 25 to capture edge cases
            for (let i = 0; i < 25; i++) {
              // Add hours using milliseconds to avoid day boundary issues
              const hourDate = new Date(startTime.getTime() + (i * 60 * 60 * 1000));
              
              const hourKey = hourDate.toISOString();
              // Display hour in local time for user-friendly labels
              const localHour = new Date(hourDate.getTime());
              const displayHour = localHour.getHours();
              const displayLabel = `${displayHour.toString().padStart(2, '0')}:00`;
              
              dataMap.set(hourKey, { 
                timestamp: hourDate.getTime(),
                total: 0,
                successful: 0,
                failed: 0,
                label: displayLabel 
              });
            }
            
            // Debug: verify we're including the current hour
            const currentHourRounded = new Date(now);
            currentHourRounded.setUTCMinutes(0);
            currentHourRounded.setUTCSeconds(0);
            currentHourRounded.setUTCMilliseconds(0);
            const currentHourKey = currentHourRounded.toISOString();
            if (!dataMap.has(currentHourKey)) {
              console.warn(`[AdminPortal] WARNING: Current hour ${currentHourKey} not in slots!`);
            }
            
            // Debug: log hour slots created
            console.log(`[AdminPortal] Created ${dataMap.size} hour slots for 24h period`);
            const slotKeys = Array.from(dataMap.keys()).sort();
            if (slotKeys.length > 0) {
              console.log(`[AdminPortal] First slot: ${slotKeys[0]}, Last slot: ${slotKeys[slotKeys.length - 1]}`);
            }
            console.log(`[AdminPortal] Current time: ${now.toISOString()}, Current hour (rounded): ${currentHourRounded.toISOString()}`);
            console.log(`[AdminPortal] Received ${payload.data.length} enquiries from API`);
            
            // Check what the latest timestamp in the data is
            if (payload.data.length > 0) {
              const timestamps = payload.data
                .map(e => e.searched_at)
                .filter(Boolean)
                .sort()
                .reverse();
              if (timestamps.length > 0) {
                const latestTimestamp = new Date(timestamps[0]);
                latestTimestamp.setUTCMinutes(0);
                latestTimestamp.setUTCSeconds(0);
                latestTimestamp.setUTCMilliseconds(0);
                console.log(`[AdminPortal] Latest data timestamp: ${timestamps[0]}, Latest hour slot: ${latestTimestamp.toISOString()}`);
              }
            }
            
            // Count enquiries per hour (matching UTC timestamps)
            let matchedCount = 0;
            let unmatchedCount = 0;
            const hourCounts = new Map(); // Track counts per hour for debugging
            
            payload.data.forEach((enquiry) => {
              if (enquiry.searched_at) {
                const searchDate = new Date(enquiry.searched_at);
                const searchHour = new Date(searchDate);
                searchHour.setUTCMinutes(0);
                searchHour.setUTCSeconds(0);
                searchHour.setUTCMilliseconds(0);
                
                const hourKey = searchHour.toISOString();
                const hourData = dataMap.get(hourKey);
                
                if (hourData) {
                  hourData.total += 1;
                  matchedCount++;
                  // Track counts per hour
                  const currentCount = hourCounts.get(hourKey) || 0;
                  hourCounts.set(hourKey, currentCount + 1);
                  
                  if (enquiry.results_found) {
                    hourData.successful += 1;
                  } else {
                    hourData.failed += 1;
                  }
                } else {
                  unmatchedCount++;
                  // Debug: log if we have data that doesn't match any slot
                  console.log(`[AdminPortal] No matching hour slot for: ${hourKey}, searchDate: ${enquiry.searched_at}, parsed UTC: ${searchDate.toISOString()}`);
                }
              }
            });
            
            // Debug: show distribution of data across hours
            console.log(`[AdminPortal] Matched: ${matchedCount}, Unmatched: ${unmatchedCount}`);
            console.log(`[AdminPortal] Data distribution across hours:`);
            const sortedHourCounts = Array.from(hourCounts.entries())
              .sort((a, b) => a[0].localeCompare(b[0]));
            sortedHourCounts.forEach(([hourKey, count]) => {
              const hourDate = new Date(hourKey);
              const localHour = new Date(hourDate.getTime());
              const displayHour = localHour.getHours();
              const displayLabel = `${displayHour.toString().padStart(2, '0')}:00`;
              console.log(`  ${displayLabel} (${hourKey}): ${count} enquiries`);
            });
            
            // Also show which hours have zero data
            console.log(`[AdminPortal] Hours with zero data:`);
            dataMap.forEach((data, hourKey) => {
              if (data.total === 0) {
                console.log(`  ${data.label} (${hourKey}): 0 enquiries`);
              }
            });
          } else {
            // Group by day for 7d or 30d
            const days = period === '7d' ? 7 : 30;
            const startTime = new Date(now);
            startTime.setDate(now.getDate() - (days - 1));
            startTime.setHours(0, 0, 0, 0);
            
            // Helper function to get date key in YYYY-MM-DD format (local time)
            const getDateKey = (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            };
            
            // Create day slots
            for (let i = 0; i < days; i++) {
              const dayDate = new Date(startTime);
              dayDate.setDate(startTime.getDate() + i);
              
              const dayKey = getDateKey(dayDate);
              const displayLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              dataMap.set(dayKey, { 
                timestamp: dayDate.getTime(),
                total: 0,
                successful: 0,
                failed: 0,
                label: displayLabel 
              });
            }
            
            // Count enquiries per day
            payload.data.forEach((enquiry) => {
              if (enquiry.searched_at) {
                const searchDate = new Date(enquiry.searched_at);
                const dayKey = getDateKey(searchDate);
                const dayData = dataMap.get(dayKey);
                
                if (dayData) {
                  dayData.total += 1;
                  if (enquiry.results_found) {
                    dayData.successful += 1;
                  } else {
                    dayData.failed += 1;
                  }
                }
              }
            });
          }
          
          // Convert to array and sort by timestamp
          let chartDataArray = Array.from(dataMap.values())
            .sort((a, b) => a.timestamp - b.timestamp);
          
          // For 24h period, if we created 25 slots, only show the last 24 for display
          if (period === '24h' && chartDataArray.length === 25) {
            chartDataArray = chartDataArray.slice(1); // Remove the first (oldest) hour
          }
          
          // Debug: log the chart data array
          console.log(`[AdminPortal] Chart data array length: ${chartDataArray.length}`);
          if (chartDataArray.length > 0) {
            console.log(`[AdminPortal] First chart entry: ${chartDataArray[0].label} (${new Date(chartDataArray[0].timestamp).toISOString()})`);
            console.log(`[AdminPortal] Last chart entry: ${chartDataArray[chartDataArray.length - 1].label} (${new Date(chartDataArray[chartDataArray.length - 1].timestamp).toISOString()})`);
            // Log all labels
            const allLabels = chartDataArray.map(d => d.label).join(', ');
            console.log(`[AdminPortal] All labels: ${allLabels}`);
          }
          
          setChartData(chartDataArray);
        }
      }
    } catch (err) {
      console.error('[AdminPortal] Chart data fetch error:', err);
    }
  }, [chartPeriod]);

  const fetchUniqueUsersChartData = useCallback(async (period = uniqueUsersPeriod) => {
    try {
      // Determine hours to fetch based on period
      // Fetch 25 hours for 24h period to ensure we capture all data including current hour
      let hoursToFetch = 25;
      if (period === '7d') hoursToFetch = 24 * 7 + 1;
      else if (period === '30d') hoursToFetch = 24 * 30 + 1;
      
      // Fetch unique users data for the selected period
      const response = await fetch(`/api/admin?action=unique-users&hours=${hoursToFetch}`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'success') {
          const sanitizedRows = Array.isArray(payload.data)
            ? payload.data.filter((row) => row?.ip_address && row?.searched_at)
            : [];
          
          const now = new Date();
          const nowMs = now.getTime();
          const oneHourAgo = nowMs - (60 * 60 * 1000);
          const twentyFourHoursAgo = nowMs - (24 * 60 * 60 * 1000);
          const lastHourSet = new Set();
          const lastDaySet = new Set();
          
          sanitizedRows.forEach((entry) => {
            const timestamp = new Date(entry.searched_at).getTime();
            if (timestamp >= twentyFourHoursAgo) {
              lastDaySet.add(entry.ip_address);
            }
            if (timestamp >= oneHourAgo) {
              lastHourSet.add(entry.ip_address);
            }
          });
          
          setTotalUniqueUsers(lastDaySet.size);
          setUniqueUsersLastHour(lastHourSet.size);
          setTotalUniqueUsersAllTime(payload.totalUniqueAllTime || 0);
          
          const dataMap = new Map();
          
          if (period === '24h') {
            // Group unique IPs by hour for 24 hours (using UTC to match database timestamps)
            // Calculate start time: go back 24 hours from current time, rounded down to hour
            const startTime = new Date(now);
            // Round current time down to the nearest hour
            startTime.setUTCMinutes(0);
            startTime.setUTCSeconds(0);
            startTime.setUTCMilliseconds(0);
            // Subtract 24 hours to get the first hour (we fetch 25 hours of data, so create 25 slots to capture all)
            // This ensures we don't miss data that's slightly outside the 24-hour window
            startTime.setTime(startTime.getTime() - (24 * 60 * 60 * 1000));
            
            // Create 25 hour slots in UTC to match the 25 hours of data we fetch
            // We'll display 24 hours but need 25 to capture edge cases
            for (let i = 0; i < 25; i++) {
              // Add hours using milliseconds to avoid day boundary issues
              const hourDate = new Date(startTime.getTime() + (i * 60 * 60 * 1000));
              
              const hourKey = hourDate.toISOString();
              // Display hour in local time for user-friendly labels
              const localHour = new Date(hourDate.getTime());
              const displayHour = localHour.getHours();
              const displayLabel = `${displayHour.toString().padStart(2, '0')}:00`;
              
              dataMap.set(hourKey, { 
                timestamp: hourDate.getTime(),
                unique: 0,
                label: displayLabel 
              });
            }
            
            // Debug: verify we're including the current hour
            const currentHourRounded = new Date(now);
            currentHourRounded.setUTCMinutes(0);
            currentHourRounded.setUTCSeconds(0);
            currentHourRounded.setUTCMilliseconds(0);
            const currentHourKey = currentHourRounded.toISOString();
            if (!dataMap.has(currentHourKey)) {
              console.warn(`[AdminPortal] WARNING: Current hour ${currentHourKey} not in unique users slots!`);
            }
            
            // Count unique IPs per hour (matching UTC timestamps)
            const hourIPsMap = new Map();
            sanitizedRows.forEach((enquiry) => {
              if (enquiry.ip_address && enquiry.searched_at) {
                const searchDate = new Date(enquiry.searched_at);
                const searchHour = new Date(searchDate);
                searchHour.setUTCMinutes(0);
                searchHour.setUTCSeconds(0);
                searchHour.setUTCMilliseconds(0);
                
                const hourKey = searchHour.toISOString();
                const hourData = dataMap.get(hourKey);
                
                if (hourData) {
                  if (!hourIPsMap.has(hourKey)) {
                    hourIPsMap.set(hourKey, new Set());
                  }
                  hourIPsMap.get(hourKey).add(enquiry.ip_address);
                } else {
                  // Debug: log if we have data that doesn't match any slot
                  console.log(`[AdminPortal] No matching hour slot for unique users: ${hourKey}, searchDate: ${enquiry.searched_at}`);
                }
              }
            });
            
            // Update counts
            hourIPsMap.forEach((ipSet, hourKey) => {
              const hourData = dataMap.get(hourKey);
              if (hourData) {
                hourData.unique = ipSet.size;
              }
            });
          } else {
            // Group unique IPs by day for 7d or 30d
            const days = period === '7d' ? 7 : 30;
            const startTime = new Date(now);
            startTime.setDate(now.getDate() - (days - 1));
            startTime.setHours(0, 0, 0, 0);
            
            // Helper function to get date key in YYYY-MM-DD format (local time)
            const getDateKey = (date) => {
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            };
            
            // Create day slots
            for (let i = 0; i < days; i++) {
              const dayDate = new Date(startTime);
              dayDate.setDate(startTime.getDate() + i);
              
              const dayKey = getDateKey(dayDate);
              const displayLabel = dayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
              
              dataMap.set(dayKey, { 
                timestamp: dayDate.getTime(),
                unique: 0,
                label: displayLabel 
              });
            }
            
            // Count unique IPs per day
            const dayIPsMap = new Map();
            sanitizedRows.forEach((enquiry) => {
              if (enquiry.ip_address && enquiry.searched_at) {
                const searchDate = new Date(enquiry.searched_at);
                const dayKey = getDateKey(searchDate);
                const dayData = dataMap.get(dayKey);
                
                if (dayData) {
                  if (!dayIPsMap.has(dayKey)) {
                    dayIPsMap.set(dayKey, new Set());
                  }
                  dayIPsMap.get(dayKey).add(enquiry.ip_address);
                }
              }
            });
            
            // Update counts
            dayIPsMap.forEach((ipSet, dayKey) => {
              const dayData = dataMap.get(dayKey);
              if (dayData) {
                dayData.unique = ipSet.size;
              }
            });
          }
          
          // Convert to array and sort by timestamp
          let chartDataArray = Array.from(dataMap.values())
            .sort((a, b) => a.timestamp - b.timestamp);
          
          // For 24h period, if we created 25 slots, only show the last 24 for display
          if (period === '24h' && chartDataArray.length === 25) {
            chartDataArray = chartDataArray.slice(1); // Remove the first (oldest) hour
          }
          
          setUniqueUsersChartData(chartDataArray);
        }
      }
    } catch (err) {
      console.error('[AdminPortal] Unique users chart data fetch error:', err);
    }
  }, [uniqueUsersPeriod]);

  const fetchSocialClicks = useCallback(async () => {
    try {
      const response = await fetch('/api/admin?action=social-clicks', {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'success' && payload.data) {
          setSocialClicks(payload.data);
        }
      }
    } catch (err) {
      console.error('[AdminPortal] Social clicks fetch error:', err);
    }
  }, []);

  const fetchFeedback = useCallback(async (page = 1) => {
    setFeedbackLoading(true);
    try {
      const response = await fetch(`/api/admin?action=feedback&page=${page}&pageSize=50`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'success') {
          setFeedback(payload.data || []);
          setFeedbackTotalCount(payload.totalCount || 0);
          setFeedbackPage(payload.page || 1);
        }
      }
    } catch (err) {
      console.error('[AdminPortal] Feedback fetch error:', err);
    } finally {
      setFeedbackLoading(false);
    }
  }, []);

  const fetchGroupGridVisits = useCallback(async (page = 1, hours = 24) => {
    setGroupgridVisitsLoading(true);
    try {
      const response = await fetch(`/api/admin?action=groupgrid-visits&page=${page}&pageSize=50&hours=${hours}`, {
        cache: 'no-store',
      });
      
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'success') {
          setGroupgridVisits(payload.data || []);
          setGroupgridVisitsTotal(payload.totalCount || 0);
          setGroupgridVisitsUniqueRAs(payload.uniqueRAs || 0);
          setGroupgridVisitsPage(payload.page || 1);
        }
      }
    } catch (err) {
      console.error('[AdminPortal] GroupGrid visits fetch error:', err);
    } finally {
      setGroupgridVisitsLoading(false);
    }
  }, []);

  const initialFetchRef = useRef(false);
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    (async () => {
      await fetchEnquiries(true, 1);
      await Promise.all([
        fetchChartData(chartPeriod),
        fetchUniqueUsersChartData(uniqueUsersPeriod),
        fetchSocialClicks(),
        fetchFeedback(1),
        fetchGroupGridVisits(1, 24),
      ]);
    })();
  }, [fetchEnquiries, fetchChartData, fetchUniqueUsersChartData, fetchSocialClicks, fetchGroupGridVisits, chartPeriod, uniqueUsersPeriod]);

  const handleManualRefresh = useCallback(async () => {
    if (manualRefreshInFlight) return;
    setManualRefreshInFlight(true);
    try {
      await Promise.all([
        fetchEnquiries(false, pageRef.current),
        fetchChartData(chartPeriod),
        fetchUniqueUsersChartData(uniqueUsersPeriod),
        fetchSocialClicks(),
        fetchFeedback(feedbackPage),
      ]);
    } finally {
      setManualRefreshInFlight(false);
    }
  }, [
    manualRefreshInFlight,
    fetchEnquiries,
    chartPeriod,
    fetchChartData,
    uniqueUsersPeriod,
    fetchUniqueUsersChartData,
    fetchSocialClicks,
    fetchFeedback,
    feedbackPage,
  ]);
  
  const handleSearchSubmit = useCallback((event) => {
    event.preventDefault();
    const trimmed = searchInput.trim();
    setSearchInput(trimmed);
    setActiveSearchTerm(trimmed);
    pageRef.current = 1;
    setPage(1);
    fetchEnquiries(true, 1, trimmed);
  }, [searchInput, fetchEnquiries]);
  
  const handleClearSearch = useCallback(() => {
    if (!searchInput && !activeSearchTerm) {
      return;
    }
    setSearchInput('');
    setActiveSearchTerm('');
    pageRef.current = 1;
    setPage(1);
    fetchEnquiries(true, 1, '');
  }, [searchInput, activeSearchTerm, fetchEnquiries]);
  
  const isSearching = useMemo(() => activeSearchTerm.length > 0, [activeSearchTerm]);

  const handlePeriodChange = useCallback((period) => {
    setChartPeriod(period);
    fetchChartData(period);
  }, [fetchChartData]);

  const handleUniqueUsersPeriodChange = useCallback((period) => {
    setUniqueUsersPeriod(period);
    fetchUniqueUsersChartData(period);
  }, [fetchUniqueUsersChartData]);

  const stats = useMemo(() => {
    // Get the latest ID from enquiries (highest ID = latest)
    const latestId = enquiries.length > 0 
      ? Math.max(...enquiries.map(e => e.id || 0))
      : 0;

    return {
      total: latestId || totalCount, // Use latest ID, fallback to totalCount
      successful: totalSuccessful,
      failed: totalFailed,
      foundRate: totalFoundRate,
    };
  }, [enquiries, totalCount, totalSuccessful, totalFailed, totalFoundRate]);

  const formatIST = useCallback((timestamp) => {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }, []);

  const handleClearCache = useCallback(async () => {
    if (clearingCache) return; // Prevent double-clicks
    
    // Confirm action
    if (!window.confirm('Are you sure you want to clear all caches? This will force fresh data fetches on the next requests.')) {
      return;
    }

    setClearingCache(true);
    setCacheClearMessage(null);
    setError(null);

    try {
      const response = await fetch('/api/admin?action=clear-cache', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setCacheClearMessage({
          type: 'success',
          text: 'All caches cleared successfully!',
        });
        // Clear message after 5 seconds
        setTimeout(() => setCacheClearMessage(null), 5000);
      } else {
        throw new Error(data.error || 'Failed to clear caches');
      }
    } catch (err) {
      console.error('[AdminPortal] Cache clear error:', err);
      setCacheClearMessage({
        type: 'error',
        text: err.message || 'Failed to clear caches',
      });
      // Clear error message after 5 seconds
      setTimeout(() => setCacheClearMessage(null), 5000);
    } finally {
      setClearingCache(false);
    }
  }, [clearingCache]);

  const handleRefreshCSV = useCallback(async () => {
    if (refreshingCSV) return;
    
    setRefreshingCSV(true);
    setCsvRefreshMessage(null);
    setError(null);

    try {
      // Call API
      const response = await fetch('/api/admin?action=refresh-csv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Broadcast refresh signal to all SubDeck tabs
        try {
          const channel = new BroadcastChannel('subdeck-csv-refresh');
          channel.postMessage({ type: 'refresh-csv', timestamp: Date.now() });
          channel.close();
          console.log('[AdminPortal] CSV refresh signal broadcasted');
        } catch (broadcastError) {
          console.warn('[AdminPortal] BroadcastChannel not supported:', broadcastError);
        }

        setCsvRefreshMessage({
          type: 'success',
          text: 'CSV refresh signal sent! All SubDeck pages will update automatically.',
        });
        setTimeout(() => setCsvRefreshMessage(null), 5000);
      } else {
        throw new Error(data.error || 'Failed to refresh CSV');
      }
    } catch (err) {
      console.error('[AdminPortal] CSV refresh error:', err);
      setCsvRefreshMessage({
        type: 'error',
        text: err.message || 'Failed to refresh CSV',
      });
      setTimeout(() => setCsvRefreshMessage(null), 5000);
    } finally {
      setRefreshingCSV(false);
    }
  }, [refreshingCSV]);

  const fetchFeatureFlags = useCallback(async () => {
    setFeatureFlagsLoading(true);
    try {
      const response = await fetch('/api/admin?action=feature-flags', { cache: 'no-store' });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'Failed to fetch feature flags');
      }
      const data = await response.json();
      setFeatureFlags({
        advancedRadarEnabled: data?.advancedRadarEnabled === true,
      });
    } catch (err) {
      console.error('[AdminPortal] Feature flag fetch error:', err);
      setFeatureFlagsMessage({
        type: 'error',
        text: err.message || 'Unable to load feature flags',
      });
      setTimeout(() => setFeatureFlagsMessage(null), 5000);
    } finally {
      setFeatureFlagsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatureFlags();
  }, [fetchFeatureFlags]);

  useEffect(() => {
    const interval = setInterval(() => {
      setUniqueUsersDisplayMode((prev) => (prev === '24h' ? '1h' : '24h'));
    }, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvancedRadarToggle = useCallback(async () => {
    if (featureFlagsLoading || updatingAdvancedRadar) return;
    const nextValue = !featureFlags.advancedRadarEnabled;
    setUpdatingAdvancedRadar(true);
    setFeatureFlagsMessage(null);

    try {
      const response = await fetch('/api/admin?action=feature-flags', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ advancedRadarEnabled: nextValue }),
      });
      const data = await response.json();
      if (!response.ok || data.status !== 'success') {
        throw new Error(data.error || 'Failed to update feature flag');
      }
      setFeatureFlags({
        advancedRadarEnabled: data.advancedRadarEnabled === true,
      });
      setFeatureFlagsMessage({
        type: 'success',
        text: nextValue ? 'Advanced radar enabled' : 'Advanced radar disabled',
      });
    } catch (err) {
      console.error('[AdminPortal] Feature flag update error:', err);
      setFeatureFlagsMessage({
        type: 'error',
        text: err.message || 'Unable to update feature flag',
      });
    } finally {
      setUpdatingAdvancedRadar(false);
      setTimeout(() => setFeatureFlagsMessage(null), 5000);
    }
  }, [featureFlags.advancedRadarEnabled, featureFlagsLoading, updatingAdvancedRadar]);

  return (
    <section className="admin-portal">
      <div className="admin-hero">
        <div>
          <p className="feedfill-eyebrow">Internal dashboard</p>
          <h2>GradeX Admin Console</h2>
          <p className="feedfill-description">
            Monitor live seat-search activity, export logs, and keep an eye on failures at a glance.
            Use the Refresh button whenever you want to pull the latest metrics.
          </p>
        </div>
        <div className="admin-actions">
          {lastUpdated && (
            <span className="admin-last-updated">
              Last updated {formatIST(lastUpdated)}
            </span>
          )}
          <button
            type="button"
            className="feedfill-button"
            onClick={handleManualRefresh}
            disabled={manualRefreshInFlight || loading}
            style={{
              marginLeft: '12px',
              opacity: manualRefreshInFlight || loading ? 0.6 : 1,
              cursor: manualRefreshInFlight || loading ? 'not-allowed' : 'pointer',
            }}
          >
            {manualRefreshInFlight ? 'Refreshing...' : 'Refresh Data'}
          </button>
          <button
            type="button"
            className="feedfill-button secondary"
            onClick={handleClearCache}
            disabled={clearingCache}
            style={{
              marginLeft: '12px',
              opacity: clearingCache ? 0.6 : 1,
              cursor: clearingCache ? 'not-allowed' : 'pointer',
            }}
          >
            {clearingCache ? 'Clearing...' : 'Clear All Caches'}
          </button>
          <button
            type="button"
            className="feedfill-button"
            onClick={handleRefreshCSV}
            disabled={refreshingCSV}
            style={{
              marginLeft: '12px',
              opacity: refreshingCSV ? 0.6 : 1,
              cursor: refreshingCSV ? 'not-allowed' : 'pointer',
              background: 'linear-gradient(120deg, #10b981, #059669)',
            }}
          >
            {refreshingCSV ? 'Refreshing...' : '🔄 Refresh SubDeck CSV'}
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {cacheClearMessage && (
        <div className={cacheClearMessage.type === 'success' ? 'admin-success' : 'admin-error'}>
          {cacheClearMessage.text}
        </div>
      )}

      {csvRefreshMessage && (
        <div className={csvRefreshMessage.type === 'success' ? 'admin-success' : 'admin-error'}>
          {csvRefreshMessage.text}
        </div>
      )}

      {featureFlagsMessage && (
        <div className={featureFlagsMessage.type === 'success' ? 'admin-success' : 'admin-error'}>
          {featureFlagsMessage.text}
        </div>
      )}
      
      <div
        className="admin-search-panel"
        style={{
          marginTop: '24px',
          padding: '16px 20px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          background: 'rgba(255, 255, 255, 0.02)',
        }}
      >
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <input
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Search by student name across all enquiries"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            style={{
              flex: '1 1 280px',
              minWidth: '220px',
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              background: 'rgba(0, 0, 0, 0.2)',
              color: '#f5f5f5',
              fontSize: '14px',
            }}
            aria-label="Search enquiries by name"
          />
          <div style={{ display: 'flex', gap: '10px' }}>
            {(searchInput || isSearching) && (
              <button
                type="button"
                className="feedfill-button secondary"
                onClick={handleClearSearch}
                style={{ whiteSpace: 'nowrap' }}
              >
                Clear
              </button>
            )}
            <button
              type="submit"
              className="feedfill-button"
              style={{ whiteSpace: 'nowrap' }}
            >
              Search
            </button>
          </div>
        </form>
        {isSearching && (
          <p
            style={{
              margin: '12px 0 0',
              fontSize: '13px',
              color: 'var(--text-secondary)',
            }}
          >
            Showing {boundedCount.toLocaleString()} entr{boundedCount === 1 ? 'y' : 'ies'} matching "{activeSearchTerm}".
          </p>
        )}
      </div>

      {loading ? (
        <div className="admin-loading">Loading enquiries…</div>
      ) : (
        <>
          <div className="admin-stats">
            <div className="admin-stat-card">
              <p className="label">Total Searches</p>
              <p className="value">{stats.total.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card">
              <p className="label">Successful</p>
              <p className="value success">{stats.successful.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card">
              <p className="label">Failed</p>
              <p className="value danger">{stats.failed.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card">
              <p className="label">Found Rate</p>
              <p className="value accent">{stats.foundRate}%</p>
            </div>
          </div>

          <div className="admin-stats" style={{ marginTop: '24px' }}>
            <div className="admin-stat-card">
              <p className="label">GitHub Clicks</p>
              <p className="value">{socialClicks.github.total.toLocaleString()}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                {socialClicks.github.last24h} last 24h • {socialClicks.github.last7d} last 7d
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="label">LinkedIn Clicks</p>
              <p className="value">{socialClicks.linkedin.total.toLocaleString()}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                {socialClicks.linkedin.last24h} last 24h • {socialClicks.linkedin.last7d} last 7d
              </p>
            </div>
            <div className="admin-stat-card">
              <p className="label">Total Social Clicks</p>
              <p className="value accent">{socialClicks.total.toLocaleString()}</p>
            </div>
            <div className="admin-stat-card">
              <p className="label">Unique Users</p>
              <p className="value accent">{totalUniqueUsersAllTime.toLocaleString()}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', marginBottom: 0 }}>
                All-time distinct IPs observed since launch
              </p>
              <div
                style={{
                  position: 'relative',
                  height: '52px',
                  marginTop: '12px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    opacity: uniqueUsersDisplayMode === '24h' ? 1 : 0,
                    transform: uniqueUsersDisplayMode === '24h' ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'opacity 0.6s ease, transform 0.6s ease',
                  }}
                >
                  <p className="value" style={{ fontSize: '20px', marginBottom: '2px' }}>
                    {totalUniqueUsers.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-secondary)' }}>Unique IPs in the last 24h</p>
                </div>
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: '100%',
                    opacity: uniqueUsersDisplayMode === '1h' ? 1 : 0,
                    transform: uniqueUsersDisplayMode === '1h' ? 'translateY(0)' : 'translateY(12px)',
                    transition: 'opacity 0.6s ease, transform 0.6s ease',
                  }}
                >
                  <p className="value" style={{ fontSize: '20px', marginBottom: '2px' }}>
                    {uniqueUsersLastHour.toLocaleString()}
                  </p>
                  <p style={{ fontSize: '11px', margin: 0, color: 'var(--text-secondary)' }}>Unique IPs in the last hour</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '24px' }}>
            <div
              style={{
                width: '100%',
                borderRadius: '16px',
                border: '1px solid rgba(255,255,255,0.08)',
                padding: '18px 24px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '18px',
                alignItems: 'center',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <div style={{ flex: '1 1 220px', minWidth: '200px' }}>
                <p style={{ margin: 0, fontSize: '12px', letterSpacing: '0.18em', color: 'var(--text-secondary)' }}>
                  ADVANCED RADAR
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Class & batch lookup toggle
                </p>
              </div>
              <div style={{ flex: '2 1 320px', minWidth: '260px' }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: '13px',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: featureFlags.advancedRadarEnabled ? '#34d399' : '#f87171',
                  }}
                >
                  {featureFlags.advancedRadarEnabled ? 'ONLINE' : 'OFFLINE'}
                </p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {featureFlagsLoading
                    ? 'Checking flag status...'
                    : featureFlags.advancedRadarEnabled
                      ? 'Students can run classroom scans and RA range sweeps.'
                      : 'Disabled to conserve Unsplash bandwidth. Flip the switch to re-enable.'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                <label className="gradex-toggle" style={{ pointerEvents: featureFlagsLoading ? 'none' : 'auto' }}>
                  <input
                    type="checkbox"
                    checked={featureFlags.advancedRadarEnabled}
                    disabled={featureFlagsLoading || updatingAdvancedRadar}
                    onChange={handleAdvancedRadarToggle}
                  />
                  <span>{featureFlags.advancedRadarEnabled ? 'Online' : 'Offline'}</span>
                </label>
                <button
                  type="button"
                  className="feedfill-button secondary"
                  onClick={handleAdvancedRadarToggle}
                  disabled={featureFlagsLoading || updatingAdvancedRadar}
                  style={{
                    opacity: featureFlagsLoading || updatingAdvancedRadar ? 0.6 : 1,
                    cursor: featureFlagsLoading || updatingAdvancedRadar ? 'not-allowed' : 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {featureFlagsLoading
                    ? 'Syncing...'
                    : updatingAdvancedRadar
                      ? 'Saving...'
                      : featureFlags.advancedRadarEnabled
                        ? 'Disable Advanced Radar'
                        : 'Enable Advanced Radar'}
                </button>
              </div>
            </div>
          </div>

          <div className="admin-chart-container">
            <div className="admin-chart-header">
              <div>
                <h3>Query Activity</h3>
                <p className="admin-chart-subtitle">
                  {chartPeriod === '24h' && 'Real-time search volume over the last 24 hours'}
                  {chartPeriod === '7d' && 'Search volume over the last 7 days'}
                  {chartPeriod === '30d' && 'Search volume over the last 30 days'}
                </p>
              </div>
              <div className="admin-chart-period-toggle">
                <button
                  type="button"
                  className={chartPeriod === '24h' ? 'active' : ''}
                  onClick={() => handlePeriodChange('24h')}
                >
                  24h
                </button>
                <button
                  type="button"
                  className={chartPeriod === '7d' ? 'active' : ''}
                  onClick={() => handlePeriodChange('7d')}
                >
                  7d
                </button>
                <button
                  type="button"
                  className={chartPeriod === '30d' ? 'active' : ''}
                  onClick={() => handlePeriodChange('30d')}
                >
                  30d
                </button>
              </div>
            </div>
            <div className="admin-chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 10, right: 120, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245, 245, 245, 0.1)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="rgba(245, 245, 245, 0.5)"
                    tick={{ fill: 'rgba(245, 245, 245, 0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={chartPeriod === '24h' ? 0 : chartPeriod === '7d' ? 0 : 2}
                    angle={chartPeriod === '24h' ? -45 : chartPeriod === '7d' ? -45 : -45}
                    textAnchor="end"
                    height={60}
                    domain={chartPeriod === '24h' ? ['dataMin', 'dataMax'] : undefined}
                  />
                  <YAxis 
                    stroke="rgba(245, 245, 245, 0.5)"
                    tick={{ fill: 'rgba(245, 245, 245, 0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 10, 10, 0.95)',
                      border: '1px solid rgba(245, 245, 245, 0.15)',
                      borderRadius: '6px',
                      color: '#f5f5f5',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: 'rgba(245, 245, 245, 0.8)', marginBottom: '4px', fontSize: '11px' }}
                    itemStyle={{ padding: '2px 0' }}
                    cursor={{ stroke: 'rgba(245, 245, 245, 0.2)', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingLeft: '20px' }}
                    iconType="line"
                    iconSize={12}
                    formatter={(value) => <span style={{ color: 'rgba(245, 245, 245, 0.7)', fontSize: '11px' }}>{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="Total Queries"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="successful"
                    name="Successful"
                    stroke="#34d399"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    name="Failed"
                    stroke="#f87171"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="admin-chart-container" style={{ marginTop: '24px' }}>
            <div className="admin-chart-header">
              <div>
                <h3>Unique Users</h3>
                <p className="admin-chart-subtitle">
                  {uniqueUsersPeriod === '24h' && 'Unique users over the last 24 hours'}
                  {uniqueUsersPeriod === '7d' && 'Unique users over the last 7 days'}
                  {uniqueUsersPeriod === '30d' && 'Unique users over the last 30 days'}
                </p>
              </div>
              <div className="admin-chart-period-toggle">
                <button
                  type="button"
                  className={uniqueUsersPeriod === '24h' ? 'active' : ''}
                  onClick={() => handleUniqueUsersPeriodChange('24h')}
                >
                  24h
                </button>
                <button
                  type="button"
                  className={uniqueUsersPeriod === '7d' ? 'active' : ''}
                  onClick={() => handleUniqueUsersPeriodChange('7d')}
                >
                  7d
                </button>
                <button
                  type="button"
                  className={uniqueUsersPeriod === '30d' ? 'active' : ''}
                  onClick={() => handleUniqueUsersPeriodChange('30d')}
                >
                  30d
                </button>
              </div>
            </div>
            <div className="admin-chart-wrapper">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={uniqueUsersChartData} margin={{ top: 10, right: 120, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(245, 245, 245, 0.1)" vertical={false} />
                  <XAxis 
                    dataKey="label" 
                    stroke="rgba(245, 245, 245, 0.5)"
                    tick={{ fill: 'rgba(245, 245, 245, 0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    interval={uniqueUsersPeriod === '24h' ? 0 : uniqueUsersPeriod === '7d' ? 0 : 2}
                    angle={uniqueUsersPeriod === '24h' ? -45 : uniqueUsersPeriod === '7d' ? -45 : -45}
                    textAnchor="end"
                    height={60}
                    domain={uniqueUsersPeriod === '24h' ? ['dataMin', 'dataMax'] : undefined}
                  />
                  <YAxis 
                    stroke="rgba(245, 245, 245, 0.5)"
                    tick={{ fill: 'rgba(245, 245, 245, 0.6)', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10, 10, 10, 0.95)',
                      border: '1px solid rgba(245, 245, 245, 0.15)',
                      borderRadius: '6px',
                      color: '#f5f5f5',
                      fontSize: '12px',
                      padding: '8px 12px',
                    }}
                    labelStyle={{ color: 'rgba(245, 245, 245, 0.8)', marginBottom: '4px', fontSize: '11px' }}
                    itemStyle={{ padding: '2px 0' }}
                    cursor={{ stroke: 'rgba(245, 245, 245, 0.2)', strokeWidth: 1, strokeDasharray: '5 5' }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingLeft: '20px' }}
                    iconType="line"
                    iconSize={12}
                    formatter={(value) => <span style={{ color: 'rgba(245, 245, 245, 0.7)', fontSize: '11px' }}>{value}</span>}
                  />
                  <Line
                    type="monotone"
                    dataKey="unique"
                    name="Unique Users"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {enquiries.length === 0 ? (
            <div className="admin-no-data">No enquiries recorded yet.</div>
          ) : (
            <div className="admin-table">
              <div className="admin-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>RA Number</th>
                      <th>Name</th>
                      <th>Search Date</th>
                      <th>Time (IST)</th>
                      <th>Status</th>
                      <th>Room</th>
                      <th>Venue</th>
                      <th>Floor</th>
                      <th>Time (ms)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map((enquiry) => (
                      <tr key={enquiry.id}>
                        <td>{enquiry.id}</td>
                        <td className="mono">{enquiry.register_number}</td>
                        <td>{toProperCase(enquiry.student_name || '-')}</td>
                        <td>{enquiry.search_date || '-'}</td>
                        <td className="timestamp">{formatIST(enquiry.searched_at)}</td>
                        <td>
                          <span className={`admin-badge ${enquiry.results_found ? 'success' : 'danger'}`}>
                            {enquiry.results_found ? '✓ Found' : '✗ Not Found'}
                          </span>
                        </td>
                        <td className="mono">
                          {(enquiry.rooms || []).length === 0
                            ? '-'
                            : enquiry.rooms[0]}
                        </td>
                        <td className="mono">
                          {(enquiry.venues || []).length === 0
                            ? '-'
                            : enquiry.venues[0]}
                        </td>
                        <td className="mono">
                          {(enquiry.floors || []).length === 0
                            ? '-'
                            : enquiry.floors[0]}
                        </td>
                        <td className="mono">
                          {enquiry.performance_time !== null && enquiry.performance_time !== undefined
                            ? `${enquiry.performance_time}ms`
                            : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-pagination">
                <button
                  type="button"
                  className="feedfill-button secondary"
                  disabled={page <= 1 || refreshing}
                  onClick={() => fetchEnquiries(true, page - 1)}
                >
                  Previous
                </button>
                <span className="admin-page-info">
                  Page {page} of {totalPages} · Showing {(page - 1) * PAGE_SIZE + 1} –{' '}
                  {Math.min(page * PAGE_SIZE, boundedCount)} of {boundedCount} records
                </span>
                <button
                  type="button"
                  className="feedfill-button secondary"
                  disabled={page >= totalPages || refreshing}
                  onClick={() => fetchEnquiries(true, page + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Feedback Section */}
          <div className="admin-chart-container" style={{ marginTop: '40px' }}>
            <div className="admin-chart-header">
              <div>
                <h3>User Feedback</h3>
                <p className="admin-chart-subtitle">
                  Feedback submitted by users via the feedback ribbon
                </p>
              </div>
            </div>
            {feedbackLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Loading feedback...
              </div>
            ) : feedback.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                No feedback submitted yet.
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Total: {feedbackTotalCount} feedback entries
                </div>
                <div style={{ 
                  background: 'var(--card-bg)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Feedback
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Register Number
                        </th>
                        <th style={{ 
                          padding: '12px 16px', 
                          textAlign: 'left', 
                          fontSize: '11px', 
                          fontWeight: 600, 
                          color: 'var(--text-secondary)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em'
                        }}>
                          Submitted At
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedback.map((item) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ 
                            padding: '16px', 
                            fontSize: '13px', 
                            color: 'var(--text-primary)',
                            wordBreak: 'break-word',
                            maxWidth: '400px'
                          }}>
                            {item.feedback}
                          </td>
                          <td style={{ 
                            padding: '16px', 
                            fontSize: '13px', 
                            color: 'var(--text-secondary)',
                            fontFamily: 'monospace'
                          }}>
                            {item.register_number || '-'}
                          </td>
                          <td style={{ 
                            padding: '16px', 
                            fontSize: '12px', 
                            color: 'var(--text-secondary)'
                          }}>
                            {item.created_at ? new Date(item.created_at).toLocaleString() : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {feedbackTotalCount > 50 && (
                  <div className="admin-pagination" style={{ marginTop: '16px' }}>
                    <button
                      type="button"
                      className="feedfill-button secondary"
                      disabled={feedbackPage <= 1 || feedbackLoading}
                      onClick={() => fetchFeedback(feedbackPage - 1)}
                    >
                      Previous
                    </button>
                    <span className="admin-page-info">
                      Page {feedbackPage} of {Math.ceil(feedbackTotalCount / 50)} · Showing {(feedbackPage - 1) * 50 + 1} –{' '}
                      {Math.min(feedbackPage * 50, feedbackTotalCount)} of {feedbackTotalCount} entries
                    </span>
                    <button
                      type="button"
                      className="feedfill-button secondary"
                      disabled={feedbackPage >= Math.ceil(feedbackTotalCount / 50) || feedbackLoading}
                      onClick={() => fetchFeedback(feedbackPage + 1)}
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {/* GroupGrid Visits Section */}
      <section className="admin-section" style={{ marginTop: '40px' }}>
        <div className="admin-section-header">
          <h2>GroupGrid Visits</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select
              value={24}
              onChange={(e) => fetchGroupGridVisits(1, parseInt(e.target.value))}
              style={{
                padding: '6px 12px',
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                color: 'var(--text-primary)',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              <option value={24}>Last 24 hours</option>
              <option value={168}>Last 7 days</option>
              <option value={720}>Last 30 days</option>
            </select>
            <button
              type="button"
              className="feedfill-button"
              onClick={() => fetchGroupGridVisits(groupgridVisitsPage)}
              disabled={groupgridVisitsLoading || manualRefreshInFlight}
            >
              {groupgridVisitsLoading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
        <div className="admin-stats-grid" style={{ marginBottom: '24px' }}>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Total Visits</div>
            <div className="admin-stat-value">{groupgridVisitsTotal.toLocaleString()}</div>
          </div>
          <div className="admin-stat-card">
            <div className="admin-stat-label">Unique RAs</div>
            <div className="admin-stat-value">{groupgridVisitsUniqueRAs.toLocaleString()}</div>
          </div>
        </div>
        <div className="admin-card">
          {groupgridVisitsLoading ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Loading GroupGrid visits...
            </div>
          ) : groupgridVisits.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              No GroupGrid visits recorded yet.
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Total: {groupgridVisitsTotal} visits · Unique RAs: {groupgridVisitsUniqueRAs}
              </div>
              <div style={{ 
                background: 'var(--card-bg)', 
                border: '1px solid var(--border-color)', 
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Register Number
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Visited At
                      </th>
                      <th style={{ 
                        padding: '12px 16px', 
                        textAlign: 'left', 
                        fontSize: '11px', 
                        fontWeight: 600, 
                        color: 'var(--text-secondary)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        IP Address
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {groupgridVisits.map((item, idx) => (
                      <tr key={item.id || idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                        <td style={{ 
                          padding: '16px', 
                          fontSize: '13px', 
                          color: 'var(--text-primary)',
                          fontFamily: 'monospace'
                        }}>
                          {item.register_number || '-'}
                        </td>
                        <td style={{ 
                          padding: '16px', 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)'
                        }}>
                          {item.visited_at ? new Date(item.visited_at).toLocaleString() : '-'}
                        </td>
                        <td style={{ 
                          padding: '16px', 
                          fontSize: '12px', 
                          color: 'var(--text-secondary)',
                          fontFamily: 'monospace'
                        }}>
                          {item.ip_address || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {groupgridVisitsTotal > 50 && (
                <div className="admin-pagination" style={{ marginTop: '16px' }}>
                  <button
                    type="button"
                    className="feedfill-button secondary"
                    disabled={groupgridVisitsPage <= 1 || groupgridVisitsLoading}
                    onClick={() => fetchGroupGridVisits(groupgridVisitsPage - 1)}
                  >
                    Previous
                  </button>
                  <span className="admin-page-info">
                    Page {groupgridVisitsPage} of {Math.ceil(groupgridVisitsTotal / 50)} · Showing {(groupgridVisitsPage - 1) * 50 + 1} –{' '}
                    {Math.min(groupgridVisitsPage * 50, groupgridVisitsTotal)} of {groupgridVisitsTotal} entries
                  </span>
                  <button
                    type="button"
                    className="feedfill-button secondary"
                    disabled={groupgridVisitsPage >= Math.ceil(groupgridVisitsTotal / 50) || groupgridVisitsLoading}
                    onClick={() => fetchGroupGridVisits(groupgridVisitsPage + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

