# Data Fetching Flow - Step by Step

## Overview
This document explains exactly how data is fetched from the SRM exam cell endpoints, step by step.

---

## High-Level Flow

```
User Search Request
    ↓
Frontend (SeatFinder.jsx)
    ↓
API Endpoint (/api/seating)
    ↓
getSeatingInfo() in seating-utils.js
    ↓
For Each Campus: fetchCampusSeating()
    ↓
Parse HTML & Return Results
```

---

## Detailed Step-by-Step Process

### **STEP 1: Frontend Request** (`SeatFinder.jsx`)

1. User enters RA number (e.g., `RA2311003012253`)
2. User selects/enters date (e.g., `24/11/2025`)
3. Frontend calls: `GET /api/seating?ra=RA2311003012253&date=24-11-2025`
4. Frontend also fetches student name in parallel from `/api/get-name-by-last-digits`

**Time:** ~0ms (client-side)

---

### **STEP 2: API Handler** (`api/seating.js`)

1. Validates RA number
2. Checks bot protection (rate limiting, sequential pattern detection)
3. Calls `getSeatingInfo(ra, date)`

**Time:** ~1-5ms

---

### **STEP 3: Main Function** (`getSeatingInfo()` in `seating-utils.js`)

#### **3.1: Load Student Name** (Lines 1414-1517)
- **Purpose:** Pre-load student name from JSON/Supabase
- **Steps:**
  1. Try to load student data map from JSON file (cached in memory)
  2. Lookup RA in the map
  3. If not found, try direct Supabase query
- **Time:** ~10-50ms (if cached) or ~200-500ms (if Supabase query)

#### **3.2: Check Cache** (Lines 1519-1533)
- **Purpose:** Return cached result if available (60-second TTL)
- **Time:** ~1ms

#### **3.3: Generate Date Variants** (Line 1536)
- **Purpose:** Create multiple date formats to match server responses
- **Example:** `24-11-2025` → `['24-11-2025', '24/11/2025', '2025-11-24']`
- **Time:** ~1ms

#### **3.4: Fetch All Campuses** (Lines 1538-1576)
- **Purpose:** Fetch seating data from each campus sequentially
- **Campuses:** Main Campus, Tech Park, Tech Park 2, Biotech & Architecture, University Building
- **Optimization:** Early exit if RA found (stops checking other campuses)
- **Time:** Depends on which campus has the data (see Step 4)

---

### **STEP 4: Fetch Single Campus** (`fetchCampusSeating()` in `seating-utils.js`)

This is called **once per campus** (5 campuses total, but stops early if RA found).

#### **4.1: Polite Delay** (Lines 752-754)
- **Purpose:** Prevent server overload
- **Action:** Wait 300-700ms (random)
- **Time:** ~300-700ms

#### **4.2: Try Both Sessions** (Lines 763-818)
- **Purpose:** Check both Forenoon (FN) and Afternoon (AN) sessions
- **Sessions:** `['FN', 'AN']`
- **Loop:** Sequential (one after another)

For **each session** (FN, then AN):

##### **4.2.1: Format Date** (Lines 773-776)
- Convert date to `DD/MM/YYYY` format
- **Time:** ~1ms

##### **4.2.2: Create POST Request** (Lines 778-782)
- Build form data:
  ```
  dated=24/11/2025
  session=FN (or AN)
  submit=Submit
  ```
- **Time:** ~1ms

##### **4.2.3: POST to fetch_data.php** (Lines 785-793)
- **URL:** `https://examcell.srmist.edu.in/{campus}/seating/bench/fetch_data.php`
- **Method:** POST
- **Timeout:** 12 seconds
- **Retries:** 1 retry on failure
- **Time:** ~500-3000ms (depends on server response)

##### **4.2.4: Validate Response** (Lines 795-811)
- Check if HTML contains RA numbers
- Check if HTML contains target RA
- If valid (length > 5000 and has RA pattern), save HTML
- **Early Exit:** If target RA found in Forenoon, skip Afternoon
- **Time:** ~10-50ms

#### **4.3: Merge HTML Sources** (Lines 821-825)
- **Purpose:** Combine HTML from both sessions (if both returned data)
- **Time:** ~1ms

#### **4.4: Parse HTML** (Line 843)
- **Function:** `findMatchesInHTML(html, ra, dateVariants)`
- **Purpose:** Extract seating information from HTML
- **Time:** ~50-200ms (depends on HTML size)

#### **4.5: Return Matches** (Lines 856-860)
- Map results with campus name and URL
- **Time:** ~1ms

**Total Time per Campus:** ~900-4000ms (300-700ms delay + 2 sessions × 500-3000ms + parsing)

---

### **STEP 5: Parse HTML** (`findMatchesInHTML()` in `seating-utils.js`)

#### **5.1: Extract Table Rows** (Lines 232-300)
- Find all `<tr>` elements in HTML
- **Time:** ~10-50ms

#### **5.2: For Each Row:**
- Extract RA number
- Extract room/hall name
- Extract seat/bench number
- Extract department
- Extract session (FN/AN)
- Match against target RA
- **Time per row:** ~1-5ms

#### **5.3: Filter Duplicates** (Lines 519-532)
- Remove duplicate entries (same RA + session)
- **Time:** ~10-50ms

**Total Parsing Time:** ~50-200ms

---

### **STEP 6: Enhance Results** (Lines 1578-1589)

- Add student name from pre-loaded data
- Add department information
- **Time:** ~1-10ms per match

---

### **STEP 7: Cache & Return** (Lines 1591-1601)

- Cache result for 60 seconds
- Return final response to frontend
- **Time:** ~1ms

---

## Current Timing Breakdown

### **Best Case (RA found in first campus, first session):**
- Student name load: ~10ms (cached)
- Campus 1 delay: ~300ms
- Session FN POST: ~500ms
- Parse HTML: ~50ms
- **Total: ~860ms**

### **Average Case (RA found in second campus):**
- Student name load: ~10ms
- Campus 1: ~300ms delay + ~2000ms (both sessions) = ~2300ms
- Campus 2: ~300ms delay + ~500ms (first session) = ~800ms
- **Total: ~3110ms**

### **Worst Case (RA found in last campus):**
- Student name load: ~10ms
- Campus 1-4: ~4 × 2300ms = ~9200ms
- Campus 5: ~800ms
- **Total: ~10010ms (~10 seconds)**

---

## Current Bottlenecks

1. **Sequential Campus Fetching:** Each campus waits for previous to complete
2. **Polite Delays:** 300-700ms delay before each campus
3. **Sequential Sessions:** Forenoon then Afternoon (not parallel)
4. **12-second Timeout:** Each POST can take up to 12 seconds
5. **Early Exit Only After Full Campus:** Must complete both sessions before checking if RA found

---

## Optimization Opportunities

1. **Parallel Campus Fetching:** Fetch all campuses simultaneously
2. **Remove/Reduce Delays:** Reduce 300-700ms delays
3. **Parallel Sessions:** Fetch FN and AN simultaneously
4. **Early Exit Per Session:** Exit immediately when RA found in first session
5. **Reduce Timeout:** Lower 12s timeout to fail faster
6. **Skip Afternoon by Default:** Only fetch Afternoon if Forenoon fails

---

## Current Flow Diagram

```
getSeatingInfo()
    ↓
Load Student Name (10-500ms)
    ↓
Check Cache (1ms)
    ↓
Generate Date Variants (1ms)
    ↓
For Each Campus (Sequential):
    ├─ Wait 300-700ms (polite delay)
    ├─ For Each Session (FN, then AN):
    │   ├─ POST to fetch_data.php (500-3000ms)
    │   ├─ Validate response (10-50ms)
    │   └─ If RA found in FN, skip AN
    ├─ Merge HTML (1ms)
    ├─ Parse HTML (50-200ms)
    └─ If RA found, BREAK (stop other campuses)
    ↓
Enhance Results (1-10ms)
    ↓
Cache & Return (1ms)
```

---

## Key Functions Reference

- `getSeatingInfo(ra, date)` - Main entry point
- `fetchCampusSeating(campusName, ra, dateVariants)` - Fetches one campus
- `fetchPage(url, timeout, retries, options)` - HTTP fetch with retry
- `findMatchesInHTML(html, ra, dateVariants)` - Parses HTML for matches
- `extractSeatingRows(html, targetRA)` - Extracts table rows from HTML

---

## Endpoints Used

Each campus uses:
- **POST:** `https://examcell.srmist.edu.in/{campus}/seating/bench/fetch_data.php`
  - Body: `dated=DD/MM/YYYY&session=FN|AN&submit=Submit`

Where `{campus}` is one of:
- `main` (Main Campus)
- `tp` (Tech Park)
- `tp2` (Tech Park 2)
- `bio` (Biotech & Architecture)
- `ub` (University Building)

