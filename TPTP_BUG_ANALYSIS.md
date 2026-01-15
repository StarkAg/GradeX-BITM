# TPTP Bug Analysis - Which Rooms Are Affected?

## The Bug Pattern

The bug occurs when:
1. A room starts with `TPTP-`
2. After conversion to `TP-XXX` format
3. The converted room starts with `TP-2` (the check was `formattedRoom.startsWith('TP-2')`)

## Affected Room Numbers

### ✅ AFFECTED (Would show as Tech Park 2 incorrectly):
- `TPTP-201`, `TPTP-202`, `TPTP-203`, ... `TPTP-299` (3-digit numbers starting with 2)
- `TPTP-2001`, `TPTP-2010`, `TPTP-2201`, ... (4+ digit numbers starting with 2)
- `TPTP-2L1401`, `TPTP-2LH1005` (with letter prefix after 2)

**Pattern:** Any TPTP room where the number part starts with `2`

### ✅ NOT AFFECTED (Would show correctly as Tech Park):
- `TPTP-101`, `TPTP-102`, ... `TPTP-199` (3-digit numbers starting with 1)
- `TPTP-301`, `TPTP-302`, ... `TPTP-399` (3-digit numbers starting with 3)
- `TPTP-401`, `TPTP-402`, ... `TPTP-499` (3-digit numbers starting with 4)
- `TPTP-1001`, `TPTP-1002`, ... (4+ digit numbers NOT starting with 2)
- `TPTP-3010`, `TPTP-4015`, etc.

**Pattern:** Any TPTP room where the number part does NOT start with `2`

## Why This Happened

The old logic was:
```javascript
} else if (formattedRoom.startsWith('TP2') || formattedRoom.startsWith('TP-2')) {
  buildingName = 'Tech Park 2';
}
```

So:
- `TPTP-201` → converts to `TP-201` → `TP-201.startsWith('TP-2')` → TRUE → BUG! ❌
- `TPTP-401` → converts to `TP-401` → `TP-401.startsWith('TP-2')` → FALSE → OK ✅

## The Fix

Now we:
1. Explicitly set `buildingName = 'Tech Park'` for ALL TPTP rooms
2. Mark them with `isTPTPRoom = true` flag
3. Skip TP-2 pattern matching if `isTPTPRoom` is true
4. Also refined the TP-2 pattern to distinguish:
   - `TP-2XX` (3 digits) → Tech Park (regular)
   - `TP-2XXX` (4+ digits) → Tech Park 2

## Impact

**Before Fix:**
- ❌ `TPTP-201` → Showed as "Tech Park 2" (WRONG)
- ✅ `TPTP-401` → Showed as "Tech Park" (correct by accident)

**After Fix:**
- ✅ `TPTP-201` → Shows as "Tech Park" (CORRECT)
- ✅ `TPTP-401` → Shows as "Tech Park" (CORRECT)
- ✅ ALL TPTP rooms now correctly show as "Tech Park"

## Conclusion

**Yes, the bug primarily affected TPTP-2XX rooms**, but the fix protects ALL TPTP rooms from being misidentified, regardless of their room number.

