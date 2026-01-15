# Batch Extraction - Improved Logic

## What Changed

Based on the actual format you provided:
```
Batch:	1	Mobile:	9717150665
```

I've improved the extraction to handle multiple patterns and HTML structures.

## New Patterns

The code now tries **5 different patterns** in order:

1. `Batch\s*:\s*(\d+)` - Standard: "Batch: 1"
2. `Batch\s*:\s*(\d+)\s*\t` - With tab after: "Batch: 1\t"
3. `Batch\s*:\s*(\d+)\s+Mobile` - Before Mobile: "Batch: 1 Mobile"
4. `<[^>]*>Batch\s*:\s*(\d+)` - In HTML tag
5. `Batch[^:]*:\s*(\d+)` - With extra chars: "Batch\t: 1"

## Where It Searches

1. **Raw HTML text** - tries all 5 patterns
2. **Processed text** (docText) - tries all 5 patterns if not found
3. **Goquery elements** (td, th) - tries all 5 patterns in each table cell

## Better Logging

Now logs:
- Which pattern matched
- Where it was found (HTML, docText, or goquery)
- Context around "batch" if not found (shows 200 chars around the word "batch")

## Expected Results

For your format:
```
Batch:	1	Mobile:	9717150665
```

Should match pattern #3: `Batch\s*:\s*(\d+)\s+Mobile`
- Extracts: `batchNumber = "1"`
- Stores: `batch = "Batch: 1"`

## Testing

After deployment, check VPS logs:
```bash
ssh root@65.20.84.46
journalctl -u gradex-backend -f | grep Batch
```

You should see:
```
[Batch] Extracted from HTML (pattern ...): batchNumber=1, batch=Batch: 1
```

Or if not found:
```
[Batch] WARNING: Batch not found. Context around 'batch': ...
```

This will show exactly what the code is seeing.

