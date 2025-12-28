/**
 * @sb/db
 * Database utilities, models, and migrations
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@sb/config";

// Re-export SupabaseClient type for use in other packages
export type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Get Supabase client instance
 * Prefers SUPABASE_SERVICE_ROLE_KEY for backend operations (bypasses RLS)
 * Falls back to SUPABASE_ANON_KEY if service role key not available
 * Throws clear error if missing
 */
export function getSupabaseClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL", { required: true });
  
  // Prefer service role key for backend operations (bypasses RLS)
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = getEnv("SUPABASE_ANON_KEY", { required: !serviceRoleKey });

  if (!url) {
    throw new Error(
      "Supabase configuration missing. Please set SUPABASE_URL environment variable."
    );
  }

  // Use service role key if available (for backend operations)
  // Otherwise fall back to anon key (for client-side operations)
  const key = serviceRoleKey || anonKey;
  
  if (!key) {
    throw new Error(
      "Supabase key missing. Please set SUPABASE_SERVICE_ROLE_KEY (recommended for backend) or SUPABASE_ANON_KEY environment variable."
    );
  }

  return createClient(url, key);
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  try {
    const url = getEnv("SUPABASE_URL");
    const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = getEnv("SUPABASE_ANON_KEY");
    return !!(url && (serviceRoleKey || anonKey));
  } catch {
    return false;
  }
}
