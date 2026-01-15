# Remove Supabase Auth - Setup Guide

This guide will help you migrate from Supabase Auth to direct email/password authentication.

## Step 1: Run Database Migration

You need to remove the foreign key constraint from the `users` table:

1. Go to your Supabase Dashboard: https://phlggcheaajkupppozho.supabase.co
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy and paste the contents of `supabase/migrations/005_remove_auth_dependency.sql`
5. Click **Run**

This will:
- Remove the foreign key constraint to `auth.users(id)`
- Allow the `users` table to use plain UUIDs without requiring Supabase Auth

## Step 2: Update RLS Policies (Optional)

If you want to keep Row-Level Security (RLS), you may need to adjust policies. However, since we're using the service role key from the frontend (via Supabase client), RLS policies using `auth.uid()` won't work.

You can either:
- **Option A**: Disable RLS on the `users` table (simpler, but less secure)
- **Option B**: Create custom policies that work with your email-based authentication

For now, the code should work because it uses the Supabase client with the service role key, which bypasses RLS.

## Step 3: Test the Login Flow

1. Start your dev server: `npm run dev`
2. Navigate to `/srm-login`
3. Click "Sign In"
4. Enter your email and password
5. The system will:
   - Create a new user if email doesn't exist
   - Verify password if user exists
   - Save encrypted password to Supabase
   - Get cookies from VPS service
   - Save cookies to Supabase

## What Changed

### Before (Supabase Auth):
- Required email confirmation
- Used `supabase.auth.signInWithPassword()`
- Used `supabase.auth.signUp()`
- User ID came from `auth.users` table

### After (Direct Auth):
- No email confirmation needed
- Direct authentication using `users` table
- Email as primary identifier
- UUID generated with `crypto.randomUUID()`
- Password encrypted and stored in `users` table
- Password verification by decrypting and comparing

## Notes

- Passwords are still encrypted using AES-256-GCM
- Email is used as the primary identifier
- User ID is a UUID stored in the `users` table
- Session is stored in localStorage (`gradex_user_email`, `gradex_user_id`)

