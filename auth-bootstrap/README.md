# SRM Auth Bootstrap - Isolated Cookie Minter

**SINGLE PURPOSE:** Mint Zoho IAM cookies via browser automation.

## What This Module Does

1. Launches Playwright (headless browser)
2. Navigates to SRM Zoho signin page
3. Fills credentials (email → password)
4. Waits for authentication
5. Extracts ALL cookies from browser context
6. **IMMEDIATELY terminates browser**
7. Returns cookies as JSON

**Runtime:** 3-5 seconds  
**Browser lifetime:** 3-5 seconds  
**Persistence:** NONE (browser exits immediately)

## What This Module Does NOT Do

- ❌ NO scraping
- ❌ NO data fetching
- ❌ NO persistence
- ❌ NO long-running browser
- ❌ NO frontend involvement

## Usage

### CLI Mode

```bash
node login.js user@srmist.edu.in password
```

**Output:**
```json
{
  "success": true,
  "cookies": [
    { "name": "iamcsr", "value": "...", "domain": "...", ... },
    { "name": "_zcsr_tmp", "value": "...", ... },
    { "name": "stk", "value": "...", ... },
    ...
  ]
}
```

### Programmatic Mode

```javascript
import { bootstrapLogin } from './login.js';

const result = await bootstrapLogin('user@srmist.edu.in', 'password');

if (result.success) {
  const cookies = result.cookies;
  // Store cookies server-side
  // Pass to Go backend
}
```

## Integration with Go Backend

### Option 1: Call from Go (Recommended)

```go
// In Go backend: auth/bootstrap.go

func mintFreshCookies(email, password string) ([]*http.Cookie, error) {
    cmd := exec.Command("node", "../auth-bootstrap/login.js", email, password)
    output, err := cmd.Output()
    if err != nil {
        return nil, err
    }
    
    var result struct {
        Success bool `json:"success"`
        Cookies []Cookie `json:"cookies"`
    }
    
    json.Unmarshal(output, &result)
    
    // Convert to http.Cookie
    // Store in cookie vault
    // Return for use in HTTP requests
}
```

### Option 2: HTTP Endpoint

```javascript
// Expose as HTTP endpoint for Go to call
app.post('/bootstrap/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await bootstrapLogin(email, password);
  res.json(result);
});
```

## Security

- ✅ Passwords used ONLY in browser memory
- ✅ Never logged or stored
- ✅ Browser terminates immediately
- ✅ Cookies returned as JSON (for server-side storage)
- ✅ No cookies exposed to frontend

## Installation

```bash
cd auth-bootstrap
npm install
npm run install-browser
```

## Testing

```bash
# Test with real credentials
node login.js ha1487@srmist.edu.in Stark@121

# Expected output:
# [Auth Bootstrap] Starting for ha1***
# [Auth Bootstrap] Navigating to ...
# [Auth Bootstrap] Found email input: ...
# [Auth Bootstrap] Found password input: ...
# [Auth Bootstrap] ✓ Success - Extracted N cookie(s)
# [Auth Bootstrap] Browser TERMINATED
# === COOKIES (JSON) ===
# [ ... ]
```

## Resource Usage

- **Memory**: 50-100 MB (during bootstrap only)
- **Runtime**: 3-5 seconds
- **Frequency**: Once per user per session (24 hours)
- **Impact**: <1% of total runtime

## Deployment

### Local Development
```bash
node login.js user@srmist.edu.in password
```

### Production (Called from Go)
```bash
# Go backend calls this when minting new cookies
exec.Command("node", "../auth-bootstrap/login.js", email, password)
```

## File Structure

```
auth-bootstrap/
├── login.js          # Main bootstrap script (Playwright)
├── package.json      # Dependencies (playwright only)
└── README.md         # This file
```

## Integration Flow

```
User Login Request
  ↓
Go Backend (/api/srm/login)
  ↓
Call: node auth-bootstrap/login.js <email> <password>
  ↓
Playwright: Launch → Login → Extract cookies → Terminate
  ↓
Go Backend: Receive cookies JSON → Store in vault → Return success
  ↓
All subsequent requests: Go HTTP-only (NO browser)
```

## Why This Design?

- **Separation of concerns**: Browser logic isolated from Go backend
- **Minimal browser usage**: Runs for seconds, not 24/7
- **Security**: Credentials never touch Go code
- **Maintainability**: Easy to update if Zoho changes
- **Cost**: <1% overhead, 99% Go efficiency

## Maintenance

If Zoho login page changes:
1. Update selectors in `login.js`
2. Test with `node login.js`
3. No changes needed in Go backend

## License

Part of GradeX platform by Harsh Agarwal

