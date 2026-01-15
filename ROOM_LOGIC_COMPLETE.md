# Complete Room Formatting and Floor Extraction Logic

This document shows all room formatting rules and floor extraction logic used in the SeatFinder component.

## Room Formatting Rules

### 1. Special Cases (Handled First)

```javascript
// TPVPT-028 -> VPT-028 (Ground Floor)
if (formattedRoom === 'TPVPT-028') {
  formattedRoom = 'VPT-028';
  buildingName = 'Valliammai Block Behind TP';
  floorNumber = 'Ground Floor';
}
```

### 2. TPTP Pattern

```javascript
// TPTP-401 -> TP-401
if (formattedRoom.startsWith('TPTP-')) {
  formattedRoom = formattedRoom.replace('TPTP-', 'TP-');
}
```

### 3. TPVPT Pattern

```javascript
// TPVPT-301 -> VPT-301
if (formattedRoom.startsWith('TPVPT-')) {
  formattedRoom = formattedRoom.replace('TPVPT-', 'VPT-');
  buildingName = 'Valliammai Block Behind TP';
}
```

### 4. TP-2VPT / TP2VPT Pattern

```javascript
// TP-2VPT-217 -> VPT-217 (TP2/VPT venue, TP2 image)
// TP2VPT-217 -> VPT-217 (TP2/VPT venue, TP2 image)
if (formattedRoom.startsWith('TP-2VPT-') || formattedRoom.startsWith('TP2VPT-')) {
  formattedRoom = formattedRoom.replace(/^TP-?2VPT-/i, 'VPT-');
  buildingName = 'TP2/VPT';
}
```

### 5. VPT Pattern

```javascript
// VPT-301 -> VPT-301
if (formattedRoom.startsWith('VPT-')) {
  buildingName = 'Valliammai Block Behind TP';
}
```

### 6. TP-2 with L/LH/LS/CLS Pattern

```javascript
// TP-2L1401-2 -> L1401-2 (Tech Park 2)
// TP-2LH1005 -> LH1005 (Tech Park 2)
// TP-2CLS1019 -> CLS1019 (Tech Park 2)
// TP2L1401-2 -> L1401-2 (Tech Park 2)
if (formattedRoom.match(/^TP-?2(L|LH|LS|CLS)/i)) {
  formattedRoom = formattedRoom.replace(/^TP-?2/i, '');
  buildingName = 'Tech Park 2';
}
```

### 7. TP2 / TP-2 Pattern (Other)

```javascript
// TP2-401 -> TP2-401 (Tech Park 2)
// TP-2-401 -> TP-2-401 (Tech Park 2)
if (formattedRoom.startsWith('TP2') || formattedRoom.startsWith('TP-2')) {
  buildingName = 'Tech Park 2';
}
```

### 8. CLS / LS / LH / L Pattern

```javascript
// CLS1319 -> CLS1319 (Tech Park 2)
// LS2019 -> LS2019 (Tech Park 2)
// LH506 -> LH506 (Tech Park 2)
// L1401-2 -> L1401-2 (Tech Park 2)
if (formattedRoom.startsWith('CLS') || 
    formattedRoom.startsWith('LS') || 
    formattedRoom.startsWith('LH') || 
    formattedRoom.startsWith('L')) {
  buildingName = 'Tech Park 2';
}
```

---

## Floor Extraction Logic

Floor extraction happens **after** room formatting. It extracts the floor number from the **formatted** room name.

### Pattern Matching Order

The floor extraction checks patterns in this order:

1. **CLS / LS / LH** (checked first)
2. **L** (checked second)
3. **TP-** (checked third)
4. **VPT-** or Letter+Number pattern (checked fourth)
5. **Pure number** (fallback)

### 1. CLS / LS / LH Rooms

```javascript
if (formattedRoom.startsWith('CLS') || 
    formattedRoom.startsWith('LS') || 
    formattedRoom.startsWith('LH')) {
  
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
```

**Examples:**
- `CLS1319` → Extract "1319" → First 2 digits "13" → **13th floor**
- `LS2019` → Extract "2019" → First 2 digits "20" → **20th floor**
- `LH506` → Extract "506" → First digit "5" → **5th floor**
- `CLS1019` → Extract "1019" → First 2 digits "10" → **10th floor**

### 2. L Rooms

```javascript
if (formattedRoom.startsWith('L')) {
  if (numStr.length >= 2) {
    // L1401-2 -> floor 14, L2019 -> floor 20
    const firstTwo = parseInt(numStr.substring(0, 2));
    floorNumber = formatFloorNumber(firstTwo);
  } else {
    const firstDigit = parseInt(numStr.charAt(0));
    floorNumber = formatFloorNumber(firstDigit);
  }
}
```

**Examples:**
- `L1401-2` → Extract "1401" → First 2 digits "14" → **14th floor**
- `L2019` → Extract "2019" → First 2 digits "20" → **20th floor**
- `L506` → Extract "506" → First digit "5" → **5th floor**

### 3. TP- Rooms

```javascript
if (formattedRoom.startsWith('TP-')) {
  if (numStr.length >= 4) {
    // 4-digit: TP-1001 -> floor 10, TP-1206 -> floor 12
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
```

**Examples:**
- `TP-1001` → Extract "1001" → First 2 digits "10" → **10th floor**
- `TP-1206` → Extract "1206" → First 2 digits "12" → **12th floor**
- `TP-401` → Extract "401" → First digit "4" → **4th floor**
- `TP-501` → Extract "501" → First digit "5" → **5th floor**

### 4. VPT- or Letter+Number Pattern

```javascript
if (letterMatch || formattedRoom.startsWith('VPT-')) {
  // H301F, S45, UB604, VPT-301 - first digit after letter is floor
  const firstDigit = parseInt(numStr.charAt(0));
  floorNumber = formatFloorNumber(firstDigit);
}
```

**Examples:**
- `VPT-217` → Extract "217" → First digit "2" → **2nd floor**
- `VPT-301` → Extract "301" → First digit "3" → **3rd floor**
- `H301F` → Extract "301" → First digit "3" → **3rd floor**
- `UB604` → Extract "604" → First digit "6" → **6th floor**
- `S45` → Extract "45" → First digit "4" → **4th floor**

### 5. Pure Number (Fallback)

```javascript
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
```

**Examples:**
- `1504` → Extract "1504" → First 2 digits "15" → **15th floor**
- `2019` → Extract "2019" → First 2 digits "20" → **20th floor**

---

## Complete Flow Example: TP-2VPT-217

1. **Initial:** `formattedRoom = "TP-2VPT-217"`

2. **Formatting:**
   - Matches `TP-2VPT-` pattern
   - `formattedRoom = "VPT-217"`
   - `buildingName = "TP2/VPT"`

3. **Floor Extraction:**
   - `formattedRoom = "VPT-217"` (already formatted)
   - Matches `VPT-` pattern (4th check)
   - Extract "217" → First digit "2" → **2nd floor**

4. **Final Result:**
   - Room: `VPT-217`
   - Building: `TP2/VPT`
   - Floor: `2nd`
   - Image: `/TP2.JPG` (because building is TP2/VPT)

---

## Complete Flow Example: TP-2L1401-2

1. **Initial:** `formattedRoom = "TP-2L1401-2"`

2. **Formatting:**
   - Matches `TP-?2(L|LH|LS|CLS)` pattern
   - `formattedRoom = "L1401-2"`
   - `buildingName = "Tech Park 2"`

3. **Floor Extraction:**
   - `formattedRoom = "L1401-2"` (already formatted)
   - Matches `L` pattern (2nd check)
   - Extract "1401" → First 2 digits "14" → **14th floor**

4. **Final Result:**
   - Room: `L1401-2`
   - Building: `Tech Park 2`
   - Floor: `14th`
   - Image: `/TP2.JPG` (because hasTP2 is true)

---

## Complete Flow Example: TP-1001

1. **Initial:** `formattedRoom = "TP-1001"`

2. **Formatting:**
   - No special patterns match
   - `formattedRoom = "TP-1001"` (unchanged)
   - `buildingName = "Tech Park"` (default campus)

3. **Floor Extraction:**
   - `formattedRoom = "TP-1001"` (already formatted)
   - Matches `TP-` pattern (3rd check)
   - Extract "1001" → First 2 digits "10" → **10th floor**

4. **Final Result:**
   - Room: `TP-1001`
   - Building: `Tech Park`
   - Floor: `10th`
   - Image: `/TP.jpg` (Tech Park image)

---

## Image Selection Logic

Images are selected based on room patterns and building names:

1. **Main Campus (H rooms):** `/MC.jpg`
2. **TP2/VPT building:** `/TP2.JPG`
3. **TP2 rooms (L, CLS, LS, LH, TP-2, TP2):** `/TP2.JPG`
4. **VPT rooms:** `/VPT.JPG`
5. **TP rooms:** `/TP.jpg`
6. **UB rooms:** `/UB.png`

**Priority Order:**
- `hasMainCampus` (H rooms) → MC.jpg
- `hasTP2` (includes TP2/VPT) → TP2.JPG
- `hasTPVPT` → VPT.JPG
- `roomUpper.startsWith('TP')` → TP.jpg
- `roomUpper.includes('UB')` → UB.png

---

## Notes

1. **Order Matters:** Floor extraction checks patterns in a specific order. TP- rooms are checked before VPT- rooms to avoid conflicts.

2. **Formatted Room:** Floor extraction always works on the **formatted** room name, not the original.

3. **Building Name:** Can be overridden by multiple rules. Last matching rule wins.

4. **TP2/VPT Special Case:** These rooms show TP2 image but have "TP2/VPT" as the venue name.


