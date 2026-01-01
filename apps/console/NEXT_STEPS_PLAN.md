# Console App - Next Steps Implementation Plan

**Branch:** `claude/plan-console-app-next-3pgl5`
**Created:** 2026-01-01
**Status:** Planning Phase

## Executive Summary

The Console app is a fully functional admin hub with production-ready backend APIs. The main gaps are:
1. **Authentication UI** - Backend JWT auth is complete, but frontend lacks login/signup screens
2. **Team Data Persistence** - Team data is currently mock/in-memory, needs migration to `@sb/storage`

## Current State

### ✅ What's Working
- Express.js REST API with 30+ endpoints
- JWT authentication backend (signup, login, refresh, logout)
- Worker job monitoring dashboard
- System health monitoring
- Event timeline and telemetry tracking
- Active quests integration
- Responsive SPA frontend with 8 views

### ⚠️ Gaps
- No login/signup UI in frontend
- No authentication state management in client
- Team data not persisted to database
- No protected routes or auth guards

---

## Priority 1: Authentication Frontend Integration 🔥

**Goal:** Secure the Console app with a complete authentication flow
**Impact:** HIGH - Foundation for suite-wide authentication
**Estimated Complexity:** Medium (3-5 days)

### Task Breakdown

#### 1.1 Create Login/Signup UI Components
**Files to Create:**
- `/apps/console/public/auth.js` - Authentication state management
- `/apps/console/public/login.html` - Login/signup page (or integrate into index.html)

**Requirements:**
- Login form (email, password)
- Signup form (name, email, password, org name)
- Form validation with error messages
- Loading states during API calls
- Switch between login/signup modes
- "Forgot password" placeholder (future)

**Design:**
- Match existing Console gradient theme
- Responsive layout
- Clean, minimal forms
- Error/success toast notifications

#### 1.2 Implement Client-Side Auth State Management
**Location:** `/apps/console/public/auth.js`

**Features:**
- JWT token storage in localStorage
- Automatic token refresh logic
- Auth state: `{ user, accessToken, refreshToken, isAuthenticated }`
- Login/logout functions
- Auto-refresh before token expiry
- Handle 401 responses (redirect to login)

**API Integration:**
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Get tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Clear tokens
- `GET /api/auth/me` - Get current user

#### 1.3 Add Protected Routes & Auth Guards
**File to Update:** `/apps/console/public/app.js`

**Changes:**
- Check auth state before rendering views
- Redirect to login if not authenticated
- Add auth token to all API requests (Authorization header)
- Handle token expiration gracefully
- Show loading state during auth check

**Implementation:**
```javascript
// Pseudocode
async function showView(view) {
  if (!isAuthenticated()) {
    showLogin();
    return;
  }
  // existing view rendering logic
}

function fetchWithAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${getAccessToken()}`
    }
  });
}
```

#### 1.4 Build User Profile UI
**File to Update:** `/apps/console/public/index.html`

**Features:**
- User dropdown in top-right corner
- Display user name and email
- Organization switcher (if multi-org)
- Logout button
- Profile settings link (future)

**Visual Design:**
- Small avatar/initials icon
- Dropdown menu on click
- Consistent with nav styling

#### 1.5 Handle Multi-Org Support
**Requirements:**
- Display user's organizations
- Allow switching between orgs
- Store current org in state
- Filter data by selected org
- Persist org selection in localStorage

#### 1.6 Error Handling & Edge Cases
**Scenarios to Handle:**
- Network errors during login
- Invalid credentials
- Expired tokens (auto-refresh)
- Token refresh failure (redirect to login)
- Duplicate email on signup
- Password validation errors
- Session timeout

---

## Priority 2: Team Data Persistence

**Goal:** Make team management production-ready with database storage
**Impact:** MEDIUM - Required for real team collaboration
**Estimated Complexity:** Medium (3-4 days)

### Task Breakdown

#### 2.1 Database Schema Design
**Package:** `@sb/storage`

**Tables/Collections:**
- `team_members` - Core member data
  - `id` (UUID)
  - `org_id` (FK to organizations)
  - `user_id` (FK to users, nullable)
  - `name`
  - `email`
  - `role` (owner, admin, member)
  - `avatar_url` (optional)
  - `created_at`
  - `updated_at`

- `working_genius_profiles` - Working Genius data
  - `id` (UUID)
  - `team_member_id` (FK to team_members)
  - `top_geniuses` (array: ["Wonder", "Invention"])
  - `competencies` (array: ["Discernment", "Galvanizing"])
  - `frustrations` (array: ["Enablement", "Tenacity"])
  - `workload_current` (integer, hours)
  - `workload_capacity` (integer, hours)

- `member_preferences` - User settings
  - `user_id` (FK)
  - `theme` (light/dark)
  - `notifications_enabled` (boolean)
  - `preferences_json` (JSONB)

#### 2.2 Storage Layer Implementation
**Package:** `@sb/storage`

**New Functions to Add:**
```typescript
// Team members
export async function getTeamMembers(orgId: string): Promise<TeamMember[]>
export async function getTeamMember(id: string): Promise<TeamMember | null>
export async function createTeamMember(data: CreateTeamMemberInput): Promise<TeamMember>
export async function updateTeamMember(id: string, data: UpdateTeamMemberInput): Promise<TeamMember>
export async function deleteTeamMember(id: string): Promise<void>

// Working Genius
export async function getWorkingGeniusProfile(memberId: string): Promise<WorkingGeniusProfile | null>
export async function updateWorkingGeniusProfile(memberId: string, data: WorkingGeniusInput): Promise<WorkingGeniusProfile>
```

#### 2.3 Update Console API Endpoints
**File:** `/apps/console/src/server.ts`

**Updates Required:**
- Replace mock team data with database calls
- Add authentication middleware to team routes
- Implement CRUD operations:
  - `GET /api/team` - List team members (filtered by org)
  - `POST /api/team` - Add new member
  - `PUT /api/team/:id` - Update member
  - `DELETE /api/team/:id` - Remove member
  - `GET /api/team/:id/working-genius` - Get WG profile
  - `PUT /api/team/:id/working-genius` - Update WG profile

**Authorization:**
- Members can view team
- Admins can add/update members
- Owners can delete members

#### 2.4 Update Frontend for Team CRUD
**File:** `/apps/console/public/app.js`

**New Features:**
- "Add Team Member" button
- Edit member modal/form
- Delete confirmation dialog
- Working Genius editor
- Form validation
- Optimistic UI updates

#### 2.5 Team Member Invitation System
**Scope:** Future enhancement (Priority 3)

**Components:**
- Generate invite tokens
- Email invitation flow
- Invite acceptance page
- Link existing users to team

---

## Priority 3: Real-Time Updates (Future)

**Goal:** Add WebSocket/SSE for live dashboard updates
**Estimated Complexity:** Medium-High (5-7 days)

### Task Breakdown

#### 3.1 WebSocket Server Setup
- Add Socket.IO to Console server
- Create WebSocket event handlers
- Authenticate WebSocket connections

#### 3.2 Real-Time Event Streaming
- Stream new events to connected clients
- Update health status in real-time
- Push job execution updates
- Live telemetry updates

#### 3.3 Client-Side WebSocket Integration
- Connect to WebSocket on app load
- Handle reconnection logic
- Update UI on incoming events
- Show connection status indicator

---

## Priority 4: Unified Analytics Dashboard (Future)

**Goal:** Aggregate metrics from all suite apps
**Estimated Complexity:** High (7-10 days)

### Features
- Cross-app analytics views
- Suite-wide KPI tracking
- AI cost and usage trends
- Executive summary dashboard
- Exportable reports

---

## Priority 5: Notification System (Future)

**Goal:** Build notification center with alerts
**Estimated Complexity:** Medium (4-6 days)

### Features
- Notification center UI
- Email notifications
- Slack/Discord webhooks
- Alert rules configuration
- Push notifications

---

## Implementation Sequence

### Phase 1: Authentication (Week 1-2)
1. Create auth state management (1 day)
2. Build login/signup UI (1 day)
3. Add protected routes (1 day)
4. Implement user profile dropdown (0.5 day)
5. Add multi-org support (0.5 day)
6. Testing & edge cases (1 day)

### Phase 2: Team Persistence (Week 3-4)
1. Design database schema (0.5 day)
2. Implement storage functions (1 day)
3. Update Console API endpoints (1 day)
4. Add team CRUD UI (1.5 days)
5. Testing & migration (0.5 day)

### Phase 3: Polish & Documentation (Week 5)
1. Update README with new features
2. Add API documentation
3. Write user guide
4. Create demo video/screenshots

---

## Technical Considerations

### Authentication
- **Token Storage:** localStorage (consider httpOnly cookies for production)
- **Token Refresh:** Auto-refresh 5 minutes before expiry
- **Session Timeout:** 7 days (refresh token TTL)
- **Security:** HTTPS required, CORS configured, CSP headers

### Database
- **ORM:** Use existing `@sb/storage` patterns
- **Migrations:** Create migration scripts for new tables
- **Seeding:** Migrate existing mock data to database
- **Indexes:** Add indexes on `org_id`, `user_id`, `email`

### Performance
- **Caching:** Cache team data with invalidation on updates
- **Pagination:** Add pagination for large teams (50+ members)
- **Lazy Loading:** Load Working Genius profiles on demand

### Testing
- **Unit Tests:** Auth state management logic
- **Integration Tests:** API endpoints with auth
- **E2E Tests:** Login flow, team CRUD operations
- **Manual Testing:** Multi-org scenarios, token refresh

---

## Success Metrics

### Phase 1 (Authentication)
- [ ] Users can sign up and create accounts
- [ ] Users can log in and see personalized dashboard
- [ ] Access tokens refresh automatically
- [ ] Logout clears all client state
- [ ] Unauthorized requests redirect to login
- [ ] Multi-org users can switch organizations

### Phase 2 (Team Persistence)
- [ ] Team data persists across server restarts
- [ ] Admins can add/edit/remove team members
- [ ] Working Genius profiles stored in database
- [ ] Team view shows real-time data
- [ ] All CRUD operations work correctly

---

## Risks & Mitigations

### Risk: Breaking Existing Functionality
**Mitigation:**
- Create feature branch for development
- Test all existing features after auth integration
- Keep mock data as fallback during transition

### Risk: Token Security Issues
**Mitigation:**
- Store tokens securely (consider httpOnly cookies)
- Implement proper CORS policies
- Add rate limiting to auth endpoints
- Log all auth events for audit

### Risk: Database Migration Complexity
**Mitigation:**
- Create migration scripts with rollback
- Test migration on development environment
- Backup data before migration
- Maintain backward compatibility during transition

---

## Dependencies

### External Packages
- `@sb/auth` - Already implemented ✅
- `@sb/storage` - Needs team member functions ⚠️
- `jsonwebtoken` - Already installed ✅

### Internal Services
- Database (PostgreSQL/MySQL) - Verify configuration
- Redis (optional) - For token blacklisting

---

## Questions to Resolve

1. **UI Framework:** Keep vanilla JS or migrate to React/Vue?
   - **Recommendation:** Keep vanilla for now, migrate later if needed

2. **Token Storage:** localStorage or httpOnly cookies?
   - **Recommendation:** Start with localStorage, add cookie option later

3. **Database Choice:** PostgreSQL, MySQL, or MongoDB?
   - **Recommendation:** Use existing `@sb/storage` default (likely PostgreSQL)

4. **Password Reset:** Include in Phase 1 or defer?
   - **Recommendation:** Defer to Phase 3, add placeholder in UI

5. **Team Invitations:** Email-based or link-based?
   - **Recommendation:** Start with link-based, add email in Phase 3

---

## Next Actions

### Immediate (This Week)
1. ✅ Complete this planning document
2. Review plan with team/stakeholders
3. Set up development branch
4. Create task board with detailed tickets

### Week 1
1. Start authentication frontend integration
2. Build login/signup UI
3. Implement auth state management

### Week 2
1. Complete protected routes
2. Add user profile dropdown
3. Test authentication flow end-to-end

---

## Related Documentation

- [Console README](/apps/console/README.md)
- [Authentication Strategy](/docs/AUTHENTICATION_STRATEGY.md)
- [Suite Map](/docs/SUITE_MAP.md)
- [Storage Package Docs](../packages/storage/README.md)

---

## Notes

- This plan focuses on **Priority 1 & 2** from the Console README
- Estimated timeline: **4-5 weeks** for both phases
- Authentication is the critical path for other suite apps
- Team persistence enables real collaboration features

---

**Last Updated:** 2026-01-01
**Plan Owner:** Development Team
**Review Date:** Weekly during implementation
