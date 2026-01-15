# 🚀 Quick Setup Guide

## ✅ What's Done

- ✅ VPS Login Service deployed and running
- ✅ GradeX integration code added
- ✅ Automatic SRM login after signup/signin
- ✅ Silent credential storage in Supabase

## 🔧 What You Need to Do

### Step 1: Run Database Migration

**Go to Supabase Dashboard:**
1. https://supabase.com/dashboard/project/phlggcheaajkupppozho
2. **SQL Editor** → **New Query**
3. Paste and run:

```sql
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS encrypted_password TEXT,
ADD COLUMN IF NOT EXISTS password_iv TEXT,
ADD COLUMN IF NOT EXISTS password_tag TEXT;
```

### Step 2: Test the Integration

1. **Start GradeX** (if not running):
   ```bash
   cd GradeX
   npm run dev
   ```

2. **Go to:** http://localhost:5173/srm-login

3. **Sign up/Login** with SRM credentials

4. **Watch the magic:**
   - ✅ Automatically connects to VPS
   - ✅ Logs into SRM Academia
   - ✅ Saves credentials to Supabase
   - ✅ Redirects to Attendance

## 📋 Service Status

- **VPS Service:** ✅ Running at http://65.20.84.46:5000
- **API Key:** `32631058927400e8e13cd7a7c35cf3381ffc2af66b926a3d79c2b28403769f73`
- **Database:** Need to run migration (Step 1 above)

## 🎯 How It Works

1. User signs up/logs in → Supabase Auth
2. **Automatic (silent):**
   - Calls VPS login service
   - Logs into SRM Academia
   - Gets cookies
   - Encrypts & saves to Supabase
3. User redirected to Attendance page

**No manual steps needed!** Everything happens automatically.

## 📁 Files Changed

- ✅ `src/components/SRMLogin.jsx` - Auto-login integration
- ✅ `src/lib/vps-service.js` - VPS service client
- ✅ `src/lib/encryption.js` - Password encryption
- ✅ `src/lib/supabase.js` - Helper functions

## 🔍 Troubleshooting

**Migration not applied?**
- Run SQL in Supabase dashboard (see Step 1)

**VPS not responding?**
- Check: `curl http://65.20.84.46:5000/health`
- Restart: `ssh root@65.20.84.46 'pm2 restart srm-login'`

**Credentials not saving?**
- Check browser console for errors
- Verify migration ran successfully
- Check Supabase `users` table

---

**Ready to test!** Just run the migration and try signing up. 🎉

