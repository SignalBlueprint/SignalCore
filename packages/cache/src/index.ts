/**
 * @sb/cache
 * Filesystem-based cache for AI results and other data
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";

const CACHE_DIR = path.join(process.cwd(), ".sb", "cache");

/**
 * Ensure cache directory exists
 */
function ensureCacheDir(): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
}

/**
 * Get file path for a cache key (hash)
 */
function getCacheFilePath(key: string): string {
  ensureCacheDir();
  // Use first 2 chars as subdirectory to avoid too many files in one dir
  const prefix = key.substring(0, 2);
  const subdir = path.join(CACHE_DIR, prefix);
  if (!fs.existsSync(subdir)) {
    fs.mkdirSync(subdir, { recursive: true });
  }
  return path.join(subdir, `${key}.json`);
}

/**
 * Generate hash from input string
 */
export function hashInput(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

/**
 * Get JSON value from cache by key
 */
export function getJson<T>(key: string): T | null {
  try {
    const filepath = getCacheFilePath(key);
    if (!fs.existsSync(filepath)) {
      return null;
    }
    const content = fs.readFileSync(filepath, "utf-8");
    return JSON.parse(content) as T;
  } catch (error) {
    // If file doesn't exist or parsing fails, return null
    return null;
  }
}

/**
 * Set JSON value in cache by key
 */
export function setJson<T>(key: string, value: T): void {
  try {
    const filepath = getCacheFilePath(key);
    const content = JSON.stringify(value, null, 2);
    fs.writeFileSync(filepath, content, "utf-8");
  } catch (error) {
    console.error(`Failed to write cache for key ${key}:`, error);
  }
}

/**
 * Clear cache entry by key
 */
export function clearCache(key: string): void {
  try {
    const filepath = getCacheFilePath(key);
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  } catch (error) {
    console.error(`Failed to clear cache for key ${key}:`, error);
  }
}

/**
 * Get cache directory path
 */
export function getCacheDir(): string {
  ensureCacheDir();
  return CACHE_DIR;
}

