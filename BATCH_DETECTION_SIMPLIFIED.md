# Batch Detection Simplified

## Change
Removed complex "Combo / Batch: X/Y" format detection and simplified to only use direct "Batch: X" format.

## Old Logic (REMOVED)
- Looked for "Combo / Batch: 1/2" (X/Y format)
- Extracted second number as batch
- Complex pattern matching

## New Logic (SIMPLE)
- Only looks for "Batch: 1" or "Batch: 2"
- Direct number extraction
- Handles tabs and spaces: "Batch:\t2" or "Batch: 2"

## Format Supported
```
Registration Number:	RA2311003012246	Name:	HARSH AGARWAL
Batch:	2	Mobile:	8709964141
Program:	B.Tech	Department:	Computer Science and Engineering(CS)-(P2 Section)
```

**Extracts:**
- `batchNumber = "2"`
- `batch = "Batch: 2"`
- Uses `batch2_slots.json` for slot mapping

## Code Changes

### 1. Simplified Main Extraction
```go
// Extract Batch: Simple format "Batch: 1" or "Batch: 2" (handles tabs/spaces)
batchPattern := regexp.MustCompile(`(?i)Batch\s*:\s*(\d+)`)

matches := batchPattern.FindStringSubmatch(htmlText)
if len(matches) >= 2 {
    batchNumber = matches[1] // Direct batch number
    batch = fmt.Sprintf("Batch: %s", batchNumber)
}
```

### 2. Simplified Table Row Parsing
```go
// Simple format: "Batch: 1" or "Batch: 2" (handles tabs/spaces)
batchRe := regexp.MustCompile(`(?i)Batch\s*:\s*(\d+)`)
matches := batchRe.FindStringSubmatch(batchText)
if len(matches) >= 2 {
    batchNumber = matches[1]
    batch = fmt.Sprintf("Batch: %s", batchNumber)
}
```

### 3. Simplified Fallback Parsing
```go
// Parse batch number from batch string (format: "Batch: 1" or "Batch: 2")
if batch != "" && batchNumber == "" {
    batchRe := regexp.MustCompile(`(?i)Batch\s*:\s*(\d+)`)
    matches := batchRe.FindStringSubmatch(batch)
    if len(matches) >= 2 {
        batchNumber = matches[1] // Direct batch number
    }
}
```

## Examples

### Batch 1 Student
```
Batch:	1
```
→ `batchNumber = "1"`, uses `batch1_slots.json`

### Batch 2 Student (RA2311003012246)
```
Batch:	2
```
→ `batchNumber = "2"`, uses `batch2_slots.json`

## Files Updated
- `gradex-backend/src/srm/scrapers.go` - Simplified batch detection
- Deployed to VPS

## Status
✅ **Simplified and Deployed**
✅ **Only uses "Batch: X" format**
✅ **Handles tabs and spaces**
✅ **Works for Batch 1 and Batch 2**

