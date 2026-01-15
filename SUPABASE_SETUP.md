# Supabase Setup Guide for GradeX

This guide will help you set up Supabase to store student data instead of using JSON files.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: GradeX (or any name you prefer)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
5. Click "Create new project" and wait for it to initialize

## Step 2: Create the Students Table

1. In your Supabase project, go to **SQL Editor**
2. Click "New Query"
3. Paste this SQL:

```sql
-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  register_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_register_number ON students(register_number);

-- Enable Row Level Security (optional, but recommended)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows read access to everyone (for public API)
CREATE POLICY "Allow public read access" ON students
  FOR SELECT
  USING (true);
```

4. Click "Run" to execute the SQL

## Step 3: Get Your Supabase Credentials

1. In your Supabase project, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 4: Set Environment Variables

### For Local Development

Create a `.env.local` file in the project root:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### For Vercel Deployment

1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add these variables:
   - `SUPABASE_URL` = Your Supabase project URL
   - `SUPABASE_ANON_KEY` = Your Supabase anon key

## Step 5: Upload Data to Supabase

1. Make sure you have your `public/seat-data.json` file ready
2. Set the environment variables (see Step 4)
3. Run the upload script:

```bash
export SUPABASE_URL="https://xxxxx.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
node upload-to-supabase.js
```

The script will:
- Read `public/seat-data.json`
- Clear existing records (optional)
- Upload all student records to Supabase
- Verify the upload

## Step 6: Verify Setup

After uploading, you can verify in Supabase:

1. Go to **Table Editor** → **students**
2. You should see all your student records
3. Check that `register_number` and `name` columns are populated

## How It Works

- **Primary**: The app tries to load student data from Supabase first
- **Fallback**: If Supabase fails or is not configured, it falls back to JSON file
- **Caching**: Data is cached in memory for performance

## Troubleshooting

### "Supabase not configured"
- Make sure environment variables are set correctly
- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are in your `.env.local` or Vercel environment variables

### "Table does not exist"
- Run the SQL script from Step 2 to create the table

### "Permission denied"
- Check that Row Level Security policy allows SELECT operations
- Verify your anon key is correct

### "No data in Supabase"
- Run the upload script again
- Check that `public/seat-data.json` exists and has valid data

## Benefits of Using Supabase

✅ **Reliable**: No more file system access issues in Vercel  
✅ **Scalable**: Can handle thousands of records easily  
✅ **Fast**: Indexed database queries are faster than JSON parsing  
✅ **Manageable**: Easy to update/add records via Supabase dashboard  
✅ **Backup**: Data is automatically backed up by Supabase  

