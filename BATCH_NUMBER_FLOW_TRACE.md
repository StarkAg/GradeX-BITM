# Batch Number Flow Trace

This document traces the exact flow of how the batch number goes from backend to the schedule HTML display.

## Flow Overview

```
Backend (Go) → Frontend API Call → State Update → TimetableGrid Component → HTML Display
```

## Step-by-Step Flow

### 1. Backend Extraction (Go - `gradex-backend/src/srm/scrapers.go`)

**Location:** `parseTimetableHTML()` function

**Process:**
- Extracts batch from HTML using CSS selector: `#zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > strong > font`
- Falls back to table row 2, column 2 if CSS selector doesn't match
- Stores in `batchNumber` variable (string: "1" or "2")
- Returns in `TimetableResult` struct with JSON tag `json:"batchNumber"`

**Log:** `[Batch] ✓ Extracted from table row 2, col 2: batchNumber=2, batch=Batch: 2`

### 2. Backend API Response (`gradex-backend/main.go`)

**Location:** `handleTimetable()` function

**Process:**
- Converts `TimetableResult` struct to JSON
- Returns: `{ "success": true, "timetable": { "batchNumber": "2", ... } }`
- Field name in JSON: `batchNumber` (camelCase)

### 3. Frontend API Call (`src/components/Timetable.jsx`)

**Location:** `fetchTimetableFromSRM()` function (line ~320)

**Process:**
- Fetches from: `GET /api/srm/timetable?userId=xxx`
- Receives JSON response
- Parses: `const timetable = await timetableResponse.json()`

**Log:** `[Timetable] ===== BATCH NUMBER FLOW TRACE =====`
- Shows all batch-related fields from response
- Shows raw batchValue extracted
- Shows parsing steps

### 4. Batch Number Extraction (`src/components/Timetable.jsx`)

**Location:** `fetchTimetableFromSRM()` function (line ~461-488)

**Code:**
```javascript
const batchValue = timetable.batchNumber || timetable.batch_number || null;
let batchNum = 1; // Default fallback
if (batchValue !== null && batchValue !== undefined && batchValue !== '') {
  if (typeof batchValue === 'string') {
    const parsed = parseInt(batchValue, 10);
    if (!isNaN(parsed) && parsed > 0) {
      batchNum = parsed;
    }
  } else if (typeof batchValue === 'number' && batchValue > 0) {
    batchNum = batchValue;
  }
}
setSelectedBatch(batchNum);
```

**Log:** 
- `[Timetable] Step 1-6:` Shows each step of extraction
- `[Timetable] Final parsed batchNum: 2, setting selectedBatch to: 2`

### 5. State Update (`src/components/Timetable.jsx`)

**Location:** Line 228 (initial state), Line 488 (update)

**Initial State:**
```javascript
const [selectedBatch, setSelectedBatch] = useState(1); // Defaults to 1
```

**Update:**
```javascript
setSelectedBatch(batchNum); // Updates to actual batch from backend
```

**Note:** Component initially renders with `selectedBatch = 1`, then updates when data loads.

### 6. TimetableGrid Component (`src/components/Timetable.jsx`)

**Location:** `TimetableGrid()` function (line 64)

**Props Received:**
```javascript
<TimetableGrid timetable={timetable} studentInfo={studentInfo} selectedBatch={selectedBatch} />
```

**Log:** `[TimetableGrid] ===== BATCH DISPLAY FLOW TRACE =====`
- Shows selectedBatch prop received
- Shows conversion steps
- Shows final batchNumber for display

### 7. Batch Number Display (`src/components/Timetable.jsx`)

**Location:** `TimetableGrid()` function (line 70-89)

**Code:**
```javascript
let batchNumber = '1'; // Default
if (selectedBatch !== null && selectedBatch !== undefined) {
  const batchStr = String(selectedBatch);
  if (batchStr === '1' || batchStr === '2') {
    batchNumber = batchStr;
  }
}
```

**Display:**
```javascript
<div className="timetable-subtitle">
  {academicYear} | Batch: {batchNumber} | {studentName}
</div>
```

**Log:** `[TimetableGrid] Step 5: Final batchNumber for display: 2`

## Potential Issues

1. **Initial Render:** Component shows "Batch: 1" initially because `useState(1)` defaults to 1
2. **Cache:** If using cached data, might have old batch number
3. **Type Mismatch:** Backend returns string "2", frontend might expect number 2
4. **Timing:** State update might not trigger re-render immediately

## Debugging

Check browser console for these logs:
- `[Timetable] ===== BATCH NUMBER FLOW TRACE =====` - Shows backend response
- `[TimetableGrid] ===== BATCH DISPLAY FLOW TRACE =====` - Shows display logic

## Expected Flow for Batch 2

1. Backend extracts: `batchNumber = "2"`
2. API returns: `{ "timetable": { "batchNumber": "2" } }`
3. Frontend extracts: `batchValue = "2"` → `batchNum = 2`
4. State updates: `selectedBatch = 2`
5. TimetableGrid receives: `selectedBatch = 2`
6. Display shows: `"Batch: 2"`

## If Showing "Batch: 1" Instead

Check console logs to see:
- What backend returned (`Step 1-2`)
- What was extracted (`Step 3-4`)
- What was set in state (`Step 5-6`)
- What TimetableGrid received (`TimetableGrid Step 1`)
- What is displayed (`TimetableGrid Step 5`)

