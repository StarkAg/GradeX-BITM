# Bot Protection System (No CAPTCHA)

This project implements a multi-layered bot protection system without using CAPTCHA. The protection is transparent to legitimate users while blocking automated bots and scrapers.

## 🛡️ Protection Layers

### 1. **Rate Limiting**
- **Limit**: 10 requests per minute per IP address
- **Block Duration**: 15 minutes if limit exceeded
- **Purpose**: Prevents rapid automated requests

### 2. **Browser Fingerprinting**
- Validates User-Agent header
- Checks for common browser headers (Accept, Accept-Language, Accept-Encoding)
- Blocks known bot user agents (curl, wget, python, etc.)
- Allows legitimate bots (Googlebot, Bingbot)

### 3. **Request Timing Analysis**
- Tracks request frequency per IP
- Blocks if more than 5 requests in 10 seconds
- Detects automated request patterns

### 4. **IP-Based Blocking**
- Temporarily blocks IPs that exceed rate limits
- Automatic unblocking after block duration expires
- Tracks blocked IPs separately from rate limits

## 📋 How It Works

### Server-Side Protection

The bot protection module (`api/bot-protection.js`) automatically checks every request to:
- `/api/seating` - Main seat finding API
- `/api/log-enquiry` - Analytics logging API

### Request Flow

1. **IP Extraction**: Extracts client IP from various headers (x-forwarded-for, x-real-ip, cf-connecting-ip)
2. **Rate Limit Check**: Verifies if IP has exceeded request limits
3. **Browser Validation**: Checks for legitimate browser headers
4. **Timing Analysis**: Validates request frequency patterns
5. **Response**: Blocks suspicious requests with HTTP 429 status

### Blocked Request Response

```json
{
  "status": "error",
  "error": "Request blocked",
  "message": "Rate limit exceeded. Too many requests.",
  "retryAfter": 900
}
```

## ⚙️ Configuration

You can adjust the protection settings in `api/bot-protection.js`:

```javascript
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,        // Time window (1 minute)
  maxRequests: 10,            // Max requests per window
  blockDurationMs: 15 * 60 * 1000, // Block duration (15 minutes)
};
```

## 🔧 Implementation Details

### Rate Limit Storage

- Uses in-memory Map for rate limit tracking
- **Note**: For production with multiple server instances, consider using Redis
- Automatic cleanup of expired entries every 5 minutes

### IP Detection

The system checks multiple headers to get the real client IP:
1. `x-forwarded-for` (Vercel/Cloudflare)
2. `x-real-ip` (Nginx)
3. `cf-connecting-ip` (Cloudflare)
4. `socket.remoteAddress` (fallback)

### User-Agent Validation

Blocks common bot patterns:
- `bot`, `crawler`, `spider`, `scraper`
- `curl`, `wget`, `python`, `java`
- `postman`, `insomnia`, `httpie`
- Empty user agents

Allows legitimate bots:
- `googlebot`, `bingbot`, `slurp`

## 📊 Monitoring

The system logs blocked requests to the console:

```
[Bot Protection] Blocked request from IP: 192.168.1.1, Reason: Rate limit exceeded. Too many requests.
```

## 🚀 Future Enhancements

Potential improvements for production:

1. **Redis Integration**: Use Redis for distributed rate limiting across multiple servers
2. **Machine Learning**: Analyze request patterns to detect sophisticated bots
3. **Honeypot Fields**: Add hidden form fields that bots might fill
4. **JavaScript Challenge**: Require client-side JavaScript execution
5. **IP Reputation**: Integrate with IP reputation services
6. **Geolocation**: Block requests from suspicious regions
7. **Device Fingerprinting**: Track device characteristics

## 🔒 Security Notes

- Rate limits are per-IP, so legitimate users behind NAT may share limits
- Consider implementing user authentication for higher limits
- Monitor false positives and adjust thresholds accordingly
- The system is designed to be transparent to legitimate users

## 📝 Testing

To test the bot protection:

1. **Normal Usage**: Should work seamlessly
2. **Rate Limit Test**: Make 11+ requests in 1 minute → Should get blocked
3. **Bot Test**: Use curl without proper headers → Should get blocked
4. **Timing Test**: Make 6+ requests in 10 seconds → Should get blocked

## ⚠️ Important Notes

- The in-memory store resets on serverless function cold starts
- For production, consider persistent storage (Redis, database)
- Adjust limits based on your traffic patterns
- Monitor logs for false positives

