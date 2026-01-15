# SRM Authentication & Data System - HARD RESET Summary

## Overview

Complete rebuild of SRM authentication and data fetching system using **Zoho's public HTTP endpoints only**. No browser automation, no UI scraping, no ML/AI.

## What Was Deleted

### Browser Automation Code (DELETED)
- ✅ `srm-timetable/auth/login.js` - Playwright-based login (DELETED)
- ✅ `srm-attendance/auth/login.js` - Old login implementation (DELETED)
- ✅ `srm-timetable/auth/cookies.js` - Duplicate cookie management (DELETED)
- ✅ `srm-attendance/auth/cookies.js` - Duplicate cookie management (DELETED)
- ✅ `srm-timetable/README.md` - Old documentation (DELETED)
- ✅ `SRM_TIMETABLE_QUICK_START.md` - Old quick start guide (DELETED)
- ✅ `package.json` - Removed `playwright` dependency

### Dependencies Removed
- ✅ `playwright@^1.57.0` - No longer needed

## What Was Built (NEW SYSTEM)

### New Architecture

```
srm-auth/
├── auth/
│   └── zohoAuth.js           # Zoho HTTP-only authentication flow
├── session/
│   └── cookieVault.js        # Server-side cookie management
└── fetchers/
    └── timetable.js          # HTTP-only timetable fetching
```

### New API Endpoints

1. **POST `/api/srm/auth?action=login`**
   - Full Zoho authentication flow
   - LOOKUP → (CAPTCHA?) → AUTH → SESSION_ESTABLISHED
   - Stores cookies server-side only

2. **GET `/api/srm/auth?action=captcha`**
   - Fetches CAPTCHA image if required

3. **GET `/api/srm/data?type=timetable`**
   - Uses stored cookies to fetch timetable
   - Returns `requiresLogin: true` if session expired

### Legacy Endpoints (Redirects)

- `/api/timetable` → Redirects to `/api/srm/data?type=timetable`
- `/api/timetable/login` → Redirects to `/api/srm/auth?action=login`
- `/api/srm/login` → Redirects to `/api/srm/auth?action=login`

## Zoho Authentication Flow

### State Machine

```
INIT → LOOKUP → (CAPTCHA?) → AUTH → SESSION_ESTABLISHED
```

### Step 1: LOOKUP
- **Endpoint**: `POST /signin/v2/lookup/{email}@srmist.edu.in`
- **Returns**: `identifier`, `digest`, `hipRequired` (CAPTCHA requirement)

### Step 2: CAPTCHA (if required)
- **Endpoint**: `GET /signin/v2/challenge?cdigest={cdigest}`
- **Returns**: CAPTCHA image (base64 encoded)

### Step 3: AUTH
- **Endpoint**: `POST /signin/v2/primary/{identifier}/password?digest={digest}`
- **Body**: `{ password, hip: { answer, cdigest } }` (if CAPTCHA required)
- **Returns**: Session cookies

## Security Implementation

### ✅ SECURITY RULES ENFORCED
- Passwords used ONLY in-memory
- Never stores or logs passwords
- Never exposes SRM cookies to frontend
- All client requests validated server-side
- Realistic headers (User-Agent, Origin, Referer)
- Rate-limiting (to be implemented)

### Cookie Management
- Cookies stored in Supabase `srm_cookies` table
- Per-user storage (by `user_id`)
- Tracks: `created_at`, `last_used_at`, `last_validated_at`, `expires_at`
- Automatic cleanup of expired sessions
- Never exposed to frontend

## Session Management

### Lifecycle
1. **Creation**: Login via Zoho auth flow → cookies stored
2. **Usage**: Load cookies from vault → make authenticated requests
3. **Validation**: Test request to SRM → check for login redirect
4. **Expiration**: Auto-detect and require re-login
5. **Cleanup**: Delete expired/invalid cookies

### Error States
- `INVALID_CREDENTIALS` → Wrong password
- `CAPTCHA_REQUIRED` → CAPTCHA challenge needed
- `SESSION_EXPIRED` → Cookies invalid, re-login required
- `UPSTREAM_ERROR` → SRM/Zoho service error
- **No silent failures**
- **No retries that could lock accounts**

## Module Separation (STRICT)

### AUTH Module (`srm-auth/auth/zohoAuth.js`)
- ✅ Handles Zoho authentication ONLY
- ✅ NO data fetching
- ✅ Returns cookies after successful auth
- ✅ Handles CAPTCHA if required

### SESSION Module (`srm-auth/session/cookieVault.js`)
- ✅ Manages cookies server-side ONLY
- ✅ NEVER exposes cookies to frontend
- ✅ Validates sessions
- ✅ Tracks session lifecycle

### FETCHERS Module (`srm-auth/fetchers/timetable.js`)
- ✅ HTTP-only data fetching
- ✅ Uses stored cookies from vault
- ✅ NO login logic
- ✅ NO browser automation
- ✅ Static HTML parsing (Cheerio only)

## Updated Modules

### Attendance System
- ✅ `srm-attendance/orchestrator.js` - Updated to use new Zoho auth
- ✅ `srm-attendance/scraper/attendance.js` - Already HTTP-only (no changes needed)
- ✅ `srm-attendance/scheduler/job.js` - Uses orchestrator (automatically updated)

## API Route Updates

### New Routes
- `api/srm-auth.js` - NEW: Main authentication endpoint
- `api/srm-data.js` - NEW: Data fetching endpoint

### Updated Routes
- `api/timetable.js` - Updated to redirect to new endpoints
- `api/srm-login.js` - Updated to redirect to new endpoints

### Server Configuration
- `server.js` - Updated to register new routes

## Comparison: Old vs New

### Old System (ClassPro-style)
- ❌ Browser automation (Playwright)
- ❌ UI scraping
- ❌ Cookies exposed to frontend
- ❌ Tightly coupled auth and data fetching
- ❌ Hardcoded endpoints and secrets

### New System (Professional)
- ✅ Pure HTTP requests
- ✅ Static HTML parsing (Cheerio)
- ✅ Cookies server-side only
- ✅ Clean separation of concerns
- ✅ State machine-based auth flow
- ✅ Zoho public endpoints only
- ✅ Better error handling
- ✅ More robust session management

## Testing

### Test Authentication Flow
```bash
# 1. Login
curl -X POST http://localhost:3000/api/srm/auth?action=login \
  -H "Content-Type: application/json" \
  -d '{"userId": "user-uuid", "email": "user@srmist.edu.in", "password": "password"}'

# 2. Fetch Timetable
curl "http://localhost:3000/api/srm/data?type=timetable&userId=user-uuid"
```

### Expected Behavior
- Login returns `SESSION_ESTABLISHED` state (no cookies in response)
- Fetch returns timetable data or `requiresLogin: true`
- Cookies are managed server-side only

## Next Steps

1. ✅ **DONE**: Implement Zoho authentication flow
2. ✅ **DONE**: Implement cookie vault (server-side only)
3. ✅ **DONE**: Implement timetable fetcher (HTTP-only)
4. ✅ **DONE**: Create API endpoints
5. ✅ **DONE**: Update legacy routes
6. ✅ **DONE**: Remove Playwright dependency
7. ⏳ **TODO**: Add rate-limiting
8. ⏳ **TODO**: Test with real SRM credentials
9. ⏳ **TODO**: Update frontend to use new endpoints (if needed)

## Critical Notes

⚠️ **Zoho Endpoints**: The actual Zoho endpoint URLs may need verification. The implementation uses:
- `https://accounts.zoho.com/signin/v2/lookup/{email}`
- `https://accounts.zoho.com/signin/v2/primary/{identifier}/password?digest={digest}`
- `https://accounts.zoho.com/signin/v2/challenge?cdigest={cdigest}`

⚠️ **Testing Required**: This system needs to be tested with real SRM credentials to verify the exact endpoint structure and response formats.

⚠️ **CAPTCHA Handling**: If SRM/Zoho requires CAPTCHA, the frontend needs to:
1. Display CAPTCHA image from `captchaUrl`
2. Get user input
3. Retry login with `captchaAnswer` parameter

## Files Changed

### Created
- `srm-auth/auth/zohoAuth.js`
- `srm-auth/session/cookieVault.js`
- `srm-auth/fetchers/timetable.js`
- `api/srm-auth.js`
- `api/srm-data.js`
- `srm-auth/README.md`
- `SRM_AUTH_RESET_SUMMARY.md`

### Deleted
- `srm-timetable/auth/login.js`
- `srm-attendance/auth/login.js`
- `srm-timetable/auth/cookies.js`
- `srm-attendance/auth/cookies.js`
- `srm-timetable/README.md`
- `SRM_TIMETABLE_QUICK_START.md`

### Updated
- `package.json` - Removed Playwright
- `api/timetable.js` - Redirects to new endpoints
- `api/srm-login.js` - Redirects to new endpoints
- `srm-attendance/orchestrator.js` - Uses new Zoho auth
- `server.js` - Registers new routes

