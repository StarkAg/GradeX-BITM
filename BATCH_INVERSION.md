# Batch Inversion - What Changed

## Logic

**INVERTED**: If the code detects Batch 1, it will use Batch 2. If it detects Batch 2, it will use Batch 1.

## How It Works

1. Extract batch from HTML (e.g., detects "Batch: 1")
2. **INVERT**: 
   - If detected = "1" → Use "2"
   - If detected = "2" → Use "1"
3. Store inverted batch in database

## Example

**SRM Page Shows:**
```
Batch:	1	Mobile:	9717150665
```

**Code Detects:**
- Extracts: `batchNumber = "1"`

**After Inversion:**
- Stores: `batchNumber = "2"`
- Uses: `batch2_slots.json` for slot mapping ✅

## Logging

The code will log:
```
[Batch] Extracted from HTML: batchNumber=1, batch=Batch: 1
[Batch] INVERTED: Original=1 → Inverted=2
```

## Result

- Students with "Batch: 1" in SRM → Will use Batch 2 slot mappings
- Students with "Batch: 2" in SRM → Will use Batch 1 slot mappings

This fixes the issue where the batch detection was correct but the slot mapping was wrong.

