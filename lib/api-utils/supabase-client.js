/**
 * Supabase Client for GradeX
 * Used to fetch student data from Supabase instead of JSON file
 */

import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL 
  || process.env.NEXT_PUBLIC_SUPABASE_URL
  || 'https://phlggcheaajkupppozho.supabase.co';

// Use anon key for read operations (prefer env var, fallback to default)
// Service role key is available for admin operations but not used by default
const supabaseKey = process.env.SUPABASE_ANON_KEY 
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || process.env.SUPABASE_SERVICE_ROLE_KEY
  || process.env.SUPABASE_ACCESS_TOKEN
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBobGdnY2hlYWFqa3VwcHBvemhvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODQ0NTgsImV4cCI6MjA3ODg2MDQ1OH0.TGEDpm2uqKceOxAMB5aG6fd8uHESmwfdKF-cqm2QU84';

// Service role key for admin operations (full access)
// ⚠️ SECURITY: Never hardcode service role keys! Use environment variables only.
export const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY 
  || process.env.SUPABASE_ACCESS_TOKEN
  || null;

// Create admin client with service role (for admin operations)
export const supabaseAdmin = supabaseUrl && serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })
  : null;

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) environment variables.');
}

// Create Supabase client
export const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false, // Don't persist sessions in serverless functions
        autoRefreshToken: false,
      }
    })
  : null;

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured() {
  return supabase !== null;
}

