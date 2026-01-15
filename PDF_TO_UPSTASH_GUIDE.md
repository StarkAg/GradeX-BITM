# PDF to Upstash Upload Guide

## Overview
This script parses the PDF seating arrangement file (`22.11.25%20FN%20(TP1).pdf`) and uploads it to Upstash Redis cache with a 1-day expiry.

## How It Works

1. **Parses PDF**: Extracts seating data from the PDF file
2. **Converts Format**: Transforms the data to match the cache system format (Map<RA, Array<matches>>)
3. **Uploads to Upstash**: Stores the data in Upstash Redis with a 1-day expiry (86400 seconds)

## Usage

### Prerequisites
- Upstash Redis credentials set in environment variables:
  - `UPSTASH_REDIS__KV_REST_API_URL` (or `UPSTASH_REDIS_REST_URL`)
  - `UPSTASH_REDIS__KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_TOKEN`)
- PDF file located at: `public/Sheets/22.11.25%20FN%20(TP1).pdf`

### Run the Script

```bash
node scripts/upload-pdf-to-upstash.js
```

### What It Does

1. **Reads the PDF**: `22.11.25%20FN%20(TP1).pdf`
   - Date: 22/11/2025
   - Session: Forenoon (FN)
   - Campus: Tech Park (TP1)

2. **Extracts Data**:
   - RA numbers
   - Room/Hall numbers
   - Seat numbers
   - Department codes
   - Subject codes

3. **Stores in Upstash**:
   - Cache Key: `campus_cache:22/11/2025`
   - Expiry: 1 day (86400 seconds)
   - Format: Same as `fetchAllCampusData` output

## Cache Structure

The data is stored in the same format as the existing cache system:

```javascript
{
  timestamp: number,
  data: {
    "RA2311003012233": [
      {
        ra: "RA2311003012233",
        session: "Forenoon",
        hall: "TP-401",
        bench: "12",
        department: "CSE",
        subjectCode: "21CSC301T",
        context: "CSE 21CSC301T RA2311003012233",
        matched: true,
        dateMatched: true,
        campus: "Tech Park",
        url: "https://examcell.srmist.edu.in/tp/seating/bench/fetch_data.php?dated=22/11/2025&session=FN"
      }
    ]
  }
}
```

## Integration with Existing Cache

The uploaded data will be automatically used by the existing cache system:
- When a user searches for an RA on 22/11/2025, the system will check the Upstash cache first
- If found (within 1 day), it returns immediately without fetching from external APIs
- This provides "ultrafast" responses for all RAs in the PDF

## Troubleshooting

### Error: "Upstash Redis credentials not found"
- Make sure environment variables are set correctly
- Check Vercel project settings or `.env.local` file

### Error: "PDF file not found"
- Ensure the PDF is located at: `public/Sheets/22.11.25%20FN%20(TP1).pdf`
- Check file permissions

### Data Not Showing Up
- Verify the cache key matches the date format: `22/11/2025`
- Check Upstash Redis dashboard to confirm data is stored
- Ensure expiry hasn't passed (1 day from upload time)

## Notes

- The script uses the existing PDF parsing logic from `parse-pdf-seating.js`
- The cache format matches `fetchAllCampusData` output exactly
- The expiry is set to 1 day (86400 seconds) as requested
- Multiple RAs can share the same room/seat if they appear multiple times in the PDF


