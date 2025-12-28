/**
 * @sb/db
 * Database utilities, models, and migrations
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@sb/config";

/**
 * Get Supabase client instance
 * Reads SUPABASE_URL and SUPABASE_ANON_KEY from environment
 * Throws clear error if missing
 */
export function getSupabaseClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL", { required: true });
  const anonKey = getEnv("SUPABASE_ANON_KEY", { required: true });

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  return createClient(url, anonKey);
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfigured(): boolean {
  try {
    const url = getEnv("SUPABASE_URL");
    const anonKey = getEnv("SUPABASE_ANON_KEY");
    return !!(url && anonKey);
  } catch {
    return false;
  }
}
