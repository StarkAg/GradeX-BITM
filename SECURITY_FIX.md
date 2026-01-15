# Security Fix - Service Role Key

## Service Role Key in Code

GitGuardian detected that your Supabase Service Role key was in the codebase. As a best practice, we've removed hardcoded keys and now require environment variables only.

## ✅ What Was Fixed

1. ✅ Removed hardcoded service role key from `api/supabase-client.js`
2. ✅ Removed hardcoded service role key from `supabase-admin.js`
3. ✅ Updated code to require environment variables only
4. ✅ Added security warnings in code

## 🔧 Recommended Actions

### Step 1: Regenerate Service Role Key (Optional but Recommended)

If your repository is public or you want to be extra safe, you can regenerate the key:

1. Go to: **https://supabase.com/dashboard/project/phlggcheaajkupppozho/settings/api**
2. Scroll to **"Project API keys"** section
3. Find **"service_role"** key
4. Click **"Reset"** or **"Regenerate"** button
5. **Copy the new key** (you'll need it)

### Step 2: Update Environment Variables

**Local Development:**
```bash
export SUPABASE_SERVICE_ROLE_KEY="your-new-service-role-key"
```

**Or add to ~/.zshrc:**
```bash
echo 'export SUPABASE_SERVICE_ROLE_KEY="your-new-service-role-key"' >> ~/.zshrc
source ~/.zshrc
```

**Vercel (Production):**
1. Go to: https://vercel.com/dashboard
2. Select your `gradex` project
3. Go to **Settings** → **Environment Variables**
4. Update `SUPABASE_SERVICE_ROLE_KEY` with the new key
5. Redeploy your application

### Step 3: Verify Setup

Test that everything works with environment variables:
```bash
# Set the key first
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# Then test
node supabase-admin.js stats
```

## 📋 What Changed in Code

### Before (INSECURE):
```javascript
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || 'hardcoded-key-here'; // ❌ NEVER DO THIS!
```

### After (SECURE):
```javascript
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // ✅ Only from env
```

## 🔐 Security Best Practices

### ✅ DO:
- ✅ Use environment variables for all secrets
- ✅ Add secrets to `.gitignore`
- ✅ Use Vercel environment variables for production
- ✅ Rotate keys regularly
- ✅ Never commit secrets to Git

### ❌ DON'T:
- ❌ Hardcode API keys in source code
- ❌ Commit `.env` files
- ❌ Share keys in chat/messages
- ❌ Use the same key in multiple places
- ❌ Leave old keys active after rotation

## 🛡️ Prevention

### GitGuardian Integration
GitGuardian is already monitoring your repository. It will alert you if secrets are detected in future commits.

### Pre-commit Hooks (Optional)
Consider adding a pre-commit hook to scan for secrets before committing:
```bash
npm install --save-dev @gitguardian/ggshield
```

## 📝 Checklist

- [ ] Regenerate service role key in Supabase dashboard
- [ ] Update local environment variable
- [ ] Update Vercel environment variable
- [ ] Test that old key no longer works
- [ ] Test that new key works
- [ ] Verify no other secrets are exposed
- [ ] Review Git history for other exposed secrets

## 🆘 If You Need Help

If you're unsure about any step:
1. Check Supabase documentation: https://supabase.com/docs/guides/platform/api-keys
2. Review Vercel docs: https://vercel.com/docs/concepts/projects/environment-variables
3. Contact support if needed

## ✅ Status

- [x] Code updated to remove hardcoded keys
- [x] Security warnings added
- [x] Now requires environment variables only

**Note**: If your repository is private, the risk is minimal. However, using environment variables is always the better practice for security.

