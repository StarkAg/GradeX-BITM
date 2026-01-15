# SRM Attendance System - User-Based Login Update

## ✅ Completed Updates

The SRM attendance scraping subsystem has been updated to support **user-based login** with strict security practices.

## 🔒 Security Features

- ✅ **Passwords NEVER stored** - Used only for login, then immediately discarded
- ✅ **Credentials NEVER logged** - No password data in logs
- ✅ **Credentials NEVER returned** - API responses never include passwords
- ✅ **Per-user cookie storage** - Each user's session cookies stored separately
- ✅ **Session validation** - Automatic detection of expired sessions
- ✅ **Re-authentication required** - Clear error when session expires

## 📋 Updated Architecture

### 1. User Authentication Flow

```
Frontend → POST /api/srm/login
  ├─ userId (internal app user ID)
  ├─ srmUserId (SRM login ID - email/username)
  └─ password (SRM password)

Backend:
  1. Perform HTTP login to SRM
  2. Capture session cookies
  3. Save cookies to Supabase (keyed by userId)
  4. Discard password (never stored)
  5. Return success/failure (no credentials)
```

### 2. Cookie Storage (Supabase)

Table: `srm_cookies`
- `user_id` (UUID) - Internal app user ID (PRIMARY KEY)
- `srm_user_id` (TEXT) - SRM login ID (for reference only)
- `cookies_json` (TEXT) - Serialized session cookies
- `expires_at` (TIMESTAMPTZ) - Cookie expiration (if known)
- `last_validated_at` (TIMESTAMPTZ) - Last session validation
- **NO PASSWORD COLUMN** - Passwords are never stored

### 3. Attendance Fetching Flow

```
GET /api/attendance?userId=<uuid>
  ↓
Load cookies from Supabase (by userId)
  ↓
Validate session
  ├─ Valid → Scrape attendance → Cache → Return
  └─ Expired → Return 401 "requiresLogin: true"
```

### 4. Session Management

- **On API call**: Load cookies → Validate → Use or request re-login
- **On expiration**: Delete cookies → Return "requiresLogin: true"
- **No silent retry**: Never attempts login without explicit credentials

## 📁 Updated Files

### Core Modules

1. **`srm-attendance/auth/login.js`**
   - Accepts `srmUserId` and `password`
   - Never logs password
   - Discards password after use
   - Returns `srmUserId` (not password) with success

2. **`srm-attendance/auth/cookies.js`** (Complete rewrite)
   - Uses `user_id` (UUID) instead of email
   - Stores `srm_user_id` for reference only
   - Per-user cookie operations
   - Security checks (no password data in cookies)

3. **`srm-attendance/cache/store.js`**
   - Updated to use `user_id` instead of email
   - Per-user cache storage

4. **`srm-attendance/orchestrator.js`** (Complete rewrite)
   - `performUserLogin()` - Accepts credentials, performs login, saves cookies
   - `scrapeAttendanceForUser()` - Uses stored cookies, requires valid session
   - `getAttendance()` - Returns cached or scraped data per user

5. **`srm-attendance/scheduler/job.js`** (Updated)
   - Scrapes all users with valid sessions
   - Handles `requiresLogin` flag
   - Can be configured with specific user IDs via `ATTENDANCE_USER_IDS`

### API Routes

1. **`api/srm-login.js`** (NEW)
   - `POST /api/srm/login`
   - Accepts: `{ userId, srmUserId, password }`
   - Returns: `{ success, message }` (no credentials)
   - Security: Validates inputs, never logs passwords

2. **`api/attendance.js`** (Updated)
   - `GET /api/attendance?userId=<uuid>`
   - Uses `userId` instead of email
   - Returns `requiresLogin: true` if session expired
   - Never exposes credentials

### Database

1. **`supabase/migrations/017_create_srm_cookies_table.sql`** (Updated)
   - Changed from `user_email` to `user_id` (UUID)
   - Added `srm_user_id` for reference
   - Added `last_validated_at` timestamp

2. **`supabase/migrations/022_update_srm_cookies_for_user_login.sql`** (NEW)
   - Migration script to update existing schema
   - Handles migration from email-based to user_id-based

## 🚀 Usage

### 1. User Login

```javascript
// Frontend
const response = await fetch('/api/srm/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user-uuid-here',      // Internal app user ID
    srmUserId: 'user@srmist.edu.in', // SRM login ID
    password: 'srm-password'         // SRM password (never stored)
  })
});

const result = await response.json();
// { success: true, message: 'Login successful. Session saved.' }
// OR
// { success: false, error: 'Invalid credentials' }
```

### 2. Get Attendance

```javascript
// Frontend
const response = await fetch('/api/attendance?userId=user-uuid-here');
const result = await response.json();

if (result.requiresLogin) {
  // Session expired - redirect to login
  console.log('Please login again');
} else if (result.success) {
  // Display attendance data
  console.log('Attendance:', result.data);
}
```

### 3. Background Scheduler

The scheduler automatically scrapes attendance for all users with valid sessions:

```env
# Optional: Specify user IDs to scrape (comma-separated)
ATTENDANCE_USER_IDS=uuid1,uuid2,uuid3

# Scrape interval (minutes)
ATTENDANCE_SCRAPE_INTERVAL=15
```

If `ATTENDANCE_USER_IDS` is not set, scheduler queries database for all users with valid (non-expired) sessions.

## 🔐 Security Checklist

- ✅ Passwords never stored in database
- ✅ Passwords never logged
- ✅ Passwords never returned in API responses
- ✅ Passwords discarded immediately after login
- ✅ Session cookies stored securely (encrypted by Supabase)
- ✅ Session validation before scraping
- ✅ Expired sessions deleted automatically
- ✅ Clear "requiresLogin" flag when session expires
- ✅ No silent retry without credentials

## ⚠️ Important Notes

1. **User ID Format**: Must be a valid UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)

2. **Session Expiration**: When session expires, user must call `/api/srm/login` again with credentials

3. **Scheduler**: Only scrapes users who have logged in at least once (have cookies in database)

4. **HTTP-Only**: System still uses HTTP-only scraping (no browser automation)

5. **Local Server Only**: Designed to run locally, not deployed to VPS

## 📝 Next Steps

1. **Run Migration**: Apply `supabase/migrations/022_update_srm_cookies_for_user_login.sql` to update schema
2. **Test Login**: Use `POST /api/srm/login` with test credentials
3. **Test Attendance**: Use `GET /api/attendance?userId=<uuid>` to fetch data
4. **Monitor Scheduler**: Check logs for scheduled scraping

## 🐛 Troubleshooting

### "No cookies found" / "requiresLogin: true"
- User needs to login first via `POST /api/srm/login`
- Session may have expired - user needs to re-login

### "Session expired"
- Cookies expired - delete cookies and re-login
- SRM session timeout - user needs to login again

### "Login failed"
- Check SRM credentials are correct
- Verify SRM login page is accessible
- Check if SRM requires JavaScript (system will report this clearly)

---

**Status**: ✅ User-based login system implemented with full security compliance
**Security**: ✅ Passwords never stored, logged, or exposed
**Architecture**: ✅ Per-user cookie storage and session management

