/**
 * Authentication Middleware
 * Validates user identity and authorization
 */

import { Request, Response, NextFunction } from "express";

/**
 * Extract user ID from request headers
 * In production, this should validate JWT tokens or session cookies
 */
export function getUserId(req: Request): string {
  // Try to get from header (demo mode)
  const userId = req.headers["x-user-id"] as string;

  // In production, extract from JWT token:
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // const decoded = verifyJWT(token);
  // return decoded.userId;

  return userId || "demo-user";
}

/**
 * Require authentication middleware
 * Ensures user is authenticated before accessing protected routes
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
        message: "Please provide authentication credentials",
      });
    }

    // Attach userId to request for downstream use
    (req as any).userId = userId;
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(401).json({
      success: false,
      error: "Invalid authentication credentials",
    });
  }
}

/**
 * Optional authentication middleware
 * Attaches user ID if available, but doesn't require it
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = getUserId(req);
    if (userId) {
      (req as any).userId = userId;
    }
    next();
  } catch (error) {
    // Continue without auth
    next();
  }
}

/**
 * Check if user owns a resource
 * Used for authorization checks on user-owned data
 */
export function checkOwnership(resourceUserId: string, requestUserId: string): boolean {
  return resourceUserId === requestUserId;
}

/**
 * Middleware to verify resource ownership
 * Use this after requireAuth to ensure user owns the resource
 */
export function requireOwnership(
  getResourceUserId: (req: Request) => Promise<string | null>
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requestUserId = (req as any).userId;
      if (!requestUserId) {
        return res.status(401).json({
          success: false,
          error: "Authentication required",
        });
      }

      const resourceUserId = await getResourceUserId(req);
      if (!resourceUserId) {
        return res.status(404).json({
          success: false,
          error: "Resource not found",
        });
      }

      if (!checkOwnership(resourceUserId, requestUserId)) {
        return res.status(403).json({
          success: false,
          error: "Forbidden - You don't have permission to access this resource",
        });
      }

      next();
    } catch (error) {
      console.error("Ownership check error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to verify resource ownership",
      });
    }
  };
}
