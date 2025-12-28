/**
 * Load environment variables from root .env file
 * This ensures all apps in the monorepo use the same .env file
 */

import { config } from "dotenv";
import * as path from "path";
import * as fs from "fs";

/**
 * Find the root directory by looking for package.json with "signal-blueprint" name
 * or by finding the .env.example file
 */
function findRootDir(): string {
  // Start from the current working directory (where the app/script is running from)
  // This will be the monorepo root when running via pnpm commands
  let currentDir = process.cwd();
  
  // Walk up the directory tree to find the monorepo root
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, "package.json");
    const envExamplePath = path.join(currentDir, ".env.example");
    
    // Check for root package.json with "signal-blueprint" name
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        if (packageJson.name === "signal-blueprint") {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }
    
    // Check for .env.example as an indicator of root
    if (fs.existsSync(envExamplePath)) {
      return currentDir;
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  // Fallback: if we're in packages/config/src (when running from built dist), go up 3 levels
  if (__dirname.includes("packages/config")) {
    const potentialRoot = path.resolve(__dirname, "../../..");
    if (fs.existsSync(path.join(potentialRoot, ".env.example"))) {
      return potentialRoot;
    }
  }
  
  // Last resort: return current working directory
  return process.cwd();
}

/**
 * Load .env file from repository root
 * This should be called at the very start of each app's entry point
 */
export function loadRootEnv(): void {
  const rootDir = findRootDir();
  const envPath = path.join(rootDir, ".env");
  
  // Debug logging (can be removed in production)
  if (process.env.DEBUG_ENV) {
    console.log("[@sb/config] Loading .env from:", envPath);
    console.log("[@sb/config] Root directory:", rootDir);
    console.log("[@sb/config] .env exists:", fs.existsSync(envPath));
  }
  
  // Check if .env file exists
  if (!fs.existsSync(envPath)) {
    if (process.env.DEBUG_ENV) {
      console.warn("[@sb/config] Warning: .env file not found at:", envPath);
    }
    return;
  }
  
  // Load .env from root, but don't override existing env vars
  const result = config({ path: envPath, override: false });
  
  if (result.error) {
    const errorMsg = `Failed to load .env file from ${envPath}: ${result.error.message}`;
    if (process.env.DEBUG_ENV) {
      console.error("[@sb/config]", errorMsg);
    }
    // In development, warn but don't throw (env vars might be set another way)
    // In production, this should probably throw
    if (process.env.NODE_ENV === "production") {
      throw new Error(errorMsg);
    }
  }
  
  // Also try .env.local if it exists (for local overrides)
  const envLocalPath = path.join(rootDir, ".env.local");
  if (fs.existsSync(envLocalPath)) {
    config({ path: envLocalPath, override: true });
  }
  
  // Verify OPENAI_API_KEY was loaded (for debugging)
  if (process.env.DEBUG_ENV) {
    console.log("[@sb/config] OPENAI_API_KEY loaded:", !!process.env.OPENAI_API_KEY);
  }
}

