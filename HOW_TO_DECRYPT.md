# How to Decrypt Passwords

This guide shows you how to decrypt passwords stored in Supabase.

## Method 1: Using Helper Functions (Easiest)

Use the helper functions from `password-utils.js`:

### Decrypt by User ID and Email

```javascript
import { getDecryptedPassword } from '../lib/password-utils';

// Get plain password
const plainPassword = await getDecryptedPassword(userId, email);

if (plainPassword) {
  console.log('Decrypted password:', plainPassword);
  // Use plain password for VPS login
} else {
  console.error('Failed to decrypt password');
}
```

### Decrypt by Email Only

```javascript
import { getDecryptedPasswordByEmail } from '../lib/password-utils';

// Get plain password using only email
const plainPassword = await getDecryptedPasswordByEmail(email);

if (plainPassword) {
  console.log('Decrypted password:', plainPassword);
} else {
  console.error('Failed to decrypt password');
}
```

## Method 2: Manual Decryption

If you already have the encrypted data from Supabase:

```javascript
import { decryptPassword } from '../lib/encryption';
import { supabase } from '../lib/supabase';

async function decryptUserPassword(userId, email) {
  // 1. Fetch encrypted data from Supabase
  const { data, error } = await supabase
    .from('users')
    .select('encrypted_password, password_iv, password_tag')
    .eq('id', userId)
    .single();

  if (error || !data) {
    throw new Error('User not found');
  }

  // 2. Create encryption key (same as used for encryption)
  const encryptionKey = email + userId;

  // 3. Decrypt the password
  const plainPassword = await decryptPassword(
    {
      encrypted: data.encrypted_password,
      iv: data.password_iv,
      tag: data.password_tag,
    },
    encryptionKey
  );

  return plainPassword;
}

// Usage
const password = await decryptUserPassword(userId, email);
console.log('Plain password:', password);
```

## Method 3: Decrypt for VPS Login

Example: Decrypt password when cookies expire and need to refresh via VPS:

```javascript
import { getDecryptedPassword } from '../lib/password-utils';
import { loginToSRMViaVPS } from '../lib/vps-service';
import { encryptCookiesForStorage } from '../lib/vps-service';
import { supabase } from '../lib/supabase';

async function refreshCookiesViaVPS(userId, email) {
  // 1. Decrypt password
  const plainPassword = await getDecryptedPassword(userId, email);
  
  if (!plainPassword) {
    throw new Error('Failed to decrypt password');
  }

  // 2. Use plain password for VPS login
  const loginResult = await loginToSRMViaVPS(email, plainPassword);

  if (!loginResult.success || !loginResult.cookies) {
    throw new Error('VPS login failed: ' + loginResult.error);
  }

  // 3. Encrypt and save new cookies
  const encryptedCookies = await encryptCookiesForStorage(loginResult.cookies);

  await supabase
    .from('users')
    .update({
      ...encryptedCookies,
      cookie_invalid: false,
      last_sync_at: new Date().toISOString(),
    })
    .eq('id', userId);

  console.log('Cookies refreshed successfully!');
}
```

## Important Notes

1. **Encryption Key**: The key is always `email + userId`. Make sure you use the same format when decrypting.

2. **Security**: 
   - Never log plain passwords in production
   - Only decrypt when absolutely necessary (e.g., for VPS login)
   - The decryption happens client-side using Web Crypto API

3. **Error Handling**: Always check if decryption returns `null` or throws an error.

4. **Storage Format**: The encrypted password is stored as:
   - `encrypted_password`: Base64 encoded ciphertext
   - `password_iv`: Initialization vector (Base64)
   - `password_tag`: Authentication tag (Base64)

## Example: Complete Login Flow with Decryption

```javascript
import { getDecryptedPasswordByEmail } from '../lib/password-utils';
import { loginToSRMViaVPS } from '../lib/vps-service';

async function loginAndRefreshCookies(email) {
  try {
    // Get user from Supabase
    const { data: user } = await supabase
      .from('users')
      .select('id, email, cookie_invalid')
      .eq('email', email)
      .single();

    if (!user) {
      throw new Error('User not found');
    }

    // If cookies are invalid, refresh them
    if (user.cookie_invalid) {
      console.log('Cookies expired, refreshing...');
      
      // Decrypt password
      const plainPassword = await getDecryptedPasswordByEmail(email);
      
      if (!plainPassword) {
        throw new Error('Failed to get password');
      }

      // Login to VPS with decrypted password
      const result = await loginToSRMViaVPS(email, plainPassword);
      
      // Save new cookies...
      // (rest of the code)
    }
  } catch (error) {
    console.error('Error:', error);
  }
}
```

