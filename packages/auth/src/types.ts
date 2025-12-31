import { Request } from "express";
import { Role } from "@sb/rbac";

/**
 * JWT Payload structure
 */
export interface JWTPayload {
  sub: string;        // user_id
  email: string;      // user email
  org_id: string;     // selected organization
  role: Role;         // role in this org (owner, admin, member)
  iat: number;        // issued at (timestamp)
  exp: number;        // expiration (timestamp)
  service?: boolean;  // true for service account tokens
}

/**
 * User record from database
 */
export interface User {
  id: string;
  email: string;
  password_hash: string;
  status: "active" | "suspended" | "pending_verification";
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * User data returned to client (without password_hash)
 */
export interface UserResponse {
  id: string;
  email: string;
  status: string;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Authenticated request with user context
 */
export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    orgId: string;
    role: Role;
  };
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  token: string;
  refreshToken: string;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Signup request body
 */
export interface SignupRequest {
  email: string;
  password: string;
  orgName?: string;
}

/**
 * Organization selection request (for multi-org users)
 */
export interface SelectOrgRequest {
  orgId: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: UserResponse;
  org?: {
    id: string;
    name: string;
  };
  organizations?: Array<{
    id: string;
    name: string;
    role: Role;
  }>;
  token?: string;
  refreshToken?: string;
}

/**
 * Signup response
 */
export interface SignupResponse {
  user: UserResponse;
  org: {
    id: string;
    name: string;
  };
  token: string;
  refreshToken: string;
}
