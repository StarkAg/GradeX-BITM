# How to Get Schedule Data

## Option 1: Via Web Interface
1. Go to: **https://www.gradex.bond/schedule**
2. Login with credentials
3. The timetable will be displayed

## Option 2: Via API (After Login)

### Step 1: Login First
```bash
curl -X POST https://www.gradex.bond/api/srm/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "Sp4695@srmist.edu.in",
    "password": "Ansu2004@"
  }'
```

This returns:
```json
{
  "success": true,
  "userId": "user-id-here",
  "message": "Login successful"
}
```

### Step 2: Get Timetable
```bash
curl "https://www.gradex.bond/api/srm/timetable?userId=USER_ID_FROM_STEP_1" \
  -H "Content-Type: application/json"
```

## Option 3: Check Supabase Cache Directly

If the user has logged in before, check the cache:

```sql
SELECT 
  user_id,
  registration_number,
  batch_number,
  batch,
  courses,
  raw_data->>'studentName' as student_name,
  expires_at
FROM timetable_cache
WHERE registration_number LIKE '%4695%'
   OR raw_data->>'studentName' ILIKE '%ansu%'
ORDER BY expires_at DESC;
```

## Option 4: Check VPS Logs

SSH into VPS and check recent timetable fetches:
```bash
ssh root@65.20.84.46
journalctl -u gradex-backend -f | grep -i "timetable\|batch"
```

## What the Schedule Data Contains

The timetable response includes:
- `regNumber`: Registration number
- `studentName`: Student name
- `batchNumber`: Batch (1 or 2) - **NOW INVERTED**
- `batch`: Full batch string
- `academicYear`: Academic year
- `courses`: Array of courses with:
  - `code`: Course code
  - `title`: Course title
  - `slot`: Slot code (e.g., "A", "B", "P9-P10-")
  - `room`: Room number
  - `faculty`: Faculty name
- `schedule`: Day-wise schedule (if generated)

## Important Notes

1. **Batch Inversion**: The system now inverts batches:
   - SRM shows "Batch: 1" → System uses Batch 2
   - SRM shows "Batch: 2" → System uses Batch 1

2. **Cache**: Timetable is cached for 7 days in Supabase

3. **Slot Mapping**: Uses `batch1_slots.json` or `batch2_slots.json` based on inverted batch

