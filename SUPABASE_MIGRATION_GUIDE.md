# Supabase Migration Guide - What to Run

## 🎯 Quick Decision Tree

### Step 1: Check if GroupGrid tables exist

Run this query in Supabase SQL Editor to check:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'group_formations');
```

**If NO tables exist or you see errors:**
→ Run: **`021_complete_groupgrid_setup.sql`** (all-in-one, safest option)

**If tables exist but you get "Could not find relationship" error:**
→ Run: **`018_fix_groups_group_members_relationship.sql`**

---

### Step 2: Check if srm_cookies table exists

Run this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'srm_cookies';
```

**If table does NOT exist:**
→ Run: **`017_create_srm_cookies_table.sql`**

**If table EXISTS with old schema (has `user_email` column):**
→ Run: **`022_update_srm_cookies_for_user_login.sql`**

**If table EXISTS and already has `user_id` column:**
→ You're good! No migration needed for SRM cookies.

---

## 📋 Recommended Migration Order

### Option A: Fresh Setup (No tables exist)

Run these in order:

1. **`021_complete_groupgrid_setup.sql`**
   - Creates all GroupGrid tables
   - Fixes relationships
   - Sets up RLS policies

2. **`017_create_srm_cookies_table.sql`**
   - Creates SRM cookies table for user-based login
   - Sets up indexes and triggers

### Option B: Existing GroupGrid, Need SRM Cookies

1. **`017_create_srm_cookies_table.sql`** (if table doesn't exist)
   - OR **`022_update_srm_cookies_for_user_login.sql`** (if table exists with old schema)

### Option C: Fix Broken Relationship

If you only get the "Could not find relationship" error:

1. **`018_fix_groups_group_members_relationship.sql`**
   - Fixes the foreign key relationship
   - Ensures Supabase recognizes the relationship

---

## 🔍 Diagnostic Script (Optional)

If you're unsure of your current state, run:

**`019_diagnose_schema.sql`**
- Shows which tables exist
- Shows which foreign keys exist
- Shows which indexes exist
- Helps identify what's missing

---

## ✅ Verification After Running Migrations

After running migrations, verify with:

```sql
-- Check GroupGrid tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('groups', 'group_members', 'group_formations', 'sections', 'subjects', 'students', 'group_student_members');

-- Check foreign key relationship
SELECT 
  tc.constraint_name, 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name = 'group_members'
  AND ccu.table_name = 'groups';

-- Check SRM cookies table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'srm_cookies'
ORDER BY ordinal_position;
```

---

## 🚨 Most Common Scenario

**If you're getting "Could not find relationship" error:**

1. Run: **`018_fix_groups_group_members_relationship.sql`**

**If you're setting up SRM attendance for the first time:**

1. Run: **`017_create_srm_cookies_table.sql`**

That's it!

