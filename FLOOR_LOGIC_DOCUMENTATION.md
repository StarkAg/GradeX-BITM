# Floor Extraction Logic Documentation

## Current Floor Logic in SeatFinder.jsx

### Helper Function: `formatFloorNumber(num)`
```javascript
const formatFloorNumber = (num) => {
  if (num === 0) return 'Ground Floor';
  const lastDigit = num % 10;
  const lastTwoDigits = num % 100;
  
  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${num}th`;  // 11th, 12th, 13th
  }
  
  if (lastDigit === 1) return `${num}st`;  // 1st, 21st, 31st
  if (lastDigit === 2) return `${num}nd`;  // 2nd, 22nd, 32nd
  if (lastDigit === 3) return `${num}rd`;  // 3rd, 23rd, 33rd
  return `${num}th`;  // 4th, 5th, etc.
};
```

### Main Floor Extraction Logic (Lines 450-512)

```javascript
// Extract floor number from room name (e.g., TP-401 -> 4th, H301F -> 3rd)
if (formattedRoom !== '-' && floorNumber === '-') {
  // Extract number from room name (e.g., TP-401, UB604, H301F, 1504)
  const floorMatch = formattedRoom.match(/(\d+)/);
  if (floorMatch) {
    const numStr = floorMatch[1];
    // Check if room starts with letter(s) followed by number (e.g., H301F, S45, UB604, VPT-301)
    const letterNumberPattern = /^[A-Z]+[-]?(\d+)/;
    const letterMatch = formattedRoom.match(letterNumberPattern);
    
    // CASE 1: CLS, LS, LH rooms
    if (formattedRoom.startsWith('CLS') || formattedRoom.startsWith('LS') || formattedRoom.startsWith('LH')) {
      // For CLS1319, LS2019, LH506 - first two digits are floor if 4+ digits, else first digit
      if (numStr.length >= 4) {
        // 4-digit: CLS1319 -> floor 13, LS2019 -> floor 20
        const firstTwo = parseInt(numStr.substring(0, 2));
        floorNumber = formatFloorNumber(firstTwo);
      } else {
        // 3-digit or less: LH506 -> floor 5
        const firstDigit = parseInt(numStr.charAt(0));
        floorNumber = formatFloorNumber(firstDigit);
      }
    }
    
    // CASE 2: L rooms (not LH, LS, CLS - just L)
    else if (formattedRoom.startsWith('L')) {
      // For L1401-2, L2019 - first two digits are floor (14, 20)
      if (numStr.length >= 2) {
        const firstTwo = parseInt(numStr.substring(0, 2));
        floorNumber = formatFloorNumber(firstTwo);
      } else {
        const firstDigit = parseInt(numStr.charAt(0));
        floorNumber = formatFloorNumber(firstDigit);
      }
    }
    
    // CASE 3: Letter + Number pattern (H301F, S45, UB604, VPT-301)
    else if (letterMatch || formattedRoom.startsWith('VPT-')) {
      // For H301F, S45, UB604, VPT-301 - first digit after letter is floor
      const firstDigit = parseInt(numStr.charAt(0));
      floorNumber = formatFloorNumber(firstDigit);
    }
    
    // CASE 4: TP- rooms
    else if (formattedRoom.startsWith('TP-')) {
      // For TP rooms: TP-401 -> 4th floor, TP-1206 -> 12th floor
      // Check if it's a 4-digit number (like 1206) - first 2 digits are floor
      // Or 3-digit number (like 401) - first digit is floor
      if (numStr.length >= 4) {
        // 4-digit: TP-1206 -> floor 12
        const firstTwo = parseInt(numStr.substring(0, 2));
        floorNumber = formatFloorNumber(firstTwo);
      } else if (numStr.length === 3) {
        // 3-digit: TP-401 -> floor 4
        const firstDigit = parseInt(numStr.charAt(0));
        floorNumber = formatFloorNumber(firstDigit);
      } else {
        // 1-2 digit: use first digit
        const firstDigit = parseInt(numStr.charAt(0));
        floorNumber = formatFloorNumber(firstDigit);
      }
    }
    
    // CASE 5: Pure numbers (1504, etc.)
    else {
      // For 1504 (pure number), first two digits might be floor (15)
      if (numStr.length >= 2) {
        const firstTwo = parseInt(numStr.substring(0, 2));
        floorNumber = formatFloorNumber(firstTwo);
      } else {
        const firstDigit = parseInt(numStr.charAt(0));
        floorNumber = formatFloorNumber(firstDigit);
      }
    }
  }
}
```

## Examples of Current Logic

| Room Format | Extracted Number | Floor Logic | Result | Expected? |
|------------|------------------|-------------|--------|-----------|
| CLS1319 | 1319 | First 2 digits (4+ digits) | 13th | ✅ |
| LS2019 | 2019 | First 2 digits (4+ digits) | 20th | ✅ |
| LH506 | 506 | First digit (3 digits) | 5th | ✅ |
| L1401-2 | 1401 | First 2 digits (2+ digits) | 14th | ✅ |
| L2019 | 2019 | First 2 digits (2+ digits) | 20th | ✅ |
| TP-401 | 401 | First digit (3 digits) | 4th | ✅ |
| TP-1206 | 1206 | First 2 digits (4+ digits) | 12th | ✅ |
| H301F | 301 | First digit (letter match) | 3rd | ✅ |
| UB604 | 604 | First digit (letter match) | 6th | ✅ |
| VPT-301 | 301 | First digit (VPT-) | 3rd | ✅ |
| S45 | 45 | First digit (letter match) | 4th | ✅ |
| 1504 | 1504 | First 2 digits (pure number) | 15th | ❓ |

## Potential Issues

1. **L vs LH/LS/CLS conflict**: The check for `L` comes after `LH/LS/CLS`, but if a room starts with `L` and doesn't match `LH/LS/CLS`, it will use the `L` case. This is correct.

2. **TP-2L rooms**: After stripping `TP-2` prefix, `L1401-2` becomes `L1401-2`, which should correctly extract floor 14.

3. **Pure numbers**: The logic assumes first 2 digits are floor, which might not always be correct.

4. **Edge cases**: What about rooms like `TP-2L1401-2`? After prefix removal, it becomes `L1401-2`, and the regex `/(\d+)/` will match `1401` (first match), which should work.

## Special Cases Already Handled

- `TPVPT-028` → Hardcoded to "Ground Floor"
- `TP-2L1401-2` → After prefix removal: `L1401-2` → Floor: 14th
- `TP-2LH1005` → After prefix removal: `LH1005` → Floor: 1st (first digit of 1005)

## Questions to Verify

1. Is `LH1005` floor 1st or 10th?
2. Is `TP-2L1401-2` correctly showing 14th floor?
3. Are there any other room formats that need special handling?



