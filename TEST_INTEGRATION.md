# Test the Integration

## ✅ Migration Applied!
Database is ready with password storage columns.

## 🚀 GradeX is Starting...

The server should be running at: **http://localhost:5173**

## 🧪 Test Steps

### 1. Open GradeX

Go to: **http://localhost:5173/srm-login**

### 2. Sign Up / Login

1. Click **"Create Account"** or **"Sign In"**
2. Enter your SRM credentials:
   - **Email:** `ha1487@srmist.edu.in`
   - **Password:** `Stark@121`
   - **Registration Number:** `HA1487` (if signing up)

### 3. Watch What Happens

**Automatic Flow:**
- ✅ Creates/signs into Supabase account
- ✅ **Silently** connects to VPS login service
- ✅ **Automatically** logs into SRM Academia
- ✅ **Saves** encrypted cookies to Supabase
- ✅ **Saves** encrypted password to Supabase
- ✅ Redirects to Attendance page

### 4. Verify in Supabase

Check that credentials were saved:

1. Go to: https://supabase.com/dashboard/project/phlggcheaajkupppozho/editor
2. Open `users` table
3. Find your user (by email)
4. Check columns:
   - `encrypted_cookies` - Should have value
   - `encrypted_password` - Should have value
   - `cookie_iv`, `cookie_auth_tag` - Should have values
   - `password_iv`, `password_tag` - Should have values

### 5. Check Attendance

After redirect, the Attendance page should:
- Show your attendance data (if cookies work)
- Or show "No Attendance Data" with setup instructions

## 🔍 Debugging

### Check Browser Console

Open DevTools (F12) → Console tab:
- Look for: "SRM credentials saved successfully"
- Or any error messages

### Check VPS Service

```bash
curl http://65.20.84.46:5000/health
```

Should return:
```json
{"status":"ok","timestamp":"...","queue":{"pending":0,"size":0}}
```

### Check VPS Logs

```bash
ssh root@65.20.84.46 'pm2 logs srm-login --lines 50'
```

Look for login attempts with your email.

## ✅ Success Indicators

- ✅ User created in Supabase Auth
- ✅ Record in `users` table
- ✅ `encrypted_cookies` populated
- ✅ `encrypted_password` populated
- ✅ Redirected to Attendance page
- ✅ No errors in browser console

## 🎉 If Everything Works

You'll see:
1. Login form → Enter credentials
2. "Connecting to SRM Academia..." (progress)
3. "Success!" message
4. Automatic redirect to Attendance page
5. Your attendance data displayed (or "No data" with setup info)

---

**Ready to test!** Open http://localhost:5173/srm-login and sign up!

