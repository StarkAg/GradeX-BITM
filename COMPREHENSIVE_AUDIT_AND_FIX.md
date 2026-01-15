# GradeX Comprehensive Audit & Fix

## Executive Summary

**Status**: Project has architectural inconsistencies causing 406 errors, RLS blocking, and unstable behavior.

**Root Cause**: Mix of direct DB auth and Supabase Auth patterns, frontend accessing sensitive columns, and inconsistent query patterns.

**Solution**: Standardize on direct DB auth, move sensitive operations to backend, fix all queries to be RLS-safe.

---

## 🔴 CRITICAL ISSUES FOUND

### 1. **Frontend Accessing Sensitive Columns (RLS Blocking)**

**Problem**: Frontend tries to query `encrypted_cookies`, `password`, `cookie_iv`, `cookie_auth_tag` which RLS blocks even with permissive policies.

**Files Affected**:
- `src/lib/timetable-fetcher.js` (line 31): Queries `encrypted_cookies, cookie_iv, cookie_auth_tag`
- `src/lib/password-utils.js` (line 20): Queries `encrypted_password, password_iv, password_tag` (but password is plain text now!)

**Why It Fails**: 
- RLS policies are permissive (`USING (true)`) BUT Supabase PostgREST still enforces column-level security
- Frontend using `anon` key cannot access sensitive columns even with permissive RLS
- These columns should NEVER be queried from frontend

**Fix**: Remove all sensitive column queries from frontend. Use backend API routes.

---

### 2. **Password Utils References Non-Existent Encryption**

**Problem**: `src/lib/password-utils.js` tries to decrypt passwords, but:
- Passwords are stored as **plain text** (per user requirement)
- Encryption functions (`decryptPassword`) don't exist
- Code queries non-existent columns (`encrypted_password`, `password_iv`, `password_tag`)

**Fix**: Delete or rewrite `password-utils.js` to match plain text storage.

---

### 3. **Timetable Fetcher Uses Wrong Approach**

**Problem**: `src/lib/timetable-fetcher.js`:
- Tries to fetch cookies from frontend (will fail)
- References non-existent `/api/timetable` endpoint
- Should use VPS proxy instead

**Fix**: Update to use `/api/vps-timetable-proxy` (already exists).

---

### 4. **Inconsistent Query Patterns**

**Problem**: Some queries use `.single()`, some use `.maybeSingle()`, some query by `id`, some by `email`, some by both.

**Files with Issues**:
- Multiple files mix `id` and `email` queries
- Some use combined filters (`.eq('id', x).eq('email', y)`) which can cause 406

**Fix**: Standardize on:
- Always use `.maybeSingle()` (never `.single()`)
- Query by ONE identity source: `id` OR `email`, never both
- Use `id` when available (from localStorage), fallback to `email` only when needed

---

### 5. **Supabase Client Configuration**

**Problem**: `src/lib/supabase.js`:
- Configures Supabase Auth (autoRefreshToken, persistSession) but project doesn't use Auth
- Helper functions assume `auth.uid()` exists
- `getCurrentUser()` calls `supabase.auth.getUser()` which will always return null

**Fix**: Remove Auth config, update helpers for direct DB auth.

---

### 6. **Missing Backend API Routes**

**Problem**: Frontend expects endpoints that don't exist:
- `/api/timetable` (referenced in `timetable-fetcher.js`)

**Fix**: Use existing `/api/vps-timetable-proxy` or create missing routes.

---

## ✅ CORRECT ARCHITECTURE

### Authentication Flow (Current - Direct DB Auth)

```
User → Frontend (SRMLogin.jsx)
  → Creates/updates user in `users` table (anon key)
  → Calls VPS service via `/api/vps-login-proxy`
  → VPS logs into SRM Academia (Playwright)
  → VPS saves cookies to Supabase (service_role key)
  → Frontend tracks connection via localStorage
```

**Key Points**:
- ✅ Frontend uses `anon` key for user CRUD
- ✅ VPS uses `service_role` key for cookie storage
- ✅ Frontend NEVER queries sensitive columns
- ✅ Frontend tracks connection status via localStorage

---

## 🔧 FIXES TO IMPLEMENT

### Fix 1: Remove Sensitive Column Queries from Frontend

**File**: `src/lib/timetable-fetcher.js`

**Current (BROKEN)**:
```javascript
const { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('encrypted_cookies, cookie_iv, cookie_auth_tag, cookie_invalid') // ❌ RLS blocks this
  .eq('id', userId)
  .maybeSingle();
```

**Fixed**:
```javascript
// Don't query cookies from frontend - use VPS proxy instead
// This function should just check if user exists and has connection
const { data: userData, error: fetchError } = await supabase
  .from('users')
  .select('id, email') // ✅ Only non-sensitive columns
  .eq('id', userId)
  .maybeSingle();

// Then use VPS proxy to fetch timetable
const response = await fetch('/api/vps-timetable-proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: userData.email })
});
```

---

### Fix 2: Delete/Update Password Utils

**File**: `src/lib/password-utils.js`

**Problem**: References encryption that doesn't exist, queries non-existent columns.

**Fix**: Delete this file OR rewrite to match plain text storage:

```javascript
// If you need password retrieval (shouldn't be needed - VPS handles login)
export async function getPassword(userId) {
  // Don't query password from frontend - it's sensitive
  // VPS handles password verification during login
  throw new Error('Password retrieval not available from frontend');
}
```

**Better**: Delete the file entirely. Passwords are only used by VPS.

---

### Fix 3: Update Supabase Client Config

**File**: `src/lib/supabase.js`

**Current**:
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true, // ❌ Not using Auth
    persistSession: true,  // ❌ Not using Auth
    detectSessionInUrl: true // ❌ Not using Auth
  }
});
```

**Fixed**:
```javascript
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // No auth config - using direct DB auth
  // auth: {} // Remove or leave empty
});
```

**Also Fix Helper Functions**:
```javascript
// REMOVE or UPDATE:
export const getCurrentUser = async () => {
  // Don't use supabase.auth.getUser() - we don't use Auth
  // Instead, get from localStorage
  const userId = localStorage.getItem('gradex_user_id');
  const email = localStorage.getItem('gradex_user_email');
  return userId && email ? { id: userId, email } : null;
};
```

---

### Fix 4: Standardize All Queries

**Pattern to Follow**:
```javascript
// ✅ CORRECT: Query by single identity source, use maybeSingle
const { data, error } = await supabase
  .from('users')
  .select('id, email') // Only non-sensitive columns
  .eq('id', userId) // OR .eq('email', email) - never both
  .maybeSingle(); // Always maybeSingle, never single

// ❌ WRONG: Combined filters
.eq('id', userId).eq('email', email) // Can cause 406

// ❌ WRONG: Using single()
.single() // Throws error if no row found

// ❌ WRONG: Querying sensitive columns
.select('encrypted_cookies, password') // RLS blocks this
```

---

### Fix 5: Update Timetable Component

**File**: `src/components/Timetable.jsx`

**Current**: Uses `timetable-fetcher.js` which tries to query cookies.

**Fixed**: Use VPS proxy directly:

```javascript
async function fetchTimetableFromSRM() {
  const userEmail = localStorage.getItem('gradex_user_email');
  if (!userEmail) {
    setError('Please log in to view your timetable');
    return;
  }

  setFetching(true);
  setError(null);

  try {
    const response = await fetch('/api/vps-timetable-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch timetable');
    }

    const { success, data } = await response.json();
    if (!success || !data) {
      throw new Error('No timetable data received');
    }

    // Process data.data (contains studentInfo and courses)
    setTimetableData(data);
    // ... rest of processing
  } catch (err) {
    setError(err.message);
  } finally {
    setFetching(false);
  }
}
```

---

### Fix 6: Verify RLS Policies

**File**: `supabase/COMPLETE_SETUP.sql`

**Current Policies** (should be correct):
- `Allow users to read own row by id` - `USING (true)` ✅
- `Allow public inserts to users` - `WITH CHECK (true)` ✅
- `Allow users to update own row by id` - `USING (true), WITH CHECK (true)` ✅
- `Service role full access to users` - `USING (auth.jwt()->>'role' = 'service_role')` ✅

**Issue**: Even with permissive policies, Supabase PostgREST enforces column-level security for sensitive columns when using `anon` key.

**Solution**: Frontend should NEVER query sensitive columns. Only `service_role` (VPS) can access them.

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Remove Frontend Access to Sensitive Data

- [ ] Update `src/lib/timetable-fetcher.js` - remove cookie queries, use VPS proxy
- [ ] Delete or rewrite `src/lib/password-utils.js` - remove encryption references
- [ ] Update `src/lib/supabase.js` - remove Auth config, fix helpers
- [ ] Update `src/components/Timetable.jsx` - use VPS proxy directly
- [ ] Search for all `.select('encrypted_cookies')` and remove
- [ ] Search for all `.select('password')` and remove
- [ ] Search for all `.select('cookie_iv')` and remove

### Phase 2: Standardize Queries

- [ ] Replace all `.single()` with `.maybeSingle()`
- [ ] Remove all combined filters (`.eq('id', x).eq('email', y)`)
- [ ] Ensure queries use single identity source (id OR email)
- [ ] Verify all queries only select non-sensitive columns

### Phase 3: Verify Backend Routes

- [ ] Verify `/api/vps-login-proxy` works
- [ ] Verify `/api/vps-timetable-proxy` works
- [ ] Remove references to non-existent `/api/timetable`

### Phase 4: Test & Verify

- [ ] Test login flow end-to-end
- [ ] Test timetable fetch
- [ ] Verify no 406 errors in console
- [ ] Verify cookies are saved (check Supabase directly)
- [ ] Verify timetable displays correctly

---

## 🎯 FINAL ARCHITECTURE

### Frontend (React/Vite)
- Uses `anon` key for Supabase client
- Queries only: `id`, `email`, `registration_number`, `created_at`, `updated_at`
- NEVER queries: `password`, `encrypted_cookies`, `cookie_*` columns
- Tracks connection status via `localStorage.getItem('gradex_srm_connected')`
- Calls backend API routes for sensitive operations

### Backend API Routes (Vercel Serverless)
- `/api/vps-login-proxy` - Proxies login to VPS
- `/api/vps-timetable-proxy` - Proxies timetable fetch to VPS
- Both use `service_role` key internally if needed (or just proxy to VPS)

### VPS Service (Node.js/Express)
- Uses `service_role` key for Supabase
- Can read/write ALL columns including sensitive ones
- Handles SRM login, cookie storage, timetable fetching

### Database (Supabase PostgreSQL)
- RLS enabled with permissive policies for `anon` role
- `service_role` bypasses RLS completely
- Sensitive columns exist but frontend cannot access them

---

## 🚨 CRITICAL RULES

1. **Frontend NEVER queries sensitive columns** - RLS will block even with permissive policies
2. **Always use `.maybeSingle()`** - Never `.single()` to avoid 406 errors
3. **Query by ONE identity source** - `id` OR `email`, never both
4. **VPS handles all sensitive operations** - Login, cookie storage, data fetching
5. **Frontend tracks state via localStorage** - Don't query database for connection status

---

## 📝 FILES TO MODIFY

1. `src/lib/supabase.js` - Remove Auth config, fix helpers
2. `src/lib/timetable-fetcher.js` - Remove cookie queries, use VPS proxy
3. `src/lib/password-utils.js` - Delete or rewrite (passwords are plain text)
4. `src/components/Timetable.jsx` - Use VPS proxy directly
5. `src/components/SRMLogin.jsx` - Verify no sensitive column queries
6. All other components - Verify queries follow patterns

---

## ✅ VERIFICATION QUERIES

Run these in Supabase SQL Editor to verify setup:

```sql
-- 1. Verify RLS is enabled
SELECT rowsecurity FROM pg_tables WHERE tablename = 'users';

-- 2. Verify policies exist
SELECT policyname FROM pg_policies WHERE tablename = 'users';

-- 3. Test anon key can read non-sensitive columns
-- (Run from frontend or Postman with anon key)
SELECT id, email, registration_number FROM users LIMIT 1;

-- 4. Test anon key CANNOT read sensitive columns (should fail)
SELECT encrypted_cookies FROM users LIMIT 1; -- Should fail with 406

-- 5. Verify service_role can read sensitive columns
-- (Run from VPS or backend with service_role key)
SELECT encrypted_cookies FROM users LIMIT 1; -- Should work
```

---

## 🎓 ROOT CAUSE EXPLANATION

### Why 406 Errors Happen

1. **PostgREST Column-Level Security**: Even with permissive RLS (`USING (true)`), PostgREST enforces column-level security for sensitive columns when using `anon` key.

2. **Combined Filters**: Queries like `.eq('id', x).eq('email', y)` can cause 406 if RLS policies don't match the exact filter pattern.

3. **Using `.single()`**: If no row matches, `.single()` throws an error that PostgREST converts to 406.

### Why RLS Blocks Even With Permissive Policies

RLS policies control **row-level** access, but Supabase PostgREST also enforces **column-level** security:
- `anon` key: Can only access columns explicitly allowed (non-sensitive)
- `service_role` key: Can access all columns (bypasses RLS)

### Why Frontend Can't Access Cookies

Even though RLS policy says `USING (true)`, PostgREST still blocks `encrypted_cookies` column for `anon` key because:
1. It's a sensitive column (contains authentication data)
2. PostgREST has built-in column-level security
3. Only `service_role` can access sensitive columns

**Solution**: Frontend should NEVER query cookies. VPS (using `service_role`) handles all cookie operations.

---

## 🔄 MIGRATION PATH

1. **Immediate**: Remove all sensitive column queries from frontend
2. **Short-term**: Standardize all queries to use `.maybeSingle()` and single identity source
3. **Long-term**: Consider moving more logic to backend API routes for better security

---

## 📞 SUPPORT

If issues persist after fixes:
1. Check browser console for exact 406 error messages
2. Check Supabase logs for RLS policy violations
3. Verify VPS service is running and can access Supabase
4. Test queries directly in Supabase SQL Editor with different keys

---

**END OF AUDIT**

