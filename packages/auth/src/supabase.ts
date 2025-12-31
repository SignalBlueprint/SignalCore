import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@sb/config";

/**
 * Create an authenticated Supabase client with a JWT token
 * This client will pass the JWT to Supabase, triggering RLS policies
 */
export function createAuthenticatedSupabaseClient(jwt: string): SupabaseClient {
  const url = getEnv("SUPABASE_URL", { required: true });
  const anonKey = getEnv("SUPABASE_ANON_KEY", { required: true });

  if (!url || !anonKey) {
    throw new Error(
      "Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
    );
  }

  // Create client with the user's JWT token
  // This sets the token in the Authorization header for all requests
  const client = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    },
  });

  return client;
}

/**
 * Create a Supabase client for the users table operations
 * Uses service role key to bypass RLS (needed for auth operations like signup/login)
 */
export function createAuthServiceClient(): SupabaseClient {
  const url = getEnv("SUPABASE_URL", { required: true });
  const serviceRoleKey = getEnv("SUPABASE_SERVICE_ROLE_KEY", { required: true });

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase configuration missing. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
    );
  }

  return createClient(url, serviceRoleKey);
}
