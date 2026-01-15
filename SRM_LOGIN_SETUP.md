# SRM Login System - SQL Migration Guide

## 📋 Which SQL Files to Run

For the **user-based login system**, you need to run the following migrations **in order**:

### ✅ **Required Migration (Choose Based on Your Situation)**

#### **Option 1: Fresh Install (Table doesn't exist yet)**

Run **ONE** file:
- **`017_create_srm_cookies_table.sql`** ✅

This creates the `srm_cookies` table with the correct user_id-based schema.

#### **Option 2: Existing Installation (Table already exists)**

Run **ONE** file:
- **`022_update_srm_cookies_for_user_login.sql`** ✅

This updates the existing table from email-based to user_id-based schema.

#### **Option 3: Not Sure / Want to Be Safe (Recommended)**

Run **BOTH** in order (022 is idempotent and checks for existing columns):
1. **`017_create_srm_cookies_table.sql`** - Creates table if it doesn't exist
2. **`022_update_srm_cookies_for_user_login.sql`** - Updates schema if needed

---

## 🚀 Quick Setup Instructions

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**

### Step 2: Run Migration(s)

**For Fresh Install:**
```sql
-- Copy and paste contents of: supabase/migrations/017_create_srm_cookies_table.sql
-- Click "Run"
```

**For Existing Table:**
```sql
-- Copy and paste contents of: supabase/migrations/022_update_srm_cookies_for_user_login.sql
-- Click "Run"
```

### Step 3: Verify Setup

Run this verification query:
```sql
-- Check if table exists with correct columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'srm_cookies'
ORDER BY ordinal_position;
```

**Expected columns:**
- ✅ `id` (uuid)
- ✅ `user_id` (uuid, NOT NULL, UNIQUE)
- ✅ `srm_user_id` (text, NOT NULL)
- ✅ `cookies_json` (text, NOT NULL)
- ✅ `expires_at` (timestamptz, nullable)
- ✅ `last_validated_at` (timestamptz, nullable)
- ✅ `last_used_at` (timestamptz)
- ✅ `created_at` (timestamptz)
- ✅ `updated_at` (timestamptz)

---

## ✅ What These Migrations Do

### `017_create_srm_cookies_table.sql`
- Creates `srm_cookies` table with user_id-based schema
- Creates indexes for fast lookups
- Sets up RLS policies
- Creates triggers for `updated_at`
- **No passwords stored** - only session cookies

### `022_update_srm_cookies_for_user_login.sql`
- Adds `user_id`, `srm_user_id`, `last_validated_at` columns (if missing)
- Migrates existing `user_email` data to `srm_user_id`
- Updates indexes
- Adds unique constraint on `user_id`
- Updates comments/documentation

---

## 🔍 Check Current State

Before running migrations, check if the table exists:

```sql
-- Check if table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'srm_cookies'
);
```

- **Returns `true`** → Table exists → Run `022_update_srm_cookies_for_user_login.sql`
- **Returns `false`** → Table doesn't exist → Run `017_create_srm_cookies_table.sql`

---

## ⚠️ Important Notes

1. **Passwords are NEVER stored** - Only session cookies are stored
2. **No data loss** - Migration preserves existing cookie data
3. **Idempotent** - Both migrations can be run multiple times safely
4. **Backup recommended** - Always backup your database before running migrations in production

---

## 🧪 After Migration: Test Login

Once migrations are complete, test the login endpoint:

```bash
POST /api/srm/login
Content-Type: application/json

{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "srmUserId": "user@srmist.edu.in",
  "password": "your-password"
}
```

---

## 📝 Summary

**Minimum required:** Run **ONE** of these:
- ✅ `017_create_srm_cookies_table.sql` (if table doesn't exist)
- ✅ `022_update_srm_cookies_for_user_login.sql` (if table exists)

**Recommended:** Run both in order for maximum safety (both are idempotent).

**That's it!** No other migrations needed for the login system.

