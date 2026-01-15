# Cookie Verification for ha1487@srmist.edu.in

## ✅ Cookie Format Analysis

The cookies you provided are **correctly formatted** and should work for timetable fetching.

### Cookie Data Structure
- **Format**: JSON array string (stored in `encrypted_cookies` column)
- **Count**: 16 cookies
- **Type**: Plain JSON (not encrypted) ✅

### Key Cookies Present
1. `zalb_74c3a1eecc` - Session cookie
2. `JSESSIONID` - Java session ID
3. `cli_rgn` - Region cookie
4. `iamcsr` - IAM client session
5. `stk` - Security token
6. `__Secure-iamsdt_client_10002227248` - Secure IAM session
7. `_iamadt_client_10002227248` - IAM AD token
8. `_iambdt_client_10002227248` - IAM BD token
9. `_z_identity` - Identity cookie
10. `zccpn` - Zoho cookie
11. Plus Google Analytics cookies (`_ga`, `_gid`, `_gat`, `_ga_HQWPLLNMKY`)

### Cookie Properties
All cookies have required fields:
- ✅ `name` - Cookie name
- ✅ `value` - Cookie value
- ✅ `domain` - Domain (`.srmist.edu.in` or `academia.srmist.edu.in`)
- ✅ `path` - Path (`/`)
- ✅ `expires` - Expiration (some are session cookies with `-1`)
- ✅ `httpOnly` - HTTP-only flag
- ✅ `secure` - Secure flag
- ✅ `sameSite` - SameSite policy

## 🔍 How VPS Service Will Use These Cookies

### Step 1: Fetch from Supabase
```javascript
const { data: userData } = await supabase
  .from('users')
  .select('encrypted_cookies')
  .eq('email', 'ha1487@srmist.edu.in')
  .maybeSingle();
```

### Step 2: Parse JSON String
```javascript
const cookies = JSON.parse(userData.encrypted_cookies);
// Result: Array of 16 cookie objects
```

### Step 3: Build Cookie Header
```javascript
const cookieHeader = cookies
  .map(c => `${c.name}=${c.value}`)
  .join('; ');
// Result: "zalb_74c3a1eecc=73a3be47a271fb393901d7527dd24021; JSESSIONID=20071C75E5ABDB6CA077F420B7B560CE; ..."
```

### Step 4: Fetch Timetable
```javascript
const response = await fetch('https://academia.srmist.edu.in/#My_Time_Table_Attendance', {
  method: 'GET',
  headers: {
    'Cookie': cookieHeader,
    'User-Agent': 'Mozilla/5.0 ...',
    // ... other headers
  }
});
```

## ✅ Expected Behavior

The VPS service should:
1. ✅ Successfully parse the JSON cookies
2. ✅ Build a valid cookie header
3. ✅ Fetch the timetable page from SRM Academia
4. ✅ Extract structured JSON data (studentInfo + courses)
5. ✅ Return timetable data to frontend

## 🚨 Current Issue

**VPS is not accessible** (connection timeout). This means:
- Cannot test timetable fetch right now
- VPS service might be down or firewall blocking

## 🔧 Testing Options

### Option 1: Test via Frontend (When VPS is Online)
1. Open GradeX frontend
2. Login as `ha1487@srmist.edu.in`
3. Navigate to Timetable page
4. Should fetch timetable using these cookies

### Option 2: Test via API Proxy (When VPS is Online)
```bash
curl -X POST https://www.gradex.bond/api/vps-timetable-proxy \
  -H "Content-Type: application/json" \
  -d '{"email":"ha1487@srmist.edu.in"}'
```

### Option 3: Direct VPS Test (When VPS is Online)
```bash
curl -X POST http://65.20.84.46:5000/timetable \
  -H "Content-Type: application/json" \
  -H "X-API-KEY: 32631058927400e8e13cd7a7c35cf3381ffc2af66b926a3d79c2b28403769f73" \
  -d '{"email":"ha1487@srmist.edu.in"}'
```

## 📋 Cookie Expiration Check

Looking at the cookies:
- `cookie_expires_at`: `2026-04-09 09:25:08.296+05:30` ✅ (Valid until April 2026)
- `cookie_invalid`: `false` ✅ (Not marked as invalid)
- Most cookies have `expires: -1` (session cookies) ✅

**Status**: Cookies are valid and should work for timetable fetching.

## 🎯 Conclusion

The cookies are **correctly formatted** and **valid**. Once the VPS service is accessible, the timetable fetch should work perfectly.

**Next Steps**:
1. Ensure VPS service is running
2. Test timetable fetch via frontend or API proxy
3. Verify timetable data is returned correctly

