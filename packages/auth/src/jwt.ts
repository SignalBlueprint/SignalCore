import jwt from "jsonwebtoken";
import { JWTPayload } from "./types";
import { Role } from "@sb/rbac";

/**
 * Get JWT secret from environment
 */
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return secret;
}

/**
 * Get JWT expiration time from environment (default: 1h)
 */
function getJWTExpiresIn(): string {
  return process.env.JWT_EXPIRES_IN || "1h";
}

/**
 * Get refresh token expiration time from environment (default: 7d)
 */
function getRefreshTokenExpiresIn(): string {
  return process.env.JWT_REFRESH_EXPIRES_IN || "7d";
}

/**
 * Generate a JWT access token
 */
export function generateToken(payload: {
  sub: string;
  email: string;
  org_id: string;
  role: Role;
}): string {
  const secret = getJWTSecret();
  const expiresIn = getJWTExpiresIn();

  return jwt.sign(payload, secret, {
    expiresIn: expiresIn,
    algorithm: "HS256",
  } as jwt.SignOptions);
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(payload: {
  sub: string;
  email: string;
}): string {
  const secret = getJWTSecret();
  const expiresIn = getRefreshTokenExpiresIn();

  return jwt.sign(
    {
      ...payload,
      refresh: true,
    },
    secret,
    {
      expiresIn: expiresIn,
      algorithm: "HS256",
    } as jwt.SignOptions
  );
}

/**
 * Verify and decode a JWT token
 * Returns null if token is invalid or expired
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as JWTPayload;

    return decoded;
  } catch (error) {
    // Token is invalid or expired
    return null;
  }
}

/**
 * Verify a refresh token
 * Returns the payload if valid, null otherwise
 */
export function verifyRefreshToken(
  token: string
): { sub: string; email: string; refresh: boolean } | null {
  try {
    const secret = getJWTSecret();
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    }) as any;

    // Ensure this is actually a refresh token
    if (!decoded.refresh) {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a service account token for background jobs
 * Service tokens have access to all organizations
 */
export function generateServiceToken(serviceName: string): string {
  const secret = getJWTSecret();

  return jwt.sign(
    {
      sub: `service:${serviceName}`,
      service: true,
      org_id: "*", // Wildcard for all orgs
    },
    secret,
    {
      expiresIn: "365d", // Long-lived for service accounts
      algorithm: "HS256",
    } as jwt.SignOptions
  );
}

/**
 * Check if a token is a service account token
 */
export function isServiceToken(payload: JWTPayload): boolean {
  return payload.service === true;
}
