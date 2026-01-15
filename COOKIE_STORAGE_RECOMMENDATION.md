# Cookie Storage Recommendation

## Current State
- **Storage**: In-memory map (`sessionStore`)
- **Persistence**: ❌ Lost on restart
- **Scalability**: ❌ Single server only
- **Security**: ✅ No external exposure

## Recommended: Hybrid Approach (Supabase + In-Memory Cache)

### Architecture
```
Login → Encrypt Cookies → Store in Supabase → Cache in Memory
Fetch → Check Memory Cache → If miss, fetch from Supabase → Cache
```

### Benefits
1. **Persistence**: Sessions survive restarts
2. **Performance**: Hot sessions in memory (fast)
3. **Scalability**: Can add more Go servers later
4. **Security**: Encrypted at rest in Supabase
5. **Cost**: Minimal (small data, infrequent writes)

### Implementation Steps

#### 1. Add Encryption Helper
```go
// gradex-backend/src/utils/encrypt.go
package utils

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "io"
)

func EncryptCookies(cookies string, key []byte) (string, error) {
    // AES-256-GCM encryption
    // Implementation here
}

func DecryptCookies(encrypted string, key []byte) (string, error) {
    // Decryption
}
```

#### 2. Update Session Storage
```go
// Hybrid: Memory cache + Supabase persistence
func storeSession(userID, email, cookies string) {
    // 1. Encrypt cookies
    encrypted, _ := utils.EncryptCookies(cookies, encryptionKey)
    
    // 2. Store in Supabase (async)
    go saveToSupabase(userID, email, encrypted)
    
    // 3. Cache in memory (sync)
    sessionMutex.Lock()
    sessionStore[userID] = &SessionData{...}
    sessionMutex.Unlock()
}

func getSession(userID string) (*SessionData, error) {
    // 1. Check memory cache first
    sessionMutex.RLock()
    if session, exists := sessionStore[userID]; exists {
        sessionMutex.RUnlock()
        return session, nil
    }
    sessionMutex.RUnlock()
    
    // 2. Cache miss - fetch from Supabase
    encrypted, err := fetchFromSupabase(userID)
    if err != nil {
        return nil, err
    }
    
    // 3. Decrypt and cache
    cookies, _ := utils.DecryptCookies(encrypted, encryptionKey)
    session := &SessionData{Cookies: cookies, ...}
    
    // 4. Cache in memory for next time
    sessionMutex.Lock()
    sessionStore[userID] = session
    sessionMutex.Unlock()
    
    return session, nil
}
```

#### 3. Environment Variables
```bash
# .env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ENCRYPTION_KEY=32-byte-key-for-AES-256  # Generate securely
```

### Security Considerations

1. **Encryption Key**: 
   - Generate: `openssl rand -base64 32`
   - Store in environment variable (never commit)
   - Rotate periodically

2. **RLS Policies**: Already configured in migration ✅

3. **Access Control**: 
   - Only service role can read/write
   - No client-side access to cookies

4. **Cookie Expiration**:
   - SRM cookies typically expire in 24-48 hours
   - Add cleanup job to remove expired sessions

### Performance Impact

- **Memory Cache Hit**: ~0.1ms (same as current)
- **Supabase Read**: ~10-50ms (acceptable for cold start)
- **Supabase Write**: Async (no impact on login speed)

### Cost Estimate (Supabase Free Tier)

- **Storage**: ~1KB per session × 100 users = 100KB (negligible)
- **Reads**: ~10-20 per day per user = 1000-2000/day (well under 50K limit)
- **Writes**: ~1 per login = 100/day (well under 50K limit)

**Verdict**: Free tier is sufficient for current scale.

### Alternative: Keep In-Memory Only

**Pros:**
- ✅ Fastest (no network calls)
- ✅ Simplest (no encryption needed)
- ✅ No external dependency

**Cons:**
- ❌ Lost on restart (users must re-login)
- ❌ Can't scale horizontally
- ❌ No session recovery

**Recommendation**: Only if you're okay with users re-logging after restarts.

## Final Recommendation

**Use Supabase with encryption** because:
1. You already have the migration file ready
2. Persistence is important for user experience
3. Minimal performance impact (cached in memory)
4. Scales if you grow
5. Free tier is sufficient

**Implementation Priority**: Medium (can be done later, but worth doing)

