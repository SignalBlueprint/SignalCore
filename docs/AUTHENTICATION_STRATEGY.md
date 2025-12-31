# Suite-Wide Authentication Strategy

## Executive Summary

This document outlines the authentication architecture for the Signal Blueprint suite, designed to support both your organization and future clients in a secure, scalable multi-tenant environment.

**Current State:** ✅ Excellent foundation exists
- RLS policies in Supabase expect JWT claims (`org_id`, `email`)
- RBAC system defined with owner/admin/member roles
- Org and Member schema already implemented
- 7 Express apps currently have NO authentication (hardcoded `"default-org"`)

**Goal:** Implement JWT-based authentication with organization-level multi-tenancy

---

## Architecture Overview

### Authentication Flow

```
┌─────────┐           ┌──────────────┐           ┌─────────────┐
│ Browser │──login──▶ │ Auth Service │──JWT────▶ │ Any App API │
│         │           │ (Console?)   │           │ (with auth) │
└─────────┘           └──────────────┘           └─────────────┘
                             │                          │
                             ▼                          ▼
                      ┌─────────────┐           ┌─────────────┐
                      │  users      │           │ Supabase RLS│
                      │  members    │◀──────────│ Enforcement │
                      │  orgs       │   JWT     └─────────────┘
                      └─────────────┘
```

### Key Principles

1. **JWT-Based Tokens**: Stateless authentication across all apps
2. **Organization-Scoped**: Every request carries `org_id` in JWT
3. **Multi-Tenant Safe**: RLS policies enforce data isolation at DB level
4. **Shared Auth Package**: `@sb/auth` used by all 7 apps
5. **Service-to-Service Auth**: Worker and background jobs use service tokens

---

## Data Model

### New: Users Table

**Missing piece** - need to create this:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active', -- active, suspended, pending_verification
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Existing: Members Table

Links users to organizations (many-to-many):

```sql
members (
  id UUID PRIMARY KEY,
  org_id TEXT REFERENCES orgs(id),
  email TEXT NOT NULL,  -- Links to users.email
  role TEXT NOT NULL,    -- owner, admin, member
  -- Working Genius profile data...
)
```

**Relationship:**
- 1 user can be member of multiple orgs (different roles)
- 1 org has multiple members
- JWT contains: `user_id`, `email`, `org_id` (selected org for this session)

---

## Implementation Plan

### Phase 1: Foundation (`@sb/auth` package)

Create `/packages/auth/` with:

#### 1.1 JWT Utilities

```typescript
// packages/auth/src/jwt.ts

interface JWTPayload {
  sub: string;        // user_id
  email: string;      // user email
  org_id: string;     // selected organization
  role: Role;         // role in this org
  iat: number;        // issued at
  exp: number;        // expiration
}

export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string
export function verifyToken(token: string): JWTPayload | null
export function refreshToken(token: string): string | null
```

**Environment Variables:**
```bash
JWT_SECRET=<random-256-bit-secret>
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

#### 1.2 Express Middleware

```typescript
// packages/auth/src/middleware.ts

export interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    email: string;
    orgId: string;
    role: Role;
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction)
export function optionalAuth(req: Request, res: Response, next: NextFunction)
export function requirePermission(permission: Permission)
export function requireRole(role: Role)
```

#### 1.3 Password Utilities

```typescript
// packages/auth/src/password.ts

export async function hashPassword(password: string): Promise<string>
export async function verifyPassword(password: string, hash: string): Promise<boolean>
```

Use `bcrypt` or `argon2` for hashing.

#### 1.4 Supabase Client Integration

```typescript
// packages/auth/src/supabase.ts

// Create Supabase client with JWT automatically injected
export function createAuthenticatedSupabaseClient(jwt: string): SupabaseClient
```

This client will pass JWT to Supabase, triggering RLS policies.

---

### Phase 2: Authentication Endpoints

**Option A:** Add to Console app (`apps/console`)
**Option B:** Create dedicated `apps/auth-service`

Recommended: **Option A** (Console) for simplicity initially.

#### 2.1 Auth Routes

```typescript
POST /api/auth/signup
  Body: { email, password, orgName? }
  Response: { user, token, refreshToken }

  Creates:
  1. User record
  2. Org record (if orgName provided)
  3. Member record (as owner)
  4. Returns JWT

POST /api/auth/login
  Body: { email, password }
  Response: { user, organizations, token }

  Process:
  1. Verify password
  2. Fetch user's orgs from members table
  3. If 1 org: return JWT with that org_id
  4. If multiple orgs: return list, require org selection

POST /api/auth/login/select-org
  Body: { orgId }
  Headers: Authorization: Bearer <temp-token>
  Response: { token, org }

  For users with multiple org memberships

POST /api/auth/refresh
  Body: { refreshToken }
  Response: { token }

POST /api/auth/logout
  Headers: Authorization: Bearer <token>
  Response: { success: true }

  Optional: Implement token blacklist

GET /api/auth/me
  Headers: Authorization: Bearer <token>
  Response: { user, org, role }
```

#### 2.2 Invitation Flow

```typescript
POST /api/auth/invite
  Body: { email, role }
  Headers: Authorization: Bearer <admin-token>

  Creates pending member, sends email

POST /api/auth/accept-invite
  Body: { inviteToken, password }

  Creates user, activates member
```

---

### Phase 3: Apply to All Apps

#### 3.1 Update Each App Server

Apply to all 7 apps:
- `apps/questboard/src/server.ts`
- `apps/leadscout/src/server.ts`
- `apps/siteforge/src/server.ts`
- `apps/catalog/src/server.ts`
- `apps/outreach/src/server.ts`
- `apps/console/src/server.ts`
- `apps/demoapp/src/server.ts`

```typescript
import { requireAuth, type AuthenticatedRequest } from "@sb/auth";

// Apply globally (recommended)
app.use(requireAuth);

// OR apply per-route
app.get("/api/goals", requireAuth, async (req: AuthenticatedRequest, res) => {
  const { orgId, userId } = req.user;
  // Use orgId, userId from auth context
  const goals = await getAllGoals(orgId);
  res.json(goals);
});
```

#### 3.2 Update Storage Layer

**Option A:** Inject org context automatically in storage

```typescript
// packages/storage/src/supabase.ts

export class SupabaseStorage implements Storage {
  constructor(private jwt?: string) {}

  async list<T>(kind: string): Promise<T[]> {
    const client = this.jwt
      ? createAuthenticatedSupabaseClient(this.jwt)
      : createSupabaseClient(); // Service role for Worker

    // RLS automatically filters by org_id from JWT
    const { data } = await client.from(tableName).select("*");
    return data;
  }
}
```

**Option B:** Pass orgId explicitly (current approach)

Keep current signature, just get `orgId` from auth context instead of hardcoding.

---

### Phase 4: Database Migration

Create new migration:

```sql
-- supabase/migrations/003_users_table.sql

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_users_email ON users(email);

-- RLS policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own record"
  ON users FOR SELECT
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

CREATE POLICY "Users can update their own record"
  ON users FOR UPDATE
  USING (
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
  );

-- For signup (needs to be callable without auth)
CREATE POLICY "Allow user creation"
  ON users FOR INSERT
  WITH CHECK (true);
```

---

### Phase 5: Service-to-Service Auth

**Problem:** Worker cron jobs need to access all orgs without user context.

**Solution:** Service account tokens

```typescript
// packages/auth/src/service.ts

export function generateServiceToken(service: string): string {
  return jwt.sign(
    {
      sub: `service:${service}`,
      service: true,
      org_id: "*", // Wildcard for all orgs
    },
    JWT_SECRET
  );
}
```

Update RLS policies to allow service tokens:

```sql
CREATE OR REPLACE FUNCTION is_service_account()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN current_setting('request.jwt.claims', true)::json->>'service' = 'true';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update policies
CREATE POLICY "Users can read goals in their orgs"
  ON goals FOR SELECT
  USING (
    is_member_of_org(org_id)
    OR is_service_account()
    OR get_user_org_id() IS NULL -- Dev mode
  );
```

---

## Security Considerations

### 1. Password Requirements

```typescript
const PASSWORD_RULES = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};
```

### 2. Rate Limiting

Apply to auth endpoints:

```typescript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: "Too many login attempts, please try again later",
});

app.post("/api/auth/login", authLimiter, loginHandler);
```

### 3. HTTPS Only

```typescript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === "production" && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

### 4. Secure Headers

```typescript
import helmet from "helmet";
app.use(helmet());
```

### 5. CORS Configuration

```typescript
import cors from "cors";

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:4000"],
  credentials: true,
}));
```

### 6. Token Rotation

Implement refresh token rotation:
- Short-lived access tokens (15-60 min)
- Long-lived refresh tokens (7 days)
- Refresh tokens invalidated on use (one-time use)

---

## Client-Side Integration

### Frontend Token Storage

**Recommended:** `httpOnly` cookies for refresh token, memory for access token

```typescript
// Store refresh token in httpOnly cookie (server sets)
res.cookie("refreshToken", refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: "strict",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

// Access token in memory (JavaScript)
localStorage.setItem("accessToken", token); // OR in-memory only
```

### API Client

```typescript
// packages/ui/src/api-client.ts

class APIClient {
  private token: string | null = null;

  setToken(token: string) {
    this.token = token;
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(endpoint, { ...options, headers });

    if (response.status === 401) {
      // Token expired, try refresh
      await this.refreshToken();
      return this.request(endpoint, options); // Retry
    }

    return response;
  }

  async refreshToken() {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include", // Send httpOnly cookie
    });

    if (response.ok) {
      const { token } = await response.json();
      this.setToken(token);
    } else {
      // Refresh failed, redirect to login
      window.location.href = "/login";
    }
  }
}

export const apiClient = new APIClient();
```

---

## Migration Path for Existing Data

Your existing data uses `"default-org"` as orgId. Migration strategy:

### Option 1: Keep "default-org"

1. Create seed user for your team
2. Create org with id `"default-org"`
3. Add team members to this org
4. All existing data automatically belongs to this org

### Option 2: Migrate to Real Org IDs

```sql
-- Create new org
INSERT INTO orgs (id, name) VALUES ('uuid-here', 'Signal Blueprint');

-- Update all existing data
UPDATE goals SET org_id = 'uuid-here' WHERE org_id = 'default-org';
UPDATE questlines SET org_id = 'uuid-here' WHERE org_id = 'default-org';
-- etc.
```

**Recommendation:** Option 1 for simplicity.

---

## Implementation Checklist

### Immediate (Week 1-2)

- [ ] Create `packages/auth/` package
  - [ ] JWT utilities (generate, verify, refresh)
  - [ ] Password hashing utilities
  - [ ] Express middleware (requireAuth, optionalAuth)
  - [ ] TypeScript types (AuthenticatedRequest, JWTPayload)
- [ ] Add environment variables to `.env`
  - [ ] `JWT_SECRET` (generate with `openssl rand -base64 32`)
  - [ ] `JWT_EXPIRES_IN=1h`
  - [ ] `JWT_REFRESH_EXPIRES_IN=7d`
- [ ] Create users table migration
- [ ] Update ENV.md documentation

### Short-term (Week 2-3)

- [ ] Implement auth endpoints in Console app
  - [ ] POST /api/auth/signup
  - [ ] POST /api/auth/login
  - [ ] POST /api/auth/refresh
  - [ ] POST /api/auth/logout
  - [ ] GET /api/auth/me
- [ ] Add rate limiting to auth endpoints
- [ ] Test auth flow end-to-end

### Medium-term (Week 3-4)

- [ ] Apply `requireAuth` middleware to all 7 apps
- [ ] Update all TODO comments with actual auth context
  - [ ] `apps/questboard/src/server.ts:1424`
  - [ ] `apps/questboard/src/server.ts:1619`
  - [ ] `apps/questboard/src/server.ts:2212`
  - [ ] `apps/questboard/src/server.ts:2310`
  - [ ] Similar TODOs in other apps
- [ ] Update frontend to use auth tokens
- [ ] Test multi-tenant isolation (create 2 orgs, verify data separation)

### Long-term (Month 2+)

- [ ] Implement invitation flow
  - [ ] POST /api/auth/invite
  - [ ] POST /api/auth/accept-invite
  - [ ] Email integration
- [ ] Add OAuth providers (Google, GitHub, Microsoft)
- [ ] Implement service account tokens for Worker
- [ ] Add session management UI (view/revoke tokens)
- [ ] Audit logging for auth events
- [ ] Two-factor authentication (2FA)

---

## Key Decisions Required

### 1. Where to host auth endpoints?

**Option A:** Console app (port 4000)
- ✅ Simple, all admin features in one place
- ✅ Fewer moving parts
- ❌ Console must be running for auth

**Option B:** Dedicated auth service
- ✅ Independent, can run without other apps
- ✅ Better separation of concerns
- ❌ More infrastructure complexity

**Recommendation:** Start with Option A, migrate to B if needed.

### 2. Token storage strategy?

**Option A:** httpOnly cookies
- ✅ More secure (no XSS access)
- ✅ Auto-sent with requests
- ❌ CSRF considerations
- ❌ Requires same domain for all apps

**Option B:** localStorage + Authorization header
- ✅ Works cross-domain
- ✅ Simpler CORS setup
- ❌ Vulnerable to XSS
- ✅ Current industry standard for SPAs

**Recommendation:** Option B for flexibility (your apps are on different ports).

### 3. Multi-org handling?

**Option A:** User selects org at login
- ✅ Clear org context
- ✅ Simpler UI
- ❌ Must re-login to switch orgs

**Option B:** Org switcher in UI
- ✅ Easy org switching
- ✅ Better UX for multi-org users
- ❌ More complex token refresh logic

**Recommendation:** Start with A, add B later.

### 4. Development mode?

Keep RLS bypass for development?

```sql
IF get_user_org_id() IS NULL THEN
  RETURN true; -- Allow if no auth (dev mode)
END IF;
```

**Recommendation:**
- Keep for local development (STORAGE_MODE=local)
- Remove for Supabase mode (STORAGE_MODE=supabase)
- Add `REQUIRE_AUTH=true/false` env var

---

## Example: Full Auth Flow

### 1. Signup

```bash
curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@signalblueprint.com",
    "password": "SecurePass123!",
    "orgName": "Signal Blueprint"
  }'

# Response:
{
  "user": {
    "id": "uuid-1",
    "email": "founder@signalblueprint.com"
  },
  "org": {
    "id": "uuid-2",
    "name": "Signal Blueprint"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "..."
}
```

### 2. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "founder@signalblueprint.com",
    "password": "SecurePass123!"
  }'

# Response:
{
  "user": { "id": "uuid-1", "email": "..." },
  "org": { "id": "uuid-2", "name": "Signal Blueprint" },
  "token": "eyJhbG...",
  "refreshToken": "..."
}
```

### 3. Authenticated Request

```bash
curl http://localhost:4020/api/goals \
  -H "Authorization: Bearer eyJhbG..."

# Server extracts from JWT:
# - orgId: "uuid-2"
# - userId: "uuid-1"
# - role: "owner"

# Supabase RLS filters results by org_id automatically
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{ "refreshToken": "..." }'

# Response:
{
  "token": "eyJhbG...", # New access token
  "refreshToken": "..." # New refresh token (optional rotation)
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/auth/__tests__/jwt.test.ts
describe("JWT utilities", () => {
  test("generateToken creates valid JWT", () => {
    const token = generateToken({ sub: "user-1", email: "test@example.com", org_id: "org-1", role: "owner" });
    const payload = verifyToken(token);
    expect(payload?.sub).toBe("user-1");
  });

  test("verifyToken rejects expired token", () => {
    // Test expiration
  });
});
```

### Integration Tests

```typescript
// packages/auth/__tests__/auth-flow.test.ts
describe("Authentication flow", () => {
  test("signup creates user, org, and member", async () => {
    const response = await request(app)
      .post("/api/auth/signup")
      .send({ email: "test@example.com", password: "Test123!", orgName: "Test Org" });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();

    // Verify database records
    const user = await storage.get("users", response.body.user.id);
    expect(user).toBeDefined();
  });

  test("login with wrong password fails", async () => {
    // Test auth failure
  });

  test("requireAuth middleware blocks unauthenticated requests", async () => {
    const response = await request(app).get("/api/goals");
    expect(response.status).toBe(401);
  });
});
```

### E2E Tests

```typescript
// Test multi-tenant isolation
test("users cannot access other orgs' data", async () => {
  // Create 2 orgs, 2 users
  // User1 creates goal in Org1
  // User2 tries to access it
  // Should fail
});
```

---

## Future Enhancements

### OAuth Integration

```typescript
// packages/auth/src/oauth/google.ts
export async function authenticateWithGoogle(code: string): Promise<User>

// Add to login page:
<button onClick={loginWithGoogle}>Sign in with Google</button>
```

### API Keys (for programmatic access)

```typescript
POST /api/auth/api-keys
{
  "name": "CI/CD Pipeline",
  "permissions": ["read"],
  "expiresIn": "90d"
}

Response: { "apiKey": "sbk_live_..." }
```

### Audit Logging

```typescript
// Log all auth events
await logEvent({
  event: "user.login",
  userId: user.id,
  orgId: org.id,
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});
```

### Session Management UI

Show users their active sessions, allow revocation.

---

## Summary

**Your foundation is excellent.** The RLS policies, RBAC system, and data model are already in place. You need to:

1. ✅ Create `@sb/auth` package (JWT + middleware)
2. ✅ Add users table to database
3. ✅ Implement signup/login endpoints
4. ✅ Apply auth middleware to all 7 apps
5. ✅ Update frontend to use tokens

This provides:
- **Secure multi-tenant isolation** via RLS
- **Flexible RBAC** for your team and clients
- **Scalable architecture** for future clients
- **Service account support** for background jobs

**Estimated effort:** 2-3 weeks for core implementation, 1-2 weeks for polish and testing.

**Next steps:** Review this strategy, make key decisions (auth service location, token storage), then start with Phase 1.
