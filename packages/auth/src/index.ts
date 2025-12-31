/**
 * @sb/auth
 * Authentication and authorization utilities for Signal Blueprint suite
 */

// Types
export * from "./types";

// JWT utilities
export {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateServiceToken,
  isServiceToken,
} from "./jwt";

// Password utilities
export {
  hashPassword,
  verifyPassword,
  validatePassword,
  isPasswordValid,
  PASSWORD_RULES,
} from "./password";

// Express middleware
export {
  requireAuth,
  optionalAuth,
  requireRole,
  requirePermission,
  requireAdmin,
  requireOwner,
} from "./middleware";

// Supabase client
export {
  createAuthenticatedSupabaseClient,
  createAuthServiceClient,
} from "./supabase";
