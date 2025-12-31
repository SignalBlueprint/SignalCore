import { Request, Response, NextFunction } from "express";
import { verifyToken } from "./jwt";
import { AuthenticatedRequest } from "./types";
import { Role, can, Permission } from "@sb/rbac";

/**
 * Extract bearer token from Authorization header
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return null;
  }

  return parts[1];
}

/**
 * Middleware to require authentication
 * Blocks the request if no valid token is present
 */
export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Authentication token required",
    });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
    return;
  }

  // Attach user context to request
  (req as AuthenticatedRequest).user = {
    userId: payload.sub,
    email: payload.email,
    orgId: payload.org_id,
    role: payload.role,
  };

  next();
}

/**
 * Middleware for optional authentication
 * Attaches user context if token is present, but doesn't block if missing
 */
export function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = extractBearerToken(req);

  if (token) {
    const payload = verifyToken(token);

    if (payload) {
      (req as AuthenticatedRequest).user = {
        userId: payload.sub,
        email: payload.email,
        orgId: payload.org_id,
        role: payload.role,
      };
    }
  }

  next();
}

/**
 * Middleware to require a specific role
 * Must be used after requireAuth
 */
export function requireRole(...allowedRoles: Role[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authenticatedReq = req as AuthenticatedRequest;

    if (!authenticatedReq.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    if (!allowedRoles.includes(authenticatedReq.user.role)) {
      res.status(403).json({
        error: "Forbidden",
        message: "Insufficient permissions",
        required: allowedRoles,
        current: authenticatedReq.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require a specific permission
 * Must be used after requireAuth
 */
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authenticatedReq = req as AuthenticatedRequest;

    if (!authenticatedReq.user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Authentication required",
      });
      return;
    }

    if (!can(authenticatedReq.user.role, permission)) {
      res.status(403).json({
        error: "Forbidden",
        message: `Permission denied: ${permission}`,
        role: authenticatedReq.user.role,
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to require admin role (owner or admin)
 */
export const requireAdmin = requireRole("owner", "admin");

/**
 * Middleware to require owner role
 */
export const requireOwner = requireRole("owner");
