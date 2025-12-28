#!/usr/bin/env tsx

/**
 * Test script to verify environment variables are loading correctly
 */

// Import @sb/config - this automatically loads the .env file
import "@sb/config";

console.log("Testing environment variable loading...\n");

console.log("Environment variables:");
console.log("  OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "✓ Set" : "✗ Not set");
if (process.env.OPENAI_API_KEY) {
  console.log("    (length:", process.env.OPENAI_API_KEY.length, "characters)");
}
console.log("  SUPABASE_URL:", process.env.SUPABASE_URL ? "✓ Set" : "✗ Not set");
console.log("  SUPABASE_ANON_KEY:", process.env.SUPABASE_ANON_KEY ? "✓ Set" : "✗ Not set");
console.log("  PORT:", process.env.PORT || "3000 (default)");
console.log("  NODE_ENV:", process.env.NODE_ENV || "development (default)");

if (!process.env.OPENAI_API_KEY) {
  console.error("\n❌ ERROR: OPENAI_API_KEY is not set!");
  console.error("   Make sure .env file exists in the repository root.");
  console.error("   Current working directory:", process.cwd());
  process.exit(1);
} else {
  console.log("\n✅ Environment variables loaded successfully!");
}

