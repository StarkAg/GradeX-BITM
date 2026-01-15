# Batch Extraction Fix

## Issue
Student RA2311003012212 has **Batch: 2** but the system was extracting Batch 1 or not extracting it correctly.

## Root Cause
The batch extraction code only looked for patterns like:
- "Combo / Batch: 1/2" (X/Y format)
- "1/2" (X/Y format)

But the actual SRM data shows:
- **"Batch: 2"** (direct format)

The code was missing the direct "Batch: 2" pattern.

## Solution

### Updated `scrapers.go` to handle both formats:

1. **X/Y Format** (existing):
   - "Combo / Batch: 1/2" → Batch 2 (second number)
   - "1/2" → Batch 2 (second number)

2. **Direct Format** (NEW):
   - "Batch: 2" → Batch 2 (direct number)
   - "batch: 2" → Batch 2 (case insensitive)

### Code Changes

#### 1. Added Direct Batch Pattern
```go
// Also check for direct "Batch: 2" format (not X/Y format)
directBatchPattern := regexp.MustCompile(`(?i)Batch\s*:\s*(\d+)`)
```

#### 2. Updated Extraction Logic
```go
// If no X/Y format found, try direct "Batch: 2" format
if batchNumber == "" {
    matches := directBatchPattern.FindStringSubmatch(htmlText)
    if len(matches) >= 2 {
        batchNumber = matches[1] // Direct batch number (e.g., "2" from "Batch: 2")
        batch = fmt.Sprintf("Batch: %s", batchNumber)
    }
}
```

#### 3. Updated Table Row Parsing
Also checks for direct "Batch: 2" format when parsing table rows.

## Testing

### Test Case: RA2311003012212
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
- `gradex-backend/src/srm/scrapers.go` - Added direct batch pattern extraction
- Deployed to VPS

## Status
✅ **Fixed and Deployed**
✅ **Handles both formats: "Combo / Batch: X/Y" and "Batch: 2"**
✅ **Case insensitive**

## Impact
- Student RA2311003012212 will now correctly use Batch 2 slot mappings
- Course "21CSC303J" with slot "P37-P38-" will display in Day 4, Periods 7-8 using Batch 2 mapping

