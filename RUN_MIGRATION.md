# Run Database Migration

## Add Password Storage Columns

You need to add columns to the `users` table in Supabase to store encrypted passwords.

### Option 1: Supabase Dashboard (Recommended)

1. Go to: https://supabase.com/dashboard/project/phlggcheaajkupppozho
2. Click **SQL Editor** in sidebar
3. Click **New Query**
4. Paste this SQL:

```sql
-- Add encrypted password storage to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS encrypted_password TEXT,
ADD COLUMN IF NOT EXISTS password_iv TEXT,
ADD COLUMN IF NOT EXISTS password_tag TEXT;

-- Add comments
COMMENT ON COLUMN public.users.encrypted_password IS 'AES-256-GCM encrypted SRM password (Base64)';
COMMENT ON COLUMN public.users.password_iv IS 'Initialization vector for password decryption';
COMMENT ON COLUMN public.users.password_tag IS 'Authentication tag for password decryption';
```

5. Click **Run**
6. Verify success: Check `users` table schema

### Option 2: Using Migration File

The migration is also available at:
```
GradeX-Serverless/supabase/migrations/004_add_password_storage.sql
```

Copy the contents and run in Supabase SQL Editor.

## Verify Migration

After running, verify columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('encrypted_password', 'password_iv', 'password_tag');
```

Should return 3 rows.

## Done!

After migration, the integration will automatically save encrypted passwords when users sign in.

