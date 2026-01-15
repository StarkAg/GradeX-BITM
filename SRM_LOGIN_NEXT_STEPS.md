# SRM Login System - Next Steps

## ✅ Migration Complete! Now Test It

---

## Step 1: Verify Migration Worked

Run this in Supabase SQL Editor to verify the table structure:

```sql
-- Check table columns
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'srm_cookies'
ORDER BY ordinal_position;
```

**Expected result:** Should show all columns including `user_id`, `srm_user_id`, `cookies_json`, etc.

---

## Step 2: Start Your Server

Make sure your server is running:

```bash
npm run server
```

Or if you want to run both frontend and backend:

```bash
npm run dev:all
```

The server should start and show:
```
✅ Attendance scheduler started
🚀 Server running on http://localhost:3000
```

---

## Step 3: Test Login Endpoint

### Using curl:

```bash
curl -X POST http://localhost:3000/api/srm/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "srmUserId": "your-email@srmist.edu.in",
    "password": "your-srm-password"
  }'
```

### Using JavaScript/Fetch:

```javascript
const response = await fetch('http://localhost:3000/api/srm/login', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: '550e8400-e29b-41d4-a716-446655440000', // Your internal app user ID (UUID)
    srmUserId: 'your-email@srmist.edu.in',           // SRM login email/username
    password: 'your-srm-password'                     // SRM password
  })
});

const result = await response.json();
console.log(result);
// Expected: { success: true, message: 'Login successful. Session saved.' }
```

### Expected Response (Success):

```json
{
  "success": true,
  "message": "Login successful. Session saved."
}
```

### Expected Response (Error):

```json
{
  "success": false,
  "error": "Login failed. Please check your credentials."
}
```

---

## Step 4: Test Attendance Endpoint

After successful login, test getting attendance:

### Using curl:

```bash
curl "http://localhost:3000/api/attendance?userId=550e8400-e29b-41d4-a716-446655440000"
```

### Using JavaScript/Fetch:

```javascript
const response = await fetch('http://localhost:3000/api/attendance?userId=550e8400-e29b-41d4-a716-446655440000');
const result = await response.json();

if (result.requiresLogin) {
  console.log('Session expired - need to login again');
} else if (result.success) {
  console.log('Attendance data:', result.data);
  console.log('Cached:', result.cached);
}
```

### Expected Response (Success):

```json
{
  "success": true,
  "data": {
    "scraped_at": "2025-01-10T10:30:00.000Z",
    "source_url": "https://academia.srmist.edu.in/attendance",
    "subjects": [
      {
        "subject_name": "Software Engineering",
        "subject_code": "CS101",
        "present": 45,
        "absent": 5,
        "total": 50,
        "percentage": 90.0
      }
    ],
    "total_subjects": 1
  },
  "cached": false,
  "timestamp": "2025-01-10T10:35:00.000Z"
}
```

### Expected Response (Requires Login):

```json
{
  "success": false,
  "requiresLogin": true,
  "error": "No valid session found. Please login first."
}
```

---

## Step 5: Check Logs

Watch your server console for logs:

```
[SRM Login] Starting HTTP login for user: use*** (password not logged)
[SRM Login] ✓ Login successful, captured 5 cookies
[Orchestrator] ✓ Login successful, cookies saved for user_id: 550e8400***
[Cookie Manager] ✓ Saved 5 cookies for user_id: 550e8400***
```

---

## 🔑 Important Notes

### User ID Format

- Must be a **valid UUID** format
- Example: `550e8400-e29b-41d4-a716-446655440000`
- This is your **internal application user ID**, not the SRM login ID
- Generate one if you don't have one yet

### Generate a UUID for Testing

You can generate a UUID using:

**JavaScript:**
```javascript
const userId = crypto.randomUUID(); // Browser
// OR
const { randomUUID } = require('crypto');
const userId = randomUUID(); // Node.js
```

**Online:** https://www.uuidgenerator.net/

**Terminal (macOS/Linux):**
```bash
uuidgen
```

### SRM Credentials

- `srmUserId`: Your SRM Academia login email/username
- `password`: Your SRM Academia password
- These are used **only for login**, then **discarded** (never stored)

---

## 🐛 Troubleshooting

### Error: "Login failed"
- Check SRM credentials are correct
- Verify SRM Academia is accessible
- Check server logs for detailed error

### Error: "No cookies found" / "requiresLogin: true"
- User must login first via `POST /api/srm/login`
- Session may have expired - login again

### Error: "Invalid user ID format"
- User ID must be a valid UUID
- Generate one using the methods above

### Server won't start
- Check if port 3000 is available
- Check environment variables are set
- Check logs for errors

---

## 📝 Quick Test Checklist

- [ ] Migration completed successfully
- [ ] Server started without errors
- [ ] Test login endpoint with valid credentials
- [ ] Received `{ success: true }` from login
- [ ] Test attendance endpoint with same userId
- [ ] Received attendance data or `requiresLogin: true`
- [ ] Checked server logs for errors

---

## 🚀 Next: Frontend Integration

Once the API is working, integrate it into your frontend:

1. Create a login form that calls `POST /api/srm/login`
2. Store `userId` in localStorage or state
3. Use `userId` to fetch attendance via `GET /api/attendance?userId=<uuid>`
4. Handle `requiresLogin: true` to redirect to login

---

**You're all set!** The login system is ready to use. 🎉

