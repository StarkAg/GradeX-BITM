# GradeX Login & Timetable Issues - Summary

## 🔴 Critical Issues Identified

### Issue 1: Password Check Logic Error
**Error Message:** `Account exists but password not set. Please contact support.`

**Root Cause:**
- Line 225 in `SRMLogin.jsx` queries: `SELECT id, email` (doesn't include `password`)
- Line 238 checks: `if (!existingUser.password)` 
- Since `password` wasn't selected, `existingUser.password` is always `undefined`
- This triggers the error even when password exists in database

**Location:** `GradeX/src/components/SRMLogin.jsx:225-239`

**Impact:** Users cannot login if account already exists

---

### Issue 2: Undefined Variable Reference
**Error Message:** `ReferenceError: userId is not defined`

**Root Cause:**
- If error is thrown at line 239, `userId` hasn't been assigned yet
- `userId` is only assigned at line 247 (`userId = existingUser.id`)
- Catch block at line 344 tries to use `userId` which doesn't exist

**Location:** `GradeX/src/components/SRMLogin.jsx:231-247, 344`

**Impact:** Login crashes with JavaScript error

---

### Issue 3: Cookies Not Saved After Login Failure
**Error Message:** `No cookies stored for this user. Please login first.`

**Root Cause:**
- When VPS login fails (timeout/error), code continues to line 344
- Sets `localStorage` but **doesn't save cookies to Supabase**
- Timetable fetch tries to get cookies from Supabase → finds nothing
- Error thrown at `srm-login-service/index.js:649`

**Location:** 
- `GradeX/src/components/SRMLogin.jsx:330-365` (error handling)
- `srm-login-service/index.js:618-650` (timetable fetch)

**Impact:** Even after "successful" login, timetable fetch fails

---

## 🔍 Technical Details

### Current Flow (Broken)
```
1. User submits login form
2. Check if user exists (SELECT id, email) ← Missing password
3. If exists: Check password (undefined) ← Always fails
4. Throw error: "password not set"
5. Catch block tries to use userId (undefined) ← Crash
6. If VPS login fails: Save to localStorage only, skip Supabase cookies
7. Timetable fetch: Query Supabase for cookies → Not found → Error
```

### Expected Flow (Fixed)
```
1. User submits login form
2. Check if user exists (SELECT id, email, password) ← Include password
3. If exists: Check password OR skip check (let VPS verify)
4. Call VPS login with email/password
5. If VPS succeeds: Save cookies to Supabase
6. If VPS fails: Still save user session, but mark SRM as disconnected
7. Timetable fetch: Query Supabase → Get cookies → Use for scraping
```

---

## 🛠️ Required Fixes

### Fix 1: Remove Password Check from Frontend
**Why:** 
- User requested no password verification in frontend
- VPS login will validate password anyway
- RLS policies block password SELECT queries

**Action:**
- Remove password check at line 238-245
- Remove password from SELECT query (already done)
- Let VPS login handle password validation

**Code Change:**
```javascript
// BEFORE (line 233-247)
if (existingUser) {
  if (!existingUser.password) {
    throw new Error('Account exists but password not set...');
  }
  if (existingUser.password !== password) {
    throw new Error('Invalid email or password');
  }
  userId = existingUser.id;
}

// AFTER
if (existingUser) {
  userId = existingUser.id;
  // Password verification happens via VPS login
  // If password is wrong, VPS login will fail
}
```

---

### Fix 2: Initialize userId Before Try Block
**Why:** 
- Catch block needs `userId` even if error occurs early
- Prevents `ReferenceError: userId is not defined`

**Action:**
- Declare `let userId = null;` before try block
- Ensure it's always defined

**Code Change:**
```javascript
// BEFORE (line 231)
let userId;

// AFTER
let userId = null; // Initialize before try block
```

---

### Fix 3: Save Cookies Even on Partial Failure
**Why:**
- If VPS login fails but user account exists, we should still:
  - Save user session to localStorage
  - Mark SRM as disconnected
  - Allow user to retry with "Reconnect" button

**Action:**
- Current code already does this (lines 342-364)
- But ensure `userId` is always defined before this block

---

### Fix 4: Handle Cookie Storage Race Condition
**Why:**
- VPS saves cookies to Supabase directly
- Frontend also tries to save cookies (line 373-385)
- This creates duplicate/race condition

**Action:**
- Remove frontend cookie saving (VPS already does it)
- OR: Make frontend cookie save optional/fallback only

---

## 📊 Error Flow Analysis

### Scenario 1: New User, VPS Login Succeeds
✅ **Current:** Works (creates user, saves cookies)
⚠️ **Issue:** Frontend tries to save cookies again (redundant)

### Scenario 2: Existing User, VPS Login Succeeds  
❌ **Current:** Fails at password check (password not in SELECT)
✅ **After Fix:** Works (skip password check, let VPS verify)

### Scenario 3: Existing User, VPS Login Fails
❌ **Current:** Crashes with `userId is not defined`
✅ **After Fix:** Shows error, allows retry

### Scenario 4: New User, VPS Login Fails
✅ **Current:** Creates user, shows error, allows retry
⚠️ **Issue:** Cookies not saved (expected, but should be clearer)

---

## 🎯 Recommended Solution (For Top Dev)

### Option A: Remove All Frontend Password Checks (Simplest)
1. Remove password SELECT from query
2. Remove password comparison logic
3. Let VPS login be the single source of truth for password validation
4. Initialize `userId = null` before try block
5. Remove redundant frontend cookie saving (VPS handles it)

**Pros:** 
- Simplest fix
- Matches user's "no password verification" requirement
- VPS is authoritative for password validation

**Cons:**
- No immediate password feedback (user must wait for VPS)

---

### Option B: Use Supabase RPC Function (More Robust)
1. Create Supabase RPC function `verify_user_password(email, password)`
2. RPC runs with service role, bypasses RLS
3. Frontend calls RPC to verify password
4. Then proceed with VPS login

**Pros:**
- Immediate password feedback
- More secure (server-side validation)
- Better UX

**Cons:**
- Requires Supabase function setup
- More complex

---

### Option C: Skip Password Check Entirely (Current Intent)
1. Don't check password in frontend at all
2. Always call VPS login
3. If VPS fails → show error
4. If VPS succeeds → proceed

**Pros:**
- Simplest implementation
- Single source of truth (VPS)

**Cons:**
- User must wait for VPS to know if password is wrong
- No immediate feedback

---

## 🔧 Quick Fix (Immediate)

```javascript
// GradeX/src/components/SRMLogin.jsx

// Line 220-231: Change to
let userId = null; // Initialize before try block

// Line 225-247: Change to
const { data: existingUser, error: fetchError } = await supabase
  .from('users')
  .select('id, email') // Don't select password (RLS blocks it anyway)
  .eq('email', email)
  .single();

if (existingUser) {
  // User exists - password will be verified by VPS login
  userId = existingUser.id;
} else {
  // User doesn't exist - create new account
  userId = crypto.randomUUID();
  // ... create user ...
}

// Remove lines 238-245 (password check)
// Remove lines 373-385 (redundant cookie save - VPS already saves)
```

---

## 📝 Testing Checklist

After fixes, test:
- [ ] New user registration + VPS login success
- [ ] New user registration + VPS login failure
- [ ] Existing user login + VPS login success  
- [ ] Existing user login + VPS login failure
- [ ] Timetable fetch after successful login
- [ ] Timetable fetch after failed login (should show error)
- [ ] "Reconnect to SRM" button functionality

---

## 🚨 Current Status

**Blocking Issues:**
1. ❌ Password check fails (password not in SELECT)
2. ❌ userId undefined error (not initialized)
3. ⚠️ Cookies not saved on VPS failure (expected, but needs better UX)

**Non-Blocking:**
- Redundant cookie saving (works but inefficient)
- Mixed Content warnings (handled by proxy)

---

## 💡 Questions for Top Dev

1. Should we remove ALL password checks from frontend? (User requested this)
2. Should VPS be the single source of truth for password validation?
3. How should we handle the case where user exists but VPS login fails?
4. Should we keep frontend cookie saving as fallback, or remove it entirely?

