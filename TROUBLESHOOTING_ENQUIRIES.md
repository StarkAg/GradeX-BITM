# Troubleshooting Enquiry Logging

If enquiries are not showing up in Supabase, follow these steps:

## ✅ Step 1: Check if Table Exists

1. Go to your Supabase project
2. Navigate to **Table Editor**
3. Look for a table named `enquiries`

**If the table doesn't exist:**
- Go to **SQL Editor**
- Copy and paste the contents of `create-enquiries-table.sql`
- Click **Run**
- Verify the table now exists

## ✅ Step 2: Check Vercel Environment Variables

Make sure these are set in Vercel:

1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Verify these variables exist:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_ANON_KEY` - Your Supabase anon/public key

**If they're missing:**
- Add them in Vercel
- Redeploy your project

## ✅ Step 3: Check Browser Console

1. Open your deployed app
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Search for a student's seat
5. Look for these messages:
   - ✅ `✅ Enquiry logged successfully` - Success!
   - ❌ `❌ Failed to log enquiry` - There's an error (check the error details)

## ✅ Step 4: Check Vercel Logs

1. Go to Vercel → Your Project → **Logs**
2. Search for `[log-enquiry]`
3. Look for:
   - `[log-enquiry] Received enquiry` - API received the request
   - `[log-enquiry] ✅ Successfully logged enquiry` - Insert succeeded
   - `[log-enquiry] Supabase insert error` - Insert failed (check error details)

## ✅ Step 5: Test the API Endpoint Directly

Test if the API endpoint is working:

```bash
curl -X POST https://your-app.vercel.app/api/log-enquiry \
  -H "Content-Type: application/json" \
  -d '{
    "register_number": "TEST_RA_12345",
    "search_date": "01/01/2025",
    "results_found": true,
    "result_count": 1,
    "campuses": ["Main Campus"],
    "use_live_api": true
  }'
```

**Expected response:**
```json
{
  "status": "success",
  "id": 123,
  "message": "Enquiry logged successfully"
}
```

**If you get an error:**
- Check the error message
- Common errors:
  - `Supabase not configured` → Environment variables not set
  - `Failed to log enquiry` → Check Supabase error details
  - `Table "enquiries" does not exist` → Run the SQL script

## ✅ Step 6: Check Row Level Security (RLS)

The RLS policy should allow public inserts. Verify:

1. Go to Supabase → **Table Editor** → `enquiries`
2. Click on **Policies** tab
3. You should see:
   - **Allow public insert access** - Policy for INSERT with `WITH CHECK (true)`

**If the policy doesn't exist or is blocking:**
- Run the SQL from `create-enquiries-table.sql` again
- This will recreate the policy

## ✅ Step 7: Run Test Script (Local)

To test locally:

```bash
node test-enquiry-logging.js
```

This will:
- Check if Supabase is configured
- Check if the table exists
- Try to insert a test record
- Clean up the test record

## Common Issues & Solutions

### Issue: "Table does not exist"
**Solution:** Run `create-enquiries-table.sql` in Supabase SQL Editor

### Issue: "Supabase not configured"
**Solution:** Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel environment variables

### Issue: "Permission denied" or "Row Level Security policy violation"
**Solution:** 
- Run the SQL script again to ensure RLS policy allows public inserts
- Check that the policy `Allow public insert access` exists and is active

### Issue: Enquiries appear in logs but not in table
**Solution:**
- Check if you're looking at the right Supabase project
- Check if you have the right permissions to view the table
- The RLS policy blocks anonymous SELECT, so you need to use the service role key or view via Supabase dashboard

### Issue: No console messages at all
**Solution:**
- Make sure the code is deployed
- Check if `logEnquiry` function is being called (search for "Log successful enquiry" in code)
- Check browser console for JavaScript errors

## Fix RLS Policy Issue

If you see error: `"new row violates row-level security policy"`:

1. Go to Supabase → **SQL Editor**
2. Copy and run the SQL from `fix-enquiries-rls.sql`
3. This will fix the RLS policies to allow public inserts

**Or manually run:**
```sql
-- Drop and recreate the insert policy
DROP POLICY IF EXISTS "Allow public insert access" ON enquiries;
CREATE POLICY "Allow public insert access" ON enquiries
  FOR INSERT
  TO anon, authenticated, public
  WITH CHECK (true);
```

## Quick Verification Query

Run this in Supabase SQL Editor to check recent enquiries:

```sql
SELECT 
  id,
  register_number,
  search_date,
  results_found,
  result_count,
  campuses,
  searched_at
FROM enquiries
ORDER BY searched_at DESC
LIMIT 10;
```

If you see results, logging is working! ✅

## Still Not Working?

1. Check Vercel function logs for detailed error messages
2. Check Supabase logs for database errors
3. Verify the Supabase project URL and keys are correct
4. Try inserting a test record directly in Supabase to verify the table works

