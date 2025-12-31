/**
 * Authentication routes for signup, login, token refresh, and user management
 */

import { Router, Request, Response } from "express";
import {
  hashPassword,
  verifyPassword,
  validatePassword,
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
  requireAuth,
  createAuthServiceClient,
  type AuthenticatedRequest,
  type SignupRequest,
  type LoginRequest,
  type RefreshTokenRequest,
  type User,
  type UserResponse,
} from "@sb/auth";
import { storage } from "@sb/storage";
import type { Org, Member } from "@sb/schemas";

const router = Router();

/**
 * Helper function to sanitize user data (remove password_hash)
 */
function sanitizeUser(user: User): UserResponse {
  const { password_hash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

/**
 * POST /api/auth/signup
 * Create a new user account
 */
router.post("/signup", async (req: Request, res: Response) => {
  try {
    const { email, password, orgName }: SignupRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: "Bad Request",
        message: "Email and password are required",
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({
        error: "Bad Request",
        message: "Invalid email format",
      });
      return;
    }

    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      res.status(400).json({
        error: "Bad Request",
        message: "Password does not meet requirements",
        details: passwordErrors,
      });
      return;
    }

    // Check if user already exists
    const existingUsers = await storage.list<User>("users");
    const existingUser = existingUsers.find((u) => u.email === email);
    if (existingUser) {
      res.status(409).json({
        error: "Conflict",
        message: "User with this email already exists",
      });
      return;
    }

    // Hash password
    const password_hash = await hashPassword(password);

    // Create user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();
    const user: User = {
      id: userId,
      email,
      password_hash,
      status: "active",
      email_verified: false,
      created_at: now,
      updated_at: now,
    };

    await storage.upsert("users", user);

    // Create or use existing organization
    let org: Org;
    if (orgName) {
      const orgId = crypto.randomUUID();
      org = {
        id: orgId,
        name: orgName,
        createdAt: now,
        updatedAt: now,
      };
      await storage.upsert("orgs", org);
    } else {
      // Check if default org exists
      const orgs = await storage.list<Org>("orgs");
      let defaultOrg = orgs.find((o) => o.id === "default-org");
      if (!defaultOrg) {
        defaultOrg = {
          id: "default-org",
          name: "Default Organization",
          createdAt: now,
          updatedAt: now,
        };
        await storage.upsert("orgs", defaultOrg);
      }
      org = defaultOrg;
    }

    // Create member record
    const memberId = crypto.randomUUID();
    const member: Member = {
      id: memberId,
      orgId: org.id,
      email,
      role: "owner", // First user in an org is owner
      createdAt: now,
      updatedAt: now,
    };
    await storage.upsert("members", member);

    // Generate tokens
    const token = generateToken({
      sub: userId,
      email,
      org_id: org.id,
      role: member.role,
    });

    const refreshToken = generateRefreshToken({
      sub: userId,
      email,
    });

    // Return response
    res.status(201).json({
      user: sanitizeUser(user),
      org: {
        id: org.id,
        name: org.name,
      },
      token,
      refreshToken,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to create user",
    });
  }
});

/**
 * POST /api/auth/login
 * Authenticate a user and return JWT tokens
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: "Bad Request",
        message: "Email and password are required",
      });
      return;
    }

    // Find user
    const users = await storage.list<User>("users");
    const user = users.find((u) => u.email === email);

    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
      return;
    }

    // Check if user is active
    if (user.status !== "active") {
      res.status(403).json({
        error: "Forbidden",
        message: `Account is ${user.status}`,
      });
      return;
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password_hash);
    if (!isValid) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid email or password",
      });
      return;
    }

    // Get user's organizations
    const allMembers = await storage.list<Member>("members");
    const userMemberships = allMembers.filter((m) => m.email === email);

    if (userMemberships.length === 0) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "User has no organization memberships",
      });
      return;
    }

    // If user has only one org, return token directly
    if (userMemberships.length === 1) {
      const membership = userMemberships[0];
      const orgs = await storage.list<Org>("orgs");
      const org = orgs.find((o) => o.id === membership.orgId);

      if (!org) {
        res.status(500).json({
          error: "Internal Server Error",
          message: "Organization not found",
        });
        return;
      }

      const token = generateToken({
        sub: user.id,
        email: user.email,
        org_id: org.id,
        role: membership.role,
      });

      const refreshToken = generateRefreshToken({
        sub: user.id,
        email: user.email,
      });

      res.json({
        user: sanitizeUser(user),
        org: {
          id: org.id,
          name: org.name,
        },
        token,
        refreshToken,
      });
      return;
    }

    // If user has multiple orgs, return list for selection
    const orgs = await storage.list<Org>("orgs");
    const organizations = userMemberships.map((membership) => {
      const org = orgs.find((o) => o.id === membership.orgId);
      return {
        id: membership.orgId,
        name: org?.name || "Unknown",
        role: membership.role,
      };
    });

    res.json({
      user: sanitizeUser(user),
      organizations,
      // No token yet - user needs to select an org
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to login",
    });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh an access token using a refresh token
 */
router.post("/refresh", async (req: Request, res: Response) => {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      res.status(400).json({
        error: "Bad Request",
        message: "Refresh token is required",
      });
      return;
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      res.status(401).json({
        error: "Unauthorized",
        message: "Invalid or expired refresh token",
      });
      return;
    }

    // Get user
    const user = await storage.get<User>("users", payload.sub);
    if (!user) {
      res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
      return;
    }

    // Get user's first organization (or we could require orgId in refresh request)
    const allMembers = await storage.list<Member>("members");
    const userMembership = allMembers.find((m) => m.email === user.email);

    if (!userMembership) {
      res.status(500).json({
        error: "Internal Server Error",
        message: "User has no organization memberships",
      });
      return;
    }

    // Generate new access token
    const token = generateToken({
      sub: user.id,
      email: user.email,
      org_id: userMembership.orgId,
      role: userMembership.role,
    });

    // Optionally generate new refresh token (token rotation)
    const newRefreshToken = generateRefreshToken({
      sub: user.id,
      email: user.email,
    });

    res.json({
      token,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to refresh token",
    });
  }
});

/**
 * POST /api/auth/logout
 * Logout (client should discard tokens)
 */
router.post("/logout", requireAuth, (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side by discarding tokens
  // If you implement a token blacklist, you would add the token to it here
  res.json({ success: true, message: "Logged out successfully" });
});

/**
 * GET /api/auth/me
 * Get current user information
 */
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const authenticatedReq = req as AuthenticatedRequest;
    const { userId, orgId, role } = authenticatedReq.user;

    // Get user
    const user = await storage.get<User>("users", userId);
    if (!user) {
      res.status(404).json({
        error: "Not Found",
        message: "User not found",
      });
      return;
    }

    // Get org
    const org = await storage.get<Org>("orgs", orgId);
    if (!org) {
      res.status(404).json({
        error: "Not Found",
        message: "Organization not found",
      });
      return;
    }

    res.json({
      user: sanitizeUser(user),
      org: {
        id: org.id,
        name: org.name,
      },
      role,
    });
  } catch (error) {
    console.error("Get current user error:", error);
    res.status(500).json({
      error: "Internal Server Error",
      message: "Failed to get user information",
    });
  }
});

export default router;
