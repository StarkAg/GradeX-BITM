# Timetable Generation Flow - Complete Logic

This document traces the complete flow of how the timetable is generated from backend data to HTML display.

## Overview Flow

```
Backend (Go) → API Response → Frontend Fetch → Course Processing → Slot Resolution → Grid Rendering → HTML Display
```

---

## Step 1: Backend Data Extraction (Go Backend)

**File:** `gradex-backend/src/srm/scrapers.go`

### 1.1 HTML Parsing
- Fetches HTML from SRM portal: `My_Time_Table_2023_24`
- Parses HTML using `goquery` library
- Extracts student info, courses, and batch number

### 1.2 Batch Extraction
```go
// Extracts batch from HTML table
// CSS Selector: #zc-viewcontainer_My_Time_Table_2023_24 > div > div.cntdDiv > div > table:nth-child(1) > tbody > tr:nth-child(2) > td:nth-child(2) > strong > font
// Falls back to: table row 2, column 2
batchNumber = "2" // Extracted as string
```

### 1.3 Course Extraction
```go
// Extracts courses from HTML table
courses = [
  {
    code: "21CSC303J",
    title: "Software Engineering and Project Management",
    slot: "P37-P38",
    room: "TP616",
    faculty: "Dr. S. Ramesh",
    ...
  },
  ...
]
```

### 1.4 Response Structure
```json
{
  "success": true,
  "timetable": {
    "batchNumber": "2",
    "batch": "Batch: 2",
    "studentName": "SRIANSU PATRA",
    "academicYear": "AY2025-26-EVEN",
    "regNumber": "RA2311003012212",
    "courses": [
      {
        "code": "21CSC303J",
        "title": "Software Engineering and Project Management",
        "slot": "P37-P38",
        "room": "TP616",
        ...
      }
    ]
  }
}
```

---

## Step 2: Frontend Data Fetching

**File:** `src/components/Timetable.jsx` - `fetchTimetableFromSRM()`

### 2.1 API Call
```javascript
const timetableUrl = API_ENDPOINTS.timetable(userId);
const timetableResponse = await fetch(timetableUrl);
const timetableData = await timetableResponse.json();
```

### 2.2 Data Extraction
```javascript
const timetable = timetableData.timetable;

// Extract student info
const studentInfo = {
  Name: timetable.studentName,
  'Academic Year': timetable.academicYear,
  'Combo / Batch': timetable.batch,
  'RegNumber': timetable.regNumber
};

// Extract courses
const coursesArray = timetable.courses || timetable.Courses;

// Extract batch number
const batchNum = parseInt(timetable.batchNumber || '1', 10);
```

### 2.3 Course Formatting
```javascript
const formattedCourses = coursesArray.map(course => ({
  courseCode: course.code,
  courseName: course.title,
  slotCode: course.slot,        // e.g., "P37-P38"
  room: course.room,
  category: course.category,
  faculty: course.faculty
}));

setCourses(formattedCourses);
setSelectedBatch(batchNum);
setStudentInfo(studentInfo);
```

**State Updates:**
- `courses` = Array of formatted courses
- `selectedBatch` = Batch number (1 or 2)
- `studentInfo` = Student information object

---

## Step 3: Slot Mapping Loading

**File:** `src/components/Timetable.jsx` - `useEffect` hook

### 3.1 Load Slot Mappings
```javascript
useEffect(() => {
  const cacheBuster = `?v=${Date.now()}`;
  Promise.all([
    fetch(`/batch1_slots.json${cacheBuster}`, { cache: 'no-store' }),
    fetch(`/batch2_slots.json${cacheBuster}`, { cache: 'no-store' })
  ]).then(([batch1, batch2]) => {
    setBatch1Slots(batch1);
    setBatch2Slots(batch2);
  });
}, []);
```

### 3.2 Slot Mapping Structure
```json
// batch2_slots.json
{
  "P37-P38": [
    { "day": 4, "period": 7 },
    { "day": 4, "period": 8 }
  ],
  "A": [
    { "day": 1, "period": 6 },
    { "day": 1, "period": 7 },
    ...
  ],
  ...
}
```

**State Updates:**
- `batch1Slots` = Object mapping slot codes to time slots
- `batch2Slots` = Object mapping slot codes to time slots

---

## Step 4: Timetable Resolution

**File:** `src/components/Timetable.jsx` - `useEffect` hook (line 793)

### 4.1 Batch Inversion for Slot Mapping
```javascript
useEffect(() => {
  if (courses.length > 0 && batch1Slots && batch2Slots) {
    // INVERT batch for slot mapping
    // If SRM shows Batch 1, use Batch 2 slots (and vice versa)
    const slotMappingBatch = selectedBatch === 1 ? 2 : 1;
    
    // Resolve courses to timetable grid
    const resolved = resolveSlotsToTimetable(
      courses, 
      slotMappingBatch,  // Inverted batch
      batch1Slots, 
      batch2Slots
    );
    
    setTimetable(resolved);
  }
}, [courses, selectedBatch, batch1Slots, batch2Slots]);
```

**Example:**
- SRM shows: Batch 2
- `selectedBatch` = 2
- `slotMappingBatch` = 1 (inverted)
- Uses: `batch1Slots` for slot mapping

---

## Step 5: Slot Resolution Logic

**File:** `src/utils/slotResolver.js` - `resolveSlotsToTimetable()`

### 5.1 Initialize Grid
```javascript
// Create 5×12 matrix (5 days, 12 periods)
const timetable = Array(5)
  .fill(null)
  .map(() => Array(12).fill(null));
```

### 5.2 Select Slot Mapping
```javascript
// Choose correct slot mapping based on batch
const slotMapping = batch === 1 ? batch1Slots : batch2Slots;
```

### 5.3 Process Each Course
```javascript
for (const course of courses) {
  // Step 1: Normalize slot code
  const slotCode = normalizeSlotCode(course.slotCode);
  // "P37-P38-" → "P37-P38"
  
  // Step 2: Direct lookup
  let timeSlots = slotMapping[slotCode];
  // slotMapping["P37-P38"] → [{ day: 4, period: 7 }, { day: 4, period: 8 }]
  
  // Step 3: If not found, try splitting hyphenated slots
  if (!timeSlots && slotCode.includes('-')) {
    const parts = slotCode.split('-'); // ["P37", "P38"]
    const slots1 = slotMapping[part1];
    const slots2 = slotMapping[part2];
    // Combine slots if found
    if (slots1 || slots2) {
      timeSlots = [...(slots1 || []), ...(slots2 || [])];
      // Remove duplicates
    }
  }
  
  // Step 4: Place course in timetable grid
  for (const timeSlot of timeSlots) {
    const dayIndex = timeSlot.day - 1;    // 4 → 3 (0-indexed)
    const periodIndex = timeSlot.period - 1; // 7 → 6 (0-indexed)
    
    if (timetable[dayIndex][periodIndex] === null) {
      // Empty cell - place course
      timetable[dayIndex][periodIndex] = {
        courseCode: course.courseCode,
        courseName: course.courseName,
        slotCode: course.slotCode,
        room: course.room
      };
    } else {
      // Conflict - create array of courses
      timetable[dayIndex][periodIndex] = [
        existing,
        newCourse
      ];
    }
  }
}
```

### 5.4 Normalize Slot Code
```javascript
function normalizeSlotCode(slotCode) {
  let normalized = slotCode.trim().toUpperCase();
  normalized = normalized.replace(/-+$/, '');  // Remove trailing hyphens
  normalized = normalized.replace(/\s*-\s*/g, '-'); // Normalize hyphens
  return normalized;
}
```

**Result:**
```javascript
// timetable[3][6] = Day 4, Period 7
// timetable[3][7] = Day 4, Period 8
timetable = [
  [null, null, ..., course1, course1, ...],  // Day 1
  [null, null, ..., ...],                      // Day 2
  [null, null, ..., ...],                      // Day 3
  [null, null, ..., course2, course2, ...],  // Day 4 (P37-P38)
  [null, null, ..., ...]                       // Day 5
]
```

---

## Step 6: Grid Rendering

**File:** `src/components/Timetable.jsx` - `TimetableGrid()` component

### 6.1 Batch Display
```javascript
// Extract batch number for display (NOT inverted)
let batchNumber = String(selectedBatch); // "2"
// Display: "AY2025-26-EVEN | Batch: 2 | Sriansu Patra"
```

### 6.2 Grid Structure
```javascript
<div className="timetable-grid">
  {/* Header row */}
  <div>Time</div>
  {TIME_SLOTS.map(slot => <div>Slot {slot.period}</div>)}
  
  {/* Day rows */}
  {DAYS.map((day, dayIndex) => (
    <div className="timetable-day-row">
      <div>{day}</div>
      {TIME_SLOTS.map((slot, periodIndex) => {
        const cell = timetable[dayIndex]?.[periodIndex];
        // Render cell content
      })}
    </div>
  ))}
</div>
```

### 6.3 Cell Rendering
```javascript
const cell = timetable[dayIndex]?.[periodIndex];
const isEmpty = cell === null || cell === undefined;
const isConflict = Array.isArray(cell);
const displayCell = isConflict ? cell[0] : cell;

// Render cell
<div className="timetable-cell">
  {!isEmpty && displayCell && (
    <div className="timetable-cell-content">
      <div className="timetable-course-name">
        {displayCell.courseName}
      </div>
      <div className="timetable-room-number">
        {displayCell.room}
      </div>
    </div>
  )}
</div>
```

---

## Complete Flow Example

### Input Data:
```json
{
  "batchNumber": "2",
  "courses": [
    {
      "code": "21CSC303J",
      "title": "Software Engineering and Project Management",
      "slot": "P37-P38",
      "room": "TP616"
    }
  ]
}
```

### Processing Steps:

1. **Backend extracts:** `batchNumber = "2"`, `slot = "P37-P38"`

2. **Frontend receives:** `selectedBatch = 2`, `slotCode = "P37-P38"`

3. **Batch inversion:** `slotMappingBatch = 1` (2 → 1)

4. **Slot mapping lookup:** `batch1Slots["P37-P38"]` → NOT FOUND

5. **Try batch2Slots:** `batch2Slots["P37-P38"]` → `[{day: 4, period: 7}, {day: 4, period: 8}]`

6. **Wait!** Since we inverted to batch 1, we're using `batch1Slots`, but `P37-P38` is in `batch2Slots`!

**This is the bug!** The inversion logic uses the wrong slot mapping.

### Correct Flow Should Be:

If SRM shows Batch 2:
- Display: "Batch: 2" ✓
- Slot mapping: Use `batch2Slots` (NOT inverted) ✓

The inversion was added incorrectly. We should use the batch as-is for slot mapping.

---

## Key Points

1. **Backend** extracts batch and courses from HTML
2. **Frontend** receives JSON response
3. **Slot mappings** loaded from JSON files (`batch1_slots.json`, `batch2_slots.json`)
4. **Slot resolution** maps course slot codes to day/period positions
5. **Grid rendering** displays courses in 5×12 matrix
6. **Batch inversion** is currently applied incorrectly - should use batch as-is

---

## Debugging Logs

Check browser console for:
- `[Timetable] Loading slot mappings...`
- `[SlotResolver] Using batch X slot mapping...`
- `[SlotResolver] Processing course... with slotCode...`
- `[SlotResolver] Direct lookup for "P37-P38": Found/NOT FOUND`
- `Resolving timetable: SRM shows Batch X, using Batch Y slot mappings`

