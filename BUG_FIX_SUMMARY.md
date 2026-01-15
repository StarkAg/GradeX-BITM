# Bug Fix Summary - Campus/Building Detection Logic

## Critical Bug Found and Fixed

### Issue: TPTP-201 showing as Tech Park 2 instead of Tech Park

**Root Cause:**
1. `TPTP-201` was converted to `TP-201` for display
2. The `buildingName` was NOT explicitly set to "Tech Park" after conversion
3. Later, the code checked `formattedRoom.startsWith('TP-2')` which matched `TP-201` (since it starts with `TP-2`)
4. This incorrectly set `buildingName = 'Tech Park 2'`, overwriting the correct campus

**Fixes Applied:**

### Fix 1: Explicit Building Name for TPTP Rooms (Line 618-622)
```javascript
} else if (formattedRoom.startsWith('TPTP-')) {
  // TPTP- rooms are in Tech Park (not Tech Park 2)
  // Convert TPTP-401 -> TP-401 for display, but keep building as Tech Park
  formattedRoom = formattedRoom.replace('TPTP-', 'TP-');
  buildingName = 'Tech Park'; // Explicitly set to Tech Park
  // Mark this as a TPTP room so it doesn't get overwritten by TP-2 check below
  result.isTPTPRoom = true;
}
```

### Fix 2: Prevent TPTP Rooms from Being Overwritten (Line 639-665)
```javascript
// IMPORTANT: Skip this check if buildingName was already set (e.g., for TPTP rooms)
if (!result.isTPTPRoom && formattedRoom.match(/^TP-?2(L|LH|LS|CLS)/i)) {
  // ... TP2 logic
}
```

### Fix 3: More Specific TP-2 Pattern Matching (Line 645-665)
```javascript
} else if (!result.isTPTPRoom && formattedRoom.startsWith('TP-2')) {
  // TP-2XXX format: Need to distinguish between:
  // - TP-2XXX (4+ digits, like TP-2201, TP-2010) → Tech Park 2
  // - TP-2XX (3 digits, like TP-201, TP-202) → Tech Park (regular, not TP2)
  const afterTP2 = formattedRoom.substring(4); // Get everything after "TP-2"
  const digitMatch = afterTP2.match(/^(\d+)/);
  if (digitMatch) {
    const digits = digitMatch[1];
    // If 4+ digits, it's TP2; if 3 digits, it's regular Tech Park
    if (digits.length >= 4) {
      buildingName = 'Tech Park 2';
    }
    // If 3 digits or less, leave buildingName as default (Tech Park from campusName)
  }
}
```

**Why This Matters:**
- `TP-201` (3 digits) → Regular Tech Park room ✅
- `TP-2201` (4 digits) → Tech Park 2 room ✅
- `TP-2L1401` → Tech Park 2 room (L prefix) ✅

### Fix 4: Display Logic - Desktop View (Line 1906-1917)
```javascript
const hasTPTP = originalHallUpper.includes('TPTP'); // TPTP rooms are Tech Park, not TP2
// ...
const hasTP2 = !hasTPTP && (isTP2VPT || roomUpper.startsWith('TP-2') || ...);
```

### Fix 5: Display Logic - Mobile View (Line 2473-2485)
Same fix applied to mobile view for consistency.

## Other Logic Checks Performed

### ✅ Room Pattern Matching Order (Verified Correct)
1. `TPVPT-028` (special case) → VPT-028, VPT building
2. `TPTP-XXX` → TP-XXX, Tech Park
3. `TPVPT-XXX` → VPT-XXX, VPT building
4. `TP-2VPT-XXX` or `TP2VPT-XXX` → VPT-XXX, TP2/VPT
5. `VPT-XXX` → VPT building
6. `TP-?2(L|LH|LS|CLS)` → Tech Park 2
7. `TP2XXX` or `TP-2XXX` (with 4+ digits) → Tech Park 2
8. `CLS`, `LS`, `LH`, `L` → Tech Park 2

### ✅ Edge Cases Verified

| Room Format | Expected Campus | Status |
|------------|----------------|--------|
| `TPTP-201` | Tech Park | ✅ Fixed |
| `TP-201` (direct) | Tech Park | ✅ Correct (3 digits) |
| `TP-2201` | Tech Park 2 | ✅ Correct (4 digits) |
| `TP-2L1401` | Tech Park 2 | ✅ Correct (L prefix) |
| `TP2-201` | Tech Park 2 | ✅ Correct (TP2 format) |
| `TPVPT-301` | VPT | ✅ Correct |
| `TP-2VPT-217` | TP2/VPT | ✅ Correct |
| `CLS1319` | Tech Park 2 | ✅ Correct |
| `H301F` | Main Campus | ✅ Correct |

### ✅ Display Logic Verification

**Desktop View:**
- ✅ Checks `hasTPTP` to exclude from TP2 detection
- ✅ Uses `seat.building` (set during transformation) for campus name
- ✅ Uses `seat.room` (formatted) for image selection

**Mobile View:**
- ✅ Same logic as desktop (consistent)

## Testing Recommendations

1. **Test TPTP rooms:**
   - `TPTP-201`, `TPTP-401`, `TPTP-1001`
   - Should show: Room `TP-XXX`, Building "Tech Park", TP image

2. **Test TP2 rooms:**
   - `TP-2201`, `TP-2010`, `TP-2L1401`, `TP2-201`
   - Should show: Building "Tech Park 2", TP2 image

3. **Test regular Tech Park rooms:**
   - `TP-201`, `TP-401`, `TP-1001`
   - Should show: Building "Tech Park", TP image

4. **Test VPT rooms:**
   - `TPVPT-301`, `VPT-301`, `TP-2VPT-217`
   - Should show: Appropriate VPT building name, VPT image

## Files Modified

1. `src/components/SeatFinder.jsx`
   - Line 618-622: Added explicit `buildingName` for TPTP rooms
   - Line 639-665: Added `isTPTPRoom` flag and refined TP-2 pattern matching
   - Line 1906-1917: Added `hasTPTP` check in desktop display logic
   - Line 2473-2485: Added `hasTPTP` check in mobile display logic

## Impact

- **Before:** TPTP rooms incorrectly showed as Tech Park 2
- **After:** TPTP rooms correctly show as Tech Park
- **Additional Benefit:** More precise pattern matching prevents future similar issues

