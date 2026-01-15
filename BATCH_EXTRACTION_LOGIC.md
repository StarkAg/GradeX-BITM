# Batch Extraction Logic - What the Code is Looking For

## Current Logic

The code is trying to extract batch using this pattern:

```go
batchPattern := regexp.MustCompile(`(?i)Batch\s*:\s*(\d+)`)
```

This regex means:
- `(?i)` - Case insensitive
- `Batch` - Literal text "Batch"
- `\s*` - Zero or more whitespace characters (spaces, tabs)
- `:` - Literal colon
- `\s*` - Zero or more whitespace characters
- `(\d+)` - One or more digits (captured as batch number)

## Where It Searches

### 1. First: Raw HTML Text (`htmlText`)
```go
matches := batchPattern.FindStringSubmatch(htmlText)
```
Searches in the **raw HTML** of the page.

### 2. Second: Processed Text (`docText`)
```go
matches := batchPattern.FindStringSubmatch(docText)
```
Searches in the **text content** extracted from HTML (after removing tags).

### 3. Third: Table Rows (when parsing courses)
```go
batchText := strings.TrimSpace(s.Text())
matches := batchRe.FindStringSubmatch(batchText)
```
Searches in each **table row** text.

### 4. Fourth: Individual Table Cells
```go
for j := 0; j < tds.Length(); j++ {
    cellText := strings.TrimSpace(tds.Eq(j).Text())
    matches := batchRe.FindStringSubmatch(cellText)
}
```
Searches in each **table cell** individually.

## What It Expects to Find

The code expects to find text like:
- `Batch: 1`
- `Batch: 2`
- `Batch:	1` (with tab)
- `batch: 2` (case insensitive)
- `Batch:1` (no space)

## What It Does NOT Look For

- ❌ "Combo / Batch: 1/2" (X/Y format) - **REMOVED**
- ❌ "Batch 1" (without colon)
- ❌ "1/2" (just numbers)

## Current Problem

If the batch is not found, `batchNumber` remains empty string `""`, and then:
1. Later code tries to parse it: `parseInt(batchNumber || '1', 10)` → defaults to **1**
2. This is why Supabase shows Batch 1 even when it should be Batch 2

## What I Need From You

Please provide:

1. **Exact HTML/text** where the batch appears in the SRM page
2. **Format** - Is it "Batch: 2" or something else?
3. **Location** - Is it in a table cell, header, or plain text?
4. **Sample** - A snippet of the actual HTML/text around the batch field

Example format you provided:
```
Registration Number:	RA2311003012246	Name:	HARSH AGARWAL
Batch:	2	Mobile:	8709964141
```

This should match, but maybe:
- The HTML structure is different
- There are hidden characters
- The text is in a different location
- The format is slightly different

## Debugging Steps

To help debug, please check:

1. **Browser DevTools**: 
   - View page source
   - Search for "Batch"
   - Copy the exact HTML around it

2. **Check VPS Logs**:
   ```bash
   ssh root@65.20.84.46
   journalctl -u gradex-backend -f | grep Batch
   ```
   This will show what the code is finding (or not finding)

3. **Check Supabase**:
   - Look at `timetable_cache` table
   - Check `batch` and `batch_number` columns
   - See what's actually stored

## Next Steps

Once you provide:
- The exact format/location of "Batch" in the HTML
- Any sample HTML/text

I will update the extraction logic to match the actual format.

