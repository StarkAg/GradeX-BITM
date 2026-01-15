# How to Get Timetable

## Option 1: Via Web Interface (Recommended)
Visit: **https://www.gradex.bond/schedule**

This will:
- Check if you're logged in
- Fetch cached timetable from Supabase (if available)
- Or fetch fresh timetable from SRM via Go backend
- Display the timetable with all courses

---

## Option 2: Via API Endpoint

### For a specific user:
```bash
# Replace USER_ID with actual user ID
curl "https://www.gradex.bond/api/srm/timetable?userId=USER_ID"
```

### Example:
```bash
curl "https://www.gradex.bond/api/srm/timetable?userId=a2023cca-9551-4ca6-a6eb-d3729d7a0047"
```

**Response format:**
```json
{
  "success": true,
  "timetable": {
    "regNumber": "RA2311003012212",
    "studentName": "Student Name",
    "academicYear": "AY2025-26-EVEN",
    "batchNumber": 2,
    "courses": [
      {
        "code": "21CSC303J",
        "title": "Software Engineering and Project Management",
        "slot": "P37-P38",
        "room": "TP616",
        ...
      }
    ]
  },
  "cached": false
}
```

---

## Option 3: Query Supabase Cache Directly

If you have Supabase access, you can query the `timetable_cache` table:

```sql
SELECT 
  user_id,
  registration_number,
  courses,
  raw_data,
  expires_at
FROM timetable_cache
WHERE registration_number = 'RA2311003012212'
  AND expires_at > NOW();
```

---

## Option 4: Check VPS Logs

SSH into VPS and check logs:
```bash
ssh root@65.20.84.46
journalctl -u gradex-backend -f
# Or check timetable cache
```

---

## For Student RA2311003012212

After the trailing hyphen fix, the course with slot "P37-P38-" should now:
1. Normalize to "P37-P38"
2. Match the exact slot in batch2_slots.json
3. Display in Day 4, Periods 7-8

To verify:
1. Visit https://www.gradex.bond/schedule
2. Login if needed
3. Check if the course "21CSC303J Software Engineering and Project Management" appears in Day 4, Periods 7-8

---

## Troubleshooting

If timetable doesn't show:
1. Check browser console for errors
2. Verify user is logged in (check localStorage for `gradex_user_id`)
3. Check if cache exists in Supabase
4. Verify Go backend is running on VPS
5. Check network tab for API responses

