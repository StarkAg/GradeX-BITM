# GradeX Serverless Integration Guide

This guide shows you how to integrate the serverless backend (Supabase) with your current GradeX React app.

## 🎯 Overview

Instead of needing the Arc backend server, we'll use:
- **Supabase** for database and authentication
- **Supabase Edge Functions** for background data syncing
- **Cookie-based authentication** (one-time capture, reusable)

## 📋 Prerequisites

1. A Supabase account (free tier is fine): https://supabase.com
2. Node.js and npm installed
3. Deno installed (for cookie capture script)

## 🚀 Step-by-Step Setup

### Step 1: Create Supabase Project (5 minutes)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: `gradex`
   - Database Password: (choose a strong password)
   - Region: (choose closest to you)
4. Wait ~2 minutes for project to be created

### Step 2: Run Database Migrations (5 minutes)

1. In Supabase Dashboard → SQL Editor
2. Create a new query
3. Copy and paste the contents of each migration file (from `GradeX-Serverless/supabase/migrations/`):
   - `001_initial_schema.sql` - Creates tables
   - `002_rls_policies.sql` - Sets up security
   - `003_cron_setup.sql` - Sets up background jobs (if you want auto-sync)

4. Run each query one by one (click "Run" button)

### Step 3: Enable Extensions (2 minutes)

1. Go to Database → Extensions
2. Enable these extensions:
   - `pg_cron` (for scheduled jobs)
   - `pg_net` (for HTTP requests in cron jobs)

### Step 4: Get API Keys (1 minute)

1. Go to Settings → API
2. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### Step 5: Configure GradeX App (2 minutes)

1. In the `GradeX` folder, create a `.env` file:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your Supabase credentials:
   ```
   VITE_SUPABASE_URL=https://xxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   ```

3. Restart your dev server:
   ```bash
   npm run dev
   ```

### Step 6: Deploy Edge Functions (10 minutes)

These functions run in the background to sync SRM data:

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   cd GradeX-Serverless
   supabase link --project-ref YOUR_PROJECT_REF
   # Find PROJECT_REF in Supabase Dashboard → Settings → General → Reference ID
   ```

4. Generate encryption key:
   ```bash
   # Run the encryption script to generate a key
   deno run supabase/functions/_shared/encryption.ts
   # Copy the generated key
   ```

5. Set encryption key as secret:
   ```bash
   supabase secrets set COOKIE_ENCRYPTION_KEY="your_generated_key_here"
   ```

6. Deploy Edge Functions:
   ```bash
   supabase functions deploy sync_attendance
   supabase functions deploy sync_timetable
   supabase functions deploy sync_marks
   ```

### Step 7: Create Cookie Capture Script (5 minutes)

The cookie capture script runs LOCALLY (not deployed) to capture SRM login cookies.

1. Copy the script from `GradeX-Serverless/scripts/capture-cookies.ts` to `GradeX/scripts/`
2. Update it with your Supabase credentials
3. Install Playwright for Deno:
   ```bash
   # The script uses Playwright from Deno, already configured
   ```

4. Run it:
   ```bash
   cd GradeX
   deno run --allow-all scripts/capture-cookies.ts
   ```

### Step 8: Test the Integration

1. **Sign up** a user in GradeX (or use Supabase Auth)
2. **Run cookie capture script** for that user
3. **Wait for sync** (or manually trigger Edge Function)
4. **View attendance** in GradeX app

## 🔄 Workflow

### First-Time Setup (One-time per user):

```
1. User signs up → Creates account in Supabase Auth
2. User runs capture-cookies.ts script
   ├─ Opens browser
   ├─ Logs into SRM Academia (manual CAPTCHA/OTP)
   ├─ Extracts cookies
   ├─ Encrypts cookies
   └─ Uploads to Supabase
3. ✅ Setup complete!
```

### Regular Usage (Automatic):

```
1. Supabase Cron Job (every 6 hours)
   └─ Triggers Edge Functions
      ├─ sync_attendance
      ├─ sync_timetable
      └─ sync_marks

2. Edge Functions
   ├─ Decrypt cookies
   ├─ Fetch from SRM Academia (using cookies)
   ├─ Parse HTML
   └─ Store in Supabase

3. GradeX App
   └─ Reads cached data from Supabase (<500ms)
```

## 📁 File Structure

After integration, your GradeX app will have:

```
GradeX/
├── src/
│   ├── lib/
│   │   └── supabase.js          ← Supabase client
│   ├── components/
│   │   ├── SRMLogin.jsx         ← Updated for Supabase Auth
│   │   └── Attendance.jsx       ← Fetches from Supabase
│   └── ...
├── scripts/
│   └── capture-cookies.ts       ← Local script (one-time)
├── .env                         ← Supabase credentials
└── ...
```

## 🔐 Security Notes

- **Cookies are encrypted** with AES-256-GCM before storage
- **Never expose** the encryption key to frontend
- **RLS policies** ensure users can only see their own data
- **Cookies expire** after 30-90 days (user needs to re-capture)

## 🐛 Troubleshooting

### "Supabase client not initialized"
- Check `.env` file exists and has correct values
- Restart dev server after adding `.env`

### "User not authenticated"
- Make sure Supabase Auth is set up
- Check RLS policies are correct

### "No data showing"
- Check Edge Functions are deployed
- Manually trigger sync function
- Check browser console for errors

### "Cookie capture script fails"
- Make sure Deno is installed
- Check internet connection
- Verify SRM credentials are correct

## 📚 Next Steps

1. **Set up Supabase Auth UI** (optional) - Use Supabase's pre-built auth components
2. **Add real-time updates** - Use Supabase Realtime for live data
3. **Deploy to Vercel** - Host your GradeX app on Vercel
4. **Add more features** - Marks, timetable, calendar, etc.

## 🆘 Need Help?

- Check `GradeX-Serverless/README.md` for detailed architecture
- Review `GradeX-Serverless/ARCHITECTURE.md` for design decisions
- See `GradeX-Serverless/QUICKSTART.md` for quick setup

