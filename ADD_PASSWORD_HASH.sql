-- Add password_hash and encrypted password columns for direct email/password authentication
-- This allows us to skip Supabase Auth and use direct authentication

-- Add password_hash column (SHA-256 hash for login verification)
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Encrypted password columns should already exist from migration 004, but add if missing
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS encrypted_password TEXT,
ADD COLUMN IF NOT EXISTS password_iv TEXT,
ADD COLUMN IF NOT EXISTS password_tag TEXT;

-- Add index for email lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Update the users table to not require auth.users reference
-- Remove the foreign key constraint if it exists (we'll use direct UUID generation)
ALTER TABLE public.users
DROP CONSTRAINT IF EXISTS users_id_fkey;

-- Make id column use UUID without foreign key (we generate UUIDs client-side)
-- Note: If the column type is already UUID, this won't change it
ALTER TABLE public.users
ALTER COLUMN id DROP DEFAULT;

-- Add comments
COMMENT ON COLUMN public.users.password_hash IS 'SHA-256 hash of password for login verification (one-way)';
COMMENT ON COLUMN public.users.encrypted_password IS 'AES-256-GCM encrypted password for VPS login (reversible)';
COMMENT ON COLUMN public.users.password_iv IS 'Initialization vector for password decryption';
COMMENT ON COLUMN public.users.password_tag IS 'Authentication tag for password decryption';

