# Batch Extraction Fix - Batch 1 & Batch 2

## Issue
The batch extraction code only looked for patterns like:
- "Combo / Batch: 1/2" (X/Y format)

But the actual SRM data shows:
- **"Batch: 1"** (direct format for Batch 1)
- **"Batch: 2"** (direct format for Batch 2)

The code was missing the direct "Batch: X" pattern for both batches.

## Solution

### Updated `scrapers.go` to handle both formats for BOTH Batch 1 and Batch 2:

1. **X/Y Format** (existing):
   - "Combo / Batch: 1/2" → Batch 2 (second number)
   - "Combo / Batch: 2/1" → Batch 1 (second number)
   - "1/2" → Batch 2 (second number)

2. **Direct Format** (NEW - works for both):
   - "Batch: 1" → Batch 1 (direct number)
   - "Batch: 2" → Batch 2 (direct number)
   - "batch: 1" → Batch 1 (case insensitive)
   - "batch: 2" → Batch 2 (case insensitive)

### Code Changes

#### 1. Added Direct Batch Pattern (works for both Batch 1 and Batch 2)
```go
// Also check for direct "Batch: 1" or "Batch: 2" format (not X/Y format)
directBatchPattern := regexp.MustCompile(`(?i)Batch\s*:\s*(\d+)`)
```

#### 2. Updated Extraction Logic
```go
// If no X/Y format found, try direct "Batch: 1" or "Batch: 2" format
if batchNumber == "" {
    matches := directBatchPattern.FindStringSubmatch(htmlText)
    if len(matches) >= 2 {
        batchNumber = matches[1] // Direct batch number (e.g., "1" from "Batch: 1" or "2" from "Batch: 2")
        batch = fmt.Sprintf("Batch: %s", batchNumber)
    }
}
```

#### 3. Updated Table Row Parsing
Also checks for direct "Batch: 1" or "Batch: 2" format when parsing table rows.

## Testing

### Test Case 1: Batch 1 Student
**Input HTML:**
```
Batch:	1
```

**Expected Output:**
- `batchNumber = "1"`
- `batch = "Batch: 1"`
- `selectedBatch = 1` (in frontend)
- Uses `batch1_slots.json` for slot mapping ✅

### Test Case 2: Batch 2 Student (RA2311003012212)
**Input HTML:**
```
Batch:	2
```

**Expected Output:**
- `batchNumber = "2"`
- `batch = "Batch: 2"`
- `selectedBatch = 2` (in frontend)
- Uses `batch2_slots.json` for slot mapping ✅

## Files Updated
- `gradex-backend/src/srm/scrapers.go` - Added direct batch pattern extraction for both Batch 1 and Batch 2
- Deployed to VPS

## Status
✅ **Fixed and Deployed**
✅ **Handles both formats: "Combo / Batch: X/Y" and "Batch: X"**
✅ **Works for Batch 1 and Batch 2**
✅ **Case insensitive**

## Impact
- **Batch 1 students**: Will correctly use Batch 1 slot mappings (`batch1_slots.json`)
- **Batch 2 students**: Will correctly use Batch 2 slot mappings (`batch2_slots.json`)
- Student RA2311003012212 (Batch 2) will now correctly use Batch 2 slot mappings
- Course "21CSC303J" with slot "P37-P38-" will display in Day 4, Periods 7-8 using Batch 2 mapping

