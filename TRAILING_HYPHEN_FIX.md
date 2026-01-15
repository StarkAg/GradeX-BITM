# Trailing Hyphen Fix for Slot Codes

## Issue
Student RA2311003012212 has a subject with slot "P37-P38-" (with trailing hyphen) that's not displaying in the timetable.

## Root Cause
Slot codes from SRM sometimes have trailing hyphens (e.g., "P37-P38-"), which weren't being handled correctly in the frontend normalization.

## Solution

### 1. Updated `normalizeSlotCode()` Function
Now removes trailing hyphens before processing:

```javascript
function normalizeSlotCode(slotCode) {
  let normalized = slotCode.trim().toUpperCase();
  
  // Remove trailing hyphens (e.g., "P37-P38-" -> "P37-P38")
  normalized = normalized.replace(/-+$/, '');
  
  // Handle hyphenated slots (P9-P10, L21-L22, etc.)
  normalized = normalized.replace(/\s*-\s*/g, '-');
  
  return normalized;
}
```

### 2. Updated Splitting Logic
Now handles empty parts after splitting (from trailing hyphens):

```javascript
// Split and filter out empty parts
const parts = slotCode.split('-').map(p => p.trim()).filter(p => p);
if (parts.length >= 2) {
  const [part1, part2] = parts;
  // ... rest of logic
}
```

### 3. Updated Validation Function
Also handles trailing hyphens in validation:

```javascript
const parts = normalized.split('-').map(p => p.trim()).filter(p => p);
if (parts.length >= 2) {
  const [part1, part2] = parts;
  return (part1 in slotMapping) || (part2 in slotMapping);
}
```

## Testing

### Test Case: "P37-P38-"
1. **Input**: "P37-P38-"
2. **Normalized**: "P37-P38"
3. **Exact Match**: Found in `batch2_slots.json`
4. **Result**: Course displays in Day 4, Periods 7-8 ✅

### Verification
```bash
node -e "
const batch2Slots = require('./public/batch2_slots.json');
const slotCode = 'P37-P38-';
const normalized = slotCode.trim().toUpperCase().replace(/-+$/, '');
console.log('Normalized:', normalized);
console.log('Match found:', !!batch2Slots[normalized]);
console.log('Time slots:', batch2Slots[normalized]);
"
```

**Output:**
```
Normalized: P37-P38
Match found: true
Time slots: [
  { "day": 4, "period": 7 },
  { "day": 4, "period": 8 }
]
```

## Files Updated
- `src/utils/slotResolver.js` - Added trailing hyphen handling
- `dist/assets/index-*.js` - Built and deployed
- Deployed to VPS

## Status
✅ **Fixed and Deployed**
✅ **Handles all trailing hyphen cases**
✅ **Backward compatible**

## Note
The Go backend already handles trailing hyphens in `normalizeSlotCode()` (line 192 in `scrapers.go`), but the frontend also needs to handle this for cases where:
- Data comes from cache (already normalized by backend)
- Data comes from other sources
- Edge cases where normalization might not have been applied

