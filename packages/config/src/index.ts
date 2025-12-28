/**
 * @sb/config
 * Environment variable and runtime configuration management
 */

// Load root .env file automatically when this package is imported
import { loadRootEnv } from "./load-env";
loadRootEnv();

// Export loadRootEnv for explicit loading if needed
export { loadRootEnv } from "./load-env";

export interface GetEnvOptions {
  required?: boolean;
  default?: string;
}

/**
 * Get environment variable with optional default or required validation
 */
export function getEnv(name: string, options: GetEnvOptions = {}): string {
  const value = process.env[name];

  if (value !== undefined) {
    return value;
  }

  if (options.default !== undefined) {
    return options.default;
  }

  if (options.required) {
    throw new Error(`Required environment variable ${name} is not set`);
  }

  return "";
}

/**
 * Safe environment variables object with defaults
 */
export const ENV = {
  NODE_ENV: getEnv("NODE_ENV", { default: "development" }),
  OPENAI_API_KEY: getEnv("OPENAI_API_KEY", { required: false }),
  LOG_LEVEL: getEnv("LOG_LEVEL", { default: "info" }),
} as const;

