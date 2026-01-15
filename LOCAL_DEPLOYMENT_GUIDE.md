# Local Deployment Guide - Mac Mode

## ✅ **Current Status**

Both servers are **RUNNING**:
- ✅ **Backend Server**: `http://localhost:3000` (Express API)
- ✅ **Frontend Server**: `http://localhost:5173` (Vite Dev Server)

---

## 🚀 **Quick Start**

### **1. Open the Application**
Navigate to: **http://localhost:5173**

### **2. Enable Mac Mode**
1. Look for the **Mode Toggle** in the sidebar (bottom)
2. Switch to **"Mac Mode"** (should show "Mac" or "Local")
3. The mode is saved in `localStorage`

### **3. Test Login Flow**
1. Go to: **http://localhost:5173/srm-login?showForm=true&redirect=/timetable**
2. Enter your SRM credentials:
   - Email: `ha1487@srmist.edu.in`
   - Password: `Stark@121`
3. Click **"Connect to SRM"**
4. **Expected**: Browser window opens (visible), performs 2-step login, saves cookies

### **4. Test Timetable Flow**
1. After successful login, you'll be redirected to `/timetable`
2. Or manually navigate to: **http://localhost:5173/timetable**
3. Click **"Fetch Timetable"** or it should auto-fetch
4. **Expected**: Browser window opens (visible), fetches timetable, displays 11 courses

---

## 📋 **Complete Test Flow**

### **Step 1: Login**
```
Frontend (SRMLogin.jsx)
  ↓
vps-service.js → POST /api/vps-login-proxy
  ↓
vps-login-proxy.js (detects Mac mode)
  ↓
loginToSRMLocal() → Puppeteer (visible browser)
  ↓
2-step login → Extract cookies
  ↓
saveCookiesToSupabase() → Save to database
  ↓
✅ Success: Cookies saved, user logged in
```

### **Step 2: Timetable**
```
Frontend (Timetable.jsx)
  ↓
timetable-fetcher.js → POST /api/vps-timetable-proxy
  ↓
vps-timetable-proxy.js (detects Mac mode)
  ↓
fetchTimetableLocal() → Puppeteer (visible browser)
  ↓
Load cookies from Supabase → Navigate to timetable
  ↓
Extract 11 courses + student info
  ↓
✅ Success: Timetable displayed
```

---

## 🔍 **Debugging**

### **Check Server Logs**
Backend server logs are in the terminal where `npm run server` is running.

**Look for:**
- `[Proxy] Mac mode enabled - using local SRM login`
- `[Local SRM Login] Starting login for...`
- `[Local SRM Login] ✓ Browser launched successfully`
- `[Local SRM Login] ✓ Cookies saved to Supabase`

### **Check Browser Console**
Open browser DevTools (F12) and check Console tab.

**Look for:**
- `[VPS] Mac mode enabled - using local SRM login via proxy`
- `[Timetable Fetcher] Mac Mode active. Using local proxy for timetable fetch.`

### **Check Mode Toggle**
In browser console, run:
```javascript
localStorage.getItem('gradex_server_mode')
```
Should return: `"mac"`

---

## ⚠️ **Known Issues & Fixes**

### **Issue 1: Login Fails - "Could not find email input field"**
**Fix:** Browser is now set to `headless: false` (visible mode) - should work

### **Issue 2: Timetable Not Loading**
**Check:**
1. Cookies are saved (check Supabase `users` table)
2. Mode is set to "Mac" in localStorage
3. Browser window opens (visible) during fetch

### **Issue 3: Mode Toggle Not Working**
**Fix:** Clear localStorage and refresh:
```javascript
localStorage.removeItem('gradex_server_mode');
location.reload();
```

---

## 🧪 **Manual Testing Steps**

### **Test 1: Mode Toggle**
1. Open http://localhost:5173
2. Check sidebar for mode toggle
3. Toggle between "VPS" and "Mac"
4. Verify mode persists after refresh

### **Test 2: Login (Mac Mode)**
1. Set mode to "Mac"
2. Go to `/srm-login?showForm=true`
3. Enter credentials
4. **Watch for**: Visible browser window opening
5. **Verify**: Login succeeds, cookies saved

### **Test 3: Timetable (Mac Mode)**
1. After login, go to `/timetable`
2. Click "Fetch Timetable" or wait for auto-fetch
3. **Watch for**: Visible browser window opening
4. **Verify**: 11 courses displayed

---

## 📊 **Expected Results**

### **Login Success:**
- ✅ Browser window opens (visible)
- ✅ 2-step login completes
- ✅ Cookies extracted and saved
- ✅ Redirect to `/timetable`

### **Timetable Success:**
- ✅ Browser window opens (visible)
- ✅ Cookies loaded from Supabase
- ✅ Timetable page navigated
- ✅ 11 courses extracted
- ✅ Student info displayed:
  - Registration Number: RA2311003012246
  - Name: HARSH AGARWAL
  - Batch: 1/2
  - Program: B.Tech
  - Department: Computer Science and Engineering(CS)-(P2 Section)

---

## 🛠️ **Troubleshooting**

### **Server Not Running?**
```bash
# Start both servers
npm run dev:all

# Or separately:
npm run server  # Terminal 1
npm run dev     # Terminal 2
```

### **Port Already in Use?**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Kill process on port 5173
lsof -ti:5173 | xargs kill -9
```

### **Clear All Data?**
```javascript
// In browser console
localStorage.clear();
location.reload();
```

---

## 📝 **Files to Monitor**

### **Backend Logs:**
- `server.js` - Express server logs
- `api/vps-login-proxy.js` - Login proxy logs
- `api/vps-timetable-proxy.js` - Timetable proxy logs
- `api/local-srm-login.js` - Puppeteer logs

### **Frontend Logs:**
- Browser Console (F12)
- Network tab (check API calls)

---

## ✅ **Success Checklist**

- [ ] Both servers running (ports 3000 & 5173)
- [ ] Mode toggle visible in sidebar
- [ ] Mode set to "Mac" in localStorage
- [ ] Login opens visible browser window
- [ ] Login completes successfully
- [ ] Cookies saved to Supabase
- [ ] Timetable fetch opens visible browser window
- [ ] Timetable displays 11 courses
- [ ] Student info displayed correctly

---

## 🎯 **Next Steps After Testing**

1. ✅ Verify complete flow works
2. ⏳ Test with different credentials
3. ⏳ Switch back to headless mode (if needed)
4. ⏳ Deploy to production

---

**Ready to test!** Open http://localhost:5173 and follow the steps above.

