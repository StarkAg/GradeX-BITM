-- Migration: Add plain password column to users table
-- Removes encryption requirement - stores passwords as plain text

-- Add password column if it doesn't exist
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS password TEXT;

-- Drop encrypted password columns if they exist (optional cleanup)
-- ALTER TABLE public.users DROP COLUMN IF EXISTS encrypted_password;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS password_iv;
-- ALTER TABLE public.users DROP COLUMN IF EXISTS password_tag;

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

COMMENT ON COLUMN public.users.password IS 'Plain text password (no encryption)';

