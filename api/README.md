# Seating Arrangement API

This API fetches exam seating information from SRM exam cell endpoints dynamically.

## Endpoints

### GET `/api/seating`

Fetches seating information for a given register number and date.

**Query Parameters:**
- `ra` (required): Register number (e.g., "RA23XXXX")
- `date` (optional): Exam date in DD-MM-YYYY or DD/MM/YYYY format

**Response:**
```json
{
  "status": "ok",
  "lastUpdated": "2025-11-16T10:15:00Z",
  "results": {
    "Main Campus": [
      {
        "matched": true,
        "session": "Forenoon",
        "hall": "S45",
        "bench": "A12",
        "context": "full text around RA",
        "url": "https://examcell.srmist.edu.in/main/seating/bench/report.php"
      }
    ],
    "Tech Park": [],
    "Biotech & Architecture": [],
    "University Building": []
  }
}
```

## Features

- **Multi-campus support**: Checks all 4 SRM campuses
- **Session detection**: Automatically detects Forenoon/Afternoon sessions
- **Smart caching**: 1-minute TTL cache to reduce load
- **Auto-retry**: Retries failed requests once
- **Polite delays**: 300-700ms delay between campus fetches
- **Error handling**: Graceful fallback on failures

## Architecture

- `seating-utils.js`: Core scraping and processing logic
- `seating.js`: Vercel serverless function handler

## Caching

Results are cached in-memory for 60 seconds to reduce API load. Cache is keyed by RA number and date combination.

