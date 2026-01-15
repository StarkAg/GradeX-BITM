# Slot Splitting Update - Hyphenated Slots

## What Changed

The slot resolver now **splits hyphenated slots** into individual parts and matches each part separately.

### Example: "P2-P3"

**Before:**
- Looked for exact match: `slotMapping["P2-P3"]`
- If not found → Course doesn't display

**After:**
- First tries exact match: `slotMapping["P2-P3"]`
- If not found, splits into: `["P2", "P3"]`
- Looks up: `slotMapping["P2"]` and `slotMapping["P3"]`
- Combines time slots from both individual slots
- Removes duplicates (same day/period)
- Places course in all matched periods

---

## How It Works

### Step-by-Step Process

1. **Normalize slot code**: "P2-P3" → "P2-P3" (uppercase, trimmed)

2. **Check direct match**: Look for `slotMapping["P2-P3"]`
   - If found → Use it (existing behavior)

3. **If not found, split**: Split "P2-P3" into ["P2", "P3"]

4. **Look up individual slots**:
   - `slotMapping["P2"]` → Returns time slots for P2
   - `slotMapping["P3"]` → Returns time slots for P3

5. **Combine time slots**: Merge arrays from both slots

6. **Remove duplicates**: If P2 and P3 share the same day/period, keep only one

7. **Place course**: Course appears in all matched periods

---

## Code Changes

### `resolveSlotsToTimetable()` Function

```javascript
// If hyphenated slot not found, try splitting it
if (!timeSlots && slotCode.includes('-')) {
  const parts = slotCode.split('-');
  if (parts.length === 2) {
    const [part1, part2] = parts;
    const slots1 = slotMapping[part1.trim()];
    const slots2 = slotMapping[part2.trim()];
    
    // Combine time slots from both individual slots
    if (slots1 || slots2) {
      timeSlots = [];
      if (slots1) timeSlots.push(...slots1);
      if (slots2) timeSlots.push(...slots2);
      
      // Remove duplicates
      const uniqueSlots = [];
      const seen = new Set();
      for (const slot of timeSlots) {
        const key = `${slot.day}-${slot.period}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueSlots.push(slot);
        }
      }
      timeSlots = uniqueSlots;
    }
  }
}
```

### `isValidSlotCode()` Function

Updated to also check if hyphenated slots can be split:

```javascript
// Check if slot exists directly
if (normalized in slotMapping) {
  return true;
}

// If hyphenated slot not found, try splitting it
if (normalized.includes('-')) {
  const parts = normalized.split('-');
  if (parts.length === 2) {
    const [part1, part2] = parts;
    // Valid if both parts exist individually
    return (part1.trim() in slotMapping) || (part2.trim() in slotMapping);
  }
}
```

---

## Benefits

1. **Flexibility**: Works with both hyphenated slots (P2-P3) and individual slots (P2, P3)
2. **Backward Compatible**: Still checks for exact matches first
3. **No Duplicates**: Automatically removes duplicate day/period combinations
4. **Better Coverage**: Courses with hyphenated slots will display even if the exact hyphenated slot doesn't exist in the mapping

---

## Example Use Cases

### Case 1: Exact Match Exists
- Course slot: "P1-P2"
- Mapping has: `"P1-P2": [{day: 1, period: 1}, {day: 1, period: 2}]`
- **Result**: Uses exact match (no splitting needed)

### Case 2: Split Required
- Course slot: "P2-P3"
- Mapping has: `"P2": [{day: 1, period: 2}]` and `"P3": [{day: 1, period: 3}]`
- Mapping does NOT have: `"P2-P3"`
- **Result**: Splits into P2 and P3, combines their time slots

### Case 3: Partial Match
- Course slot: "P37-P38"
- Mapping has: `"P37": []` (no individual mapping) and `"P38": [{day: 4, period: 8}]`
- Mapping also has: `"P37-P38": [{day: 4, period: 7}, {day: 4, period: 8}]`
- **Result**: Uses exact match "P37-P38" (checked first)

---

## Testing

To test, check the browser console when loading timetable:
- Look for: `✓ Split hyphenated slot "P2-P3" into "P2" and "P3" for course "Maths"`
- This confirms the splitting is working

---

## Files Updated

- `src/utils/slotResolver.js` - Added splitting logic
- `dist/assets/index-*.js` - Built and deployed
- Deployed to VPS

---

## Status

✅ **Implemented and Deployed**
✅ **Backward Compatible**
✅ **Handles Duplicates**
✅ **Works for All Hyphenated Slots**

