# Save Students to Section P2 - Guide

This guide explains how to save student data for Section "P2" to Supabase.

## Step 1: Run the Database Migration

First, you need to create the `students` table in Supabase:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/014_add_students_table.sql`
5. Click **Run**

This will create the `students` table with proper indexes and RLS policies.

## Step 2: Prepare Your Student Data

You have two options:

### Option A: Use the Parser Script (Recommended)

1. Open `scripts/parse-student-data.js`
2. Paste your student data in the `STUDENT_DATA_TEXT` variable (tab-separated format):
   ```
   RA2311003012184	UPASANA SINGH
   RA2311003012246	HARSH AGARWAL
   ```
3. Run: `node scripts/parse-student-data.js`
4. Copy the generated `STUDENTS_DATA` array
5. Paste it into `scripts/save-p2-students.js` (replace the existing array)

### Option B: Manual Format

Edit `scripts/save-p2-students.js` and add your students in this format:

```javascript
const STUDENTS_DATA = [
  { registration_number: 'RA2311003012184', name: 'UPASANA SINGH' },
  { registration_number: 'RA2311003012246', name: 'HARSH AGARWAL' },
  // Add more students...
];
```

## Step 3: Save Students to Supabase

1. Make sure your `.env` file has:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_ANON_KEY`)

2. Run the save script:
   ```bash
   node scripts/save-p2-students.js
   ```

The script will:
- ✅ Check if Section "P2" exists (create it if not)
- ✅ Insert all students linked to Section P2
- ✅ Handle duplicates gracefully (updates existing records)
- ✅ Show a summary of saved students

## Step 4: Verify in Supabase

1. Go to Supabase Dashboard → **Table Editor**
2. Open the `students` table
3. Filter by `section_id` (find P2's section ID from the `sections` table)
4. Verify all students are saved correctly

## Alternative: Use the API Endpoint

You can also use the API endpoint directly:

```javascript
const response = await fetch('/api/groupgrid?action=save-students', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    section_name: 'P2',
    students: [
      { registration_number: 'RA2311003012184', name: 'UPASANA SINGH' },
      { registration_number: 'RA2311003012246', name: 'HARSH AGARWAL' },
      // ... more students
    ]
  })
});
```

## Notes

- **Duplicates**: If a student with the same `registration_number` already exists in Section P2, it will be updated (not duplicated)
- **Section Creation**: If Section "P2" doesn't exist, the script will create it automatically
- **Validation**: Each student must have both `registration_number` and `name`

## Troubleshooting

### Error: "Section P2 not found"
- The script will create it automatically, but if it fails, manually create it in Supabase:
  ```sql
  INSERT INTO sections (name) VALUES ('P2');
  ```

### Error: "Students table does not exist"
- Run the migration file `supabase/migrations/014_add_students_table.sql` in Supabase SQL Editor

### Error: "SUPABASE_URL not found"
- Make sure your `.env` file has the correct Supabase credentials

