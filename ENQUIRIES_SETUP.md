# Enquiries/Searches Tracking Setup

This document explains how to set up user enquiry tracking in Supabase.

## Overview

Every time a user searches for their seating arrangement, the system logs their enquiry to Supabase. This provides analytics on:
- How many students are searching
- Which dates are most searched
- Success rate of searches
- Which campuses are most popular
- Error patterns

## Step 1: Create the Enquiries Table

1. Go to your Supabase project
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `create-enquiries-table.sql`
5. Click **Run**

This creates the `enquiries` table with:
- `register_number`: The RA number searched
- `search_date`: The date they searched for
- `searched_at`: Timestamp of the search
- `results_found`: Whether results were found
- `result_count`: Number of seats found
- `campuses`: Array of campus names with results
- `rooms`: Array with single room number (e.g., ["TP-401"]) - one room per person
- `venues`: Array with single venue/building name (e.g., ["Tech Park"]) - one venue per person
- `floors`: Array with single floor number (e.g., ["4th"]) - one floor per person
- `use_live_api`: Whether live API or static data was used
- `error_message`: Any error that occurred
- `ip_address`: User's IP (optional, for analytics)
- `user_agent`: Browser info (optional, for analytics)

**Note:** If you already have the `enquiries` table, run the migration script `migrations/add-rooms-venues-to-enquiries.sql` to add the `rooms` and `venues` columns.

## Step 2: Verify Setup

After creating the table, verify it exists:

1. Go to **Table Editor** → **enquiries**
2. You should see an empty table with the columns listed above

## Step 3: Test Logging

1. Deploy your code (or test locally)
2. Search for a student's seat using the app
3. Go back to Supabase → **Table Editor** → **enquiries**
4. You should see a new row with the search details

## Querying Enquiries

### View All Enquiries

```sql
SELECT * FROM enquiries ORDER BY searched_at DESC LIMIT 100;
```

### Search Success Rate

```sql
SELECT 
  COUNT(*) as total_searches,
  COUNT(*) FILTER (WHERE results_found = true) as successful,
  COUNT(*) FILTER (WHERE results_found = false) as failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE results_found = true) / COUNT(*), 2) as success_rate
FROM enquiries;
```

### Most Searched Dates

```sql
SELECT 
  search_date,
  COUNT(*) as search_count
FROM enquiries
WHERE search_date IS NOT NULL
GROUP BY search_date
ORDER BY search_count DESC
LIMIT 20;
```

### Most Active Students (by RA)

```sql
SELECT 
  register_number,
  COUNT(*) as search_count,
  COUNT(*) FILTER (WHERE results_found = true) as successful_searches
FROM enquiries
GROUP BY register_number
ORDER BY search_count DESC
LIMIT 20;
```

### Campus Popularity

```sql
SELECT 
  unnest(campuses) as campus,
  COUNT(*) as result_count
FROM enquiries
WHERE results_found = true
GROUP BY campus
ORDER BY result_count DESC;
```

### Search Trends Over Time

```sql
SELECT 
  DATE(searched_at) as date,
  COUNT(*) as searches,
  COUNT(*) FILTER (WHERE results_found = true) as successful
FROM enquiries
GROUP BY DATE(searched_at)
ORDER BY date DESC
LIMIT 30;
```

### Common Errors

```sql
SELECT 
  error_message,
  COUNT(*) as error_count
FROM enquiries
WHERE error_message IS NOT NULL
GROUP BY error_message
ORDER BY error_count DESC;
```

## Privacy Considerations

The table stores:
- ✅ Full RA numbers (for analytics)
- ✅ Search dates
- ✅ IP addresses (optional)
- ✅ User agents (optional)

If you need to anonymize data:
- Hash RA numbers: Use `md5()` or `sha256()` on register_number
- Remove IP addresses: Set `ip_address = NULL` in policy
- Remove user agents: Set `user_agent = NULL` in policy

### Anonymize Existing Data

```sql
-- Hash RA numbers (one-way, irreversible)
UPDATE enquiries 
SET register_number = encode(digest(register_number, 'sha256'), 'hex')
WHERE register_number NOT LIKE 'hash:%';

-- Remove IP addresses
UPDATE enquiries SET ip_address = NULL;

-- Remove user agents
UPDATE enquiries SET user_agent = NULL;
```

## Automatic Cleanup

To automatically delete old enquiries (optional):

```sql
-- Create a function to delete enquiries older than 90 days
CREATE OR REPLACE FUNCTION cleanup_old_enquiries()
RETURNS void AS $$
BEGIN
  DELETE FROM enquiries 
  WHERE searched_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- Schedule it (requires pg_cron extension)
SELECT cron.schedule('cleanup-enquiries', '0 2 * * *', 'SELECT cleanup_old_enquiries()');
```

## Row Level Security

The table is configured with RLS:
- **Public INSERT**: Anyone can log enquiries (needed for the API)
- **Admin SELECT**: Only service role key can read enquiries (for privacy)

This means:
- ✅ Users can log their searches via the API
- ✅ Only admins (you) can view the data in Supabase dashboard
- ❌ Regular users cannot read other users' search data

## Exporting Data

To export enquiries to CSV:

1. Go to **Table Editor** → **enquiries**
2. Click **Export** → **CSV**
3. Select columns and filters as needed

Or use SQL:

```sql
-- Export to CSV (in Supabase SQL editor, results can be downloaded)
COPY (
  SELECT * FROM enquiries ORDER BY searched_at DESC
) TO STDOUT WITH CSV HEADER;
```

