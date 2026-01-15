# Data Flow Issues - Mac Mode

## ❌ **NON-WORKING PARTS**

### **1. Login Flow via API Endpoint** ❌
**Issue:** Login fails when called through `/api/vps-login-proxy` endpoint

**Error:**
```
Could not find email/username input field. The SRM Academia website structure may have changed.
```

**Root Cause:**
- When called through API, browser runs in `headless: 'new'` mode
- Iframe detection may not work correctly in headless mode
- The iframe content might not be loading properly

**Working:** ✅ Direct function call (`test-local-login.js`) works fine
**Not Working:** ❌ API endpoint call fails

**Files Affected:**
- `api/vps-login-proxy.js` - Routes to `loginToSRMLocal()`
- `api/local-srm-login.js` - Login function (works directly, fails via API)

---

### **2. Timetable Flow via API Endpoint** ⚠️ **UNTESTED**
**Status:** Cannot test because login fails first

**Expected Flow:**
- `timetable-fetcher.js` → `/api/vps-timetable-proxy` → `fetchTimetableLocal()`

**Potential Issues:**
- Same headless mode issue might affect timetable extraction
- Currently set to `headless: false` in `fetchTimetableLocal()` (line 673)

---

## ✅ **WORKING PARTS**

### **1. Direct Function Calls** ✅
- `loginToSRMLocal()` - Works when called directly
- `fetchTimetableLocal()` - Works when called directly
- `saveCookiesToSupabase()` - Works correctly

### **2. API Routing** ✅
- `api/vps-login-proxy.js` - Correctly detects Mac mode
- `api/vps-timetable-proxy.js` - Correctly detects Mac mode
- Mode detection via `X-Server-Mode` header works

### **3. Frontend Services** ✅
- `src/lib/vps-service.js` - Sends correct headers
- `src/lib/timetable-fetcher.js` - Sends correct headers
- `src/lib/mode-toggle.js` - Mode management works

---

## 🔧 **FIXES NEEDED**

### **Fix 1: Headless Mode Issue**
**Problem:** Browser in headless mode may not load iframe correctly

**Solution Options:**
1. Use `headless: false` for API calls (visible browser)
2. Increase wait times for iframe loading
3. Add better iframe detection with retries
4. Use `headless: 'new'` with additional flags

**File:** `api/local-srm-login.js` (line 30)

### **Fix 2: Iframe Detection**
**Problem:** Iframe might not be detected in time

**Solution:**
- Increase wait times (currently 3-5 seconds)
- Add retry logic for iframe detection
- Better error messages with iframe HTML dump

**File:** `api/local-srm-login.js` (lines 129-190)

---

## 📊 **Test Results**

### ✅ **Direct Function Call**
```bash
node test-local-login.js ha1487@srmist.edu.in "Stark@121"
```
**Result:** ✅ **SUCCESS** - Login works, cookies saved, timetable extracted

### ❌ **API Endpoint Call**
```bash
node test-complete-flow.js
```
**Result:** ❌ **FAILS** - Cannot find email input field

---

## 🎯 **Next Steps**

1. **Fix headless mode** - Try `headless: false` for API calls
2. **Improve iframe detection** - Add better waiting/retry logic
3. **Add debug logging** - Log iframe HTML when detection fails
4. **Test timetable flow** - After login is fixed

---

## 📝 **Summary**

**Working:**
- ✅ Direct function calls (test-local-login.js)
- ✅ API routing and mode detection
- ✅ Frontend services
- ✅ Cookie saving
- ✅ Timetable extraction (when called directly)

**Not Working:**
- ❌ Login via API endpoint (headless mode issue)
- ⚠️ Timetable via API endpoint (untested, likely same issue)

**Root Cause:** Headless browser mode may not load iframe content correctly when called through API.

