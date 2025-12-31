# @sb/auth

JWT-based authentication and authorization system for the Signal Blueprint suite with multi-tenant support, role-based access control, and Express middleware.

## Purpose

`@sb/auth` provides a complete authentication solution for the suite including user signup/login, JWT token generation and verification, password hashing, Express middleware for protecting routes, multi-tenant organization support, and role-based access control integration with `@sb/rbac`.

## Features

### Authentication
- **JWT Tokens** - Secure access tokens with configurable expiration
- **Refresh Tokens** - Long-lived tokens for token rotation
- **Service Accounts** - Special tokens for background jobs and inter-service communication
- **Password Security** - Bcrypt hashing with complexity validation
- **Multi-tenant Support** - Organization-scoped authentication with org_id in JWT claims

### Authorization
- **Role-Based Access Control** - Owner, Admin, Member roles per organization
- **Express Middleware** - Easy route protection with `requireAuth`, `requireRole`, etc.
- **Permission Checks** - Fine-grained permission validation
- **Service Token Detection** - Identify and handle service account requests

### Security Features
- **Password Complexity Rules** - Enforced minimum length, character requirements
- **Token Expiration** - Configurable access token and refresh token lifetimes
- **Secure Hashing** - Bcrypt with salt rounds for password storage
- **Token Rotation** - Refresh tokens for enhanced security

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Setup

1. **Set environment variables** in root `.env`:

```bash
JWT_SECRET=your-very-secret-key-change-in-production
JWT_EXPIRES_IN=1h          # Access token expiration (optional, default: 1h)
JWT_REFRESH_EXPIRES_IN=7d  # Refresh token expiration (optional, default: 7d)
```

2. **Run database migrations** to create users and orgs tables:

```bash
# See docs/supabase-migrations/ for SQL scripts
```

### User Registration

```typescript
import { hashPassword, validatePassword, generateToken, generateRefreshToken } from "@sb/auth";
import { storage } from "@sb/storage";

// Validate password complexity
const validation = validatePassword(password);
if (!validation.valid) {
  throw new Error(validation.errors.join(", "));
}

// Hash password
const passwordHash = await hashPassword(password);

// Create user
const user = await storage.upsert("users", {
  id: generateId(),
  email: email.toLowerCase(),
  password_hash: passwordHash,
  status: "active",
  email_verified: false,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
});

// Create organization for new user
const org = await storage.upsert("organizations", {
  id: generateId(),
  name: orgName || `${email}'s Organization`,
  created_at: new Date().toISOString()
});

// Generate tokens
const token = generateToken({
  sub: user.id,
  email: user.email,
  org_id: org.id,
  role: "owner"
});

const refreshToken = generateRefreshToken({
  sub: user.id,
  email: user.email
});
```

### User Login

```typescript
import { verifyPassword, generateToken, generateRefreshToken } from "@sb/auth";
import { storage } from "@sb/storage";

// Find user by email
const users = await storage.list("users", (u) => u.email === email.toLowerCase());
const user = users[0];

if (!user) {
  throw new Error("Invalid credentials");
}

// Verify password
const valid = await verifyPassword(password, user.password_hash);
if (!valid) {
  throw new Error("Invalid credentials");
}

// Get user's organizations
const memberships = await storage.list("org_members",
  (m) => m.user_id === user.id
);

// Generate tokens for primary org
const token = generateToken({
  sub: user.id,
  email: user.email,
  org_id: memberships[0].org_id,
  role: memberships[0].role
});

const refreshToken = generateRefreshToken({
  sub: user.id,
  email: user.email
});
```

### Protecting Routes with Middleware

```typescript
import express from "express";
import { requireAuth, requireAdmin, requireOwner, optionalAuth } from "@sb/auth";

const app = express();

// Public route (no auth required)
app.get("/api/public", (req, res) => {
  res.json({ message: "Public data" });
});

// Protected route (any authenticated user)
app.get("/api/profile", requireAuth, (req, res) => {
  const { userId, email, orgId, role } = req.user;
  res.json({ userId, email, orgId, role });
});

// Admin-only route
app.post("/api/admin/users", requireAdmin, (req, res) => {
  // Only admins and owners can access
  res.json({ message: "Admin action" });
});

// Owner-only route
app.delete("/api/admin/org", requireOwner, (req, res) => {
  // Only org owners can access
  res.json({ message: "Owner action" });
});

// Optional auth (user context if authenticated)
app.get("/api/content", optionalAuth, (req, res) => {
  if (req.user) {
    // Authenticated user
    res.json({ content: "Premium content", user: req.user });
  } else {
    // Anonymous user
    res.json({ content: "Public content" });
  }
});
```

### Service Account Tokens

For background jobs and inter-service communication:

```typescript
import { generateServiceToken, isServiceToken } from "@sb/auth";

// Generate service token (no expiration, marked as service: true)
const serviceToken = generateServiceToken({
  sub: "worker-service",
  email: "worker@system",
  org_id: orgId,
  role: "admin"
});

// Use in Worker jobs
const headers = {
  Authorization: `Bearer ${serviceToken}`
};

// Check if token is a service token
const payload = verifyToken(token);
if (isServiceToken(payload)) {
  console.log("Service account request");
}
```

### Token Refresh

```typescript
import { verifyRefreshToken, generateToken } from "@sb/auth";

// Verify refresh token
const payload = verifyRefreshToken(refreshToken);
if (!payload) {
  throw new Error("Invalid refresh token");
}

// Generate new access token
const newToken = generateToken({
  sub: payload.sub,
  email: payload.email,
  org_id: payload.org_id,
  role: payload.role
});

res.json({ token: newToken });
```

### Password Validation

```typescript
import { validatePassword, isPasswordValid, PASSWORD_RULES } from "@sb/auth";

// Detailed validation
const result = validatePassword("weak");
console.log(result.valid); // false
console.log(result.errors);
// [
//   "Password must be at least 8 characters long",
//   "Password must contain at least one uppercase letter",
//   "Password must contain at least one number"
// ]

// Simple boolean check
if (!isPasswordValid(password)) {
  throw new Error("Password does not meet requirements");
}

// Display requirements to user
console.log(PASSWORD_RULES);
// {
//   minLength: 8,
//   requireUppercase: true,
//   requireLowercase: true,
//   requireNumber: true,
//   requireSpecialChar: false
// }
```

## API Reference

### JWT Functions

#### `generateToken(payload): string`

Generate an access token.

**Parameters:**
- `sub` - User ID
- `email` - User email
- `org_id` - Organization ID
- `role` - User role in organization

**Returns:** JWT token string

**Expiration:** Configured via `JWT_EXPIRES_IN` (default: 1h)

#### `generateRefreshToken(payload): string`

Generate a refresh token.

**Parameters:**
- `sub` - User ID
- `email` - User email

**Returns:** Refresh token string

**Expiration:** Configured via `JWT_REFRESH_EXPIRES_IN` (default: 7d)

#### `verifyToken(token): JWTPayload | null`

Verify and decode an access token.

**Returns:** Decoded payload or null if invalid/expired

#### `verifyRefreshToken(token): JWTPayload | null`

Verify and decode a refresh token.

**Returns:** Decoded payload or null if invalid/expired

#### `generateServiceToken(payload): string`

Generate a service account token (no expiration).

**Parameters:** Same as `generateToken`

**Returns:** JWT token with `service: true` flag

#### `isServiceToken(payload): boolean`

Check if a token payload is from a service account.

### Password Functions

#### `hashPassword(password): Promise<string>`

Hash a password using bcrypt.

**Returns:** Password hash (60 characters)

**Cost Factor:** 10 rounds

#### `verifyPassword(password, hash): Promise<boolean>`

Verify a password against a hash.

**Returns:** true if password matches

#### `validatePassword(password): ValidationResult`

Validate password against complexity rules.

**Returns:**
```typescript
{
  valid: boolean;
  errors: string[];
}
```

#### `isPasswordValid(password): boolean`

Simple boolean password validation.

**Returns:** true if password meets all requirements

### Middleware

#### `requireAuth(req, res, next)`

Require authentication for a route.

**Adds to request:**
- `req.user.userId`
- `req.user.email`
- `req.user.orgId`
- `req.user.role`

**Returns:** 401 if not authenticated

#### `optionalAuth(req, res, next)`

Add user context if authenticated, allow through if not.

**Adds to request:** Same as `requireAuth` (if authenticated)

#### `requireRole(role)(req, res, next)`

Require specific role or higher.

**Example:** `requireRole("admin")` allows admins and owners

**Returns:** 403 if insufficient permissions

#### `requireAdmin(req, res, next)`

Require admin or owner role.

**Shorthand for:** `requireRole("admin")`

#### `requireOwner(req, res, next)`

Require owner role.

**Shorthand for:** `requireRole("owner")`

#### `requirePermission(permission)(req, res, next)`

Require specific permission.

**Example:** `requirePermission("products.delete")`

**Returns:** 403 if permission not granted

### Types

```typescript
interface JWTPayload {
  sub: string;        // user_id
  email: string;      // user email
  org_id: string;     // organization
  role: Role;         // role in org
  iat: number;        // issued at
  exp: number;        // expiration
  service?: boolean;  // service account flag
}

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    orgId: string;
    role: Role;
  };
}
```

## Password Requirements

Default password rules:
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Special characters optional

## Multi-Tenant Architecture

Each user can belong to multiple organizations with different roles:

```typescript
// User belongs to multiple orgs
const memberships = [
  { user_id: "user_1", org_id: "org_a", role: "owner" },
  { user_id: "user_1", org_id: "org_b", role: "member" }
];

// JWT contains selected org
const token = generateToken({
  sub: "user_1",
  email: "user@example.com",
  org_id: "org_a",  // Currently selected org
  role: "owner"      // Role in selected org
});

// User can switch orgs by requesting new token
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `JWT_SECRET` | Yes | Secret key for signing JWTs | - |
| `JWT_EXPIRES_IN` | No | Access token expiration | `1h` |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiration | `7d` |

**IMPORTANT:** Use a strong, random `JWT_SECRET` in production. Generate with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Security Best Practices

### 1. Strong JWT Secret

```bash
# Generate a strong secret
JWT_SECRET=$(openssl rand -hex 32)
```

### 2. HTTPS Only

Always use HTTPS in production to protect tokens in transit.

### 3. Token Rotation

Implement token refresh to rotate access tokens regularly:

```typescript
// Access token: 1 hour (short-lived)
// Refresh token: 7 days (long-lived)
// Rotate access token every hour using refresh token
```

### 4. Logout

Implement token blacklisting or short token lifetimes for logout:

```typescript
// Client-side: Delete tokens from storage
localStorage.removeItem('token');
localStorage.removeItem('refreshToken');

// Server-side: (Optional) Maintain blacklist of invalidated tokens
```

### 5. Password Storage

Never store plaintext passwords. Always use `hashPassword`:

```typescript
// ❌ BAD
user.password = password;

// ✅ GOOD
user.password_hash = await hashPassword(password);
```

## Database Schema

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE org_members (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  org_id TEXT REFERENCES organizations(id),
  role TEXT NOT NULL, -- 'owner', 'admin', 'member'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id)
);
```

See `docs/supabase-migrations/` for complete schema.

## Testing

```bash
# Run tests
pnpm --filter @sb/auth test
```

## Dependencies

- `@sb/config` - Environment configuration
- `@sb/rbac` - Role and permission definitions
- `@sb/storage` - User and org data persistence
- `bcrypt` - Password hashing
- `jsonwebtoken` - JWT generation and verification
- `@supabase/supabase-js` - Supabase client

## Used By

- **Console** - User signup, login, and session management
- **Worker** - Service account tokens for background jobs
- All apps (planned) - Route protection and authorization

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
