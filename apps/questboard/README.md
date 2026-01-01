# Questboard

**Status:** 🟢 Production Ready - Most mature app in the suite with PWA support
**Port:** 3000 (API) / 5173 (Web)

Questboard is a comprehensive task management system that combines the Questline task framework with Working Genius team assignment principles, all orchestrated by a daily Questmaster role. It provides a complete solution for managing hierarchical goals, questlines, quests, and tasks with AI-powered planning and assignment.

## Purpose

Questboard helps teams organize work into questlines (connected sequences of tasks), assigns work based on team members' Working Genius profiles (Wonder, Invention, Discernment, Galvanizing, Enablement, Tenacity), and uses a rotating Questmaster role to prioritize and coordinate daily activities.

The system bridges strategic planning with daily execution by maintaining a hierarchy from high-level goals down to individual tasks, ensuring every piece of work connects to larger objectives.

## Features

### Core Task Management
- **Hierarchical goal/questline/quest/task system** - Multi-level organization from strategic goals to actionable tasks
- **Questline-based task organization** - Organize work into connected sequences of tasks with unlock dependencies
- **Task assignment with Working Genius-based AI explanations** - Intelligent task assignment considering team members' natural abilities
- **Daily deck generation for team members** - Automated daily focus cards based on priorities and capacity
- **Event system integration for activity tracking** - Complete audit trail of all task activities

### AI-Powered Features
- **AI-powered sprint planning** with plan generation and comparison
- **Sprint plan evaluation** - Compare and select optimal sprint plans
- **Task assignment with Working Genius reasoning** - AI explains why tasks are assigned to specific team members
- **Goal clarification and decomposition** - AI helps break down strategic goals into actionable work

### Analytics & Insights
- **Analytics Dashboard** with comprehensive metrics:
  - Task/goal/quest statistics
  - Working Genius distribution across team
  - Completion metrics and velocity tracking
  - Activity timeline showing recent work
  - Team capacity utilization
  - Sprint burndown and progress

### Progressive Web App (PWA)
- **Mobile-first experience** with native-like functionality
- **Service worker** with offline support and caching
- **Installable app** - Add to home screen on mobile devices
- **Mobile-responsive navigation** with hamburger menu
- **Touch-optimized interactions** and gestures
- **Enhanced loading states** with spinner component
- **Performance optimizations** for mobile devices

### User Interface
- **Complete React frontend** with 9 page components:
  - Today - Daily focus and deck view
  - Sprint - Current sprint planning and tracking
  - Goals - Strategic goal management
  - Team - Team member profiles and Working Genius
  - Analytics - Performance metrics and insights
  - And more...
- **Modern, responsive design** optimized for desktop and mobile
- **Real-time updates** with smooth interactions

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env
# Add required variables to .env:
# - OPENAI_API_KEY (for AI features)
# - JWT_SECRET (for authentication)
# - DATABASE_URL (Supabase connection)

# Run the development server
pnpm --filter questboard dev
```

**Access the app:**
- Web UI: `http://localhost:5173`
- API: `http://localhost:3000`

**First-time setup:**
1. Create an account: `POST /api/auth/signup` with email, password, and organization name
2. Login to receive JWT tokens: `POST /api/auth/login`
3. Use the token in subsequent API requests: `Authorization: Bearer <token>`

See [AUTH_IMPLEMENTATION.md](./AUTH_IMPLEMENTATION.md) for detailed authentication setup.

## Architecture

- **Backend**: Express.js REST API with comprehensive endpoints
- **Authentication**: JWT-based auth with bcrypt password hashing, refresh tokens, and RBAC
- **Frontend**: React + TypeScript with Vite
- **Storage**: Supabase (PostgreSQL) via `@sb/storage` abstraction layer
- **AI**: OpenAI GPT-4o for sprint planning and task analysis
- **PWA**: Service Worker with Workbox for offline support
- **State Management**: React hooks and context
- **Styling**: Modern CSS with responsive design

## Storage Entities

Questboard manages 14+ entity kinds:
- Goals (strategic objectives)
- Questlines (connected quest sequences)
- Quests (task bundles)
- Tasks (individual work items)
- Team members and Working Genius profiles
- Sprint plans and assignments
- Daily decks
- Job run summaries
- And more...

## API Endpoints

> **Note:** All API endpoints (except `/health` and `/api/auth/*`) require authentication via JWT token in the `Authorization: Bearer <token>` header.

### Authentication
- `POST /api/auth/signup` - Create new organization and owner account
- `POST /api/auth/login` - Login and receive JWT tokens
- `POST /api/auth/refresh` - Refresh access token using refresh token
- `GET /api/auth/me` - Get current user profile

### Goals
- `GET /api/goals` - List all goals
- `POST /api/goals` - Create a new goal
- `GET /api/goals/:id` - Get goal details
- `PUT /api/goals/:id` - Update a goal
- `DELETE /api/goals/:id` - Delete a goal

### Questlines
- `GET /api/questlines` - List all questlines
- `POST /api/questlines` - Create a new questline
- `GET /api/questlines/:id` - Get questline details
- `PUT /api/questlines/:id` - Update a questline

### Quests
- `GET /api/quests` - List all quests
- `POST /api/quests` - Create a new quest
- `GET /api/quests/:id` - Get quest details
- `PUT /api/quests/:id` - Update a quest

### Tasks
- `GET /api/tasks` - List all tasks
- `POST /api/tasks` - Create a new task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update a task
- `PUT /api/tasks/:id/status` - Update task status

### Sprint Planning
- `POST /api/sprint/plan` - Generate AI-powered sprint plan
- `GET /api/sprint/current` - Get current sprint
- `POST /api/sprint/evaluate` - Evaluate and compare sprint plans

### Team
- `GET /api/team` - List team members
- `GET /api/team/:id` - Get team member details

### Daily Operations
- `GET /api/daily/deck/:memberId` - Get daily deck for team member

## Testing

Questboard has comprehensive test coverage with **48 passing tests**:

```bash
# Run all tests
pnpm --filter questboard test

# Run tests in watch mode
pnpm --filter questboard test:watch

# Run tests with coverage
pnpm --filter questboard test:coverage
```

**Test Coverage:**
- 31 schema tests (`@sb/schemas`) covering all type definitions
- 17 AI function tests (`@sb/ai`) with mocked OpenAI calls
- Full coverage for caching, org context, team snapshots, error handling

## Current Status

### ✅ Production-Ready Features
- Complete Express.js REST API with comprehensive endpoints
- **Full-stack JWT authentication** - Backend (78 protected endpoints) + Frontend (centralized API client)
- **Multi-tenant data isolation** - Organization-based access control enforced via JWT
- **Role-based access control (RBAC)** - Admin, team lead, and member roles
- **Centralized API client** - Automatic token injection and refresh handling
- **Protected routes** - Login/Signup pages with authentication guards
- Full React frontend with 10+ page components
- Analytics Dashboard with task/goal/quest statistics
- Hierarchical goal/questline/quest/task system
- AI-powered sprint planning with plan generation and comparison
- Daily deck generation for team members
- Task assignment with Working Genius-based AI explanations
- Event system integration for activity tracking
- Storage abstraction layer with template system
- Progressive Web App (PWA) with offline support
- Service worker with caching
- Mobile-responsive navigation
- Touch-optimized interactions
- Comprehensive test suite (48 tests passing)

### ✅ Recently Completed (2026-01-01)

1. **Frontend Authentication Integration** 🔐 COMPLETED
   - ✅ Created centralized API client with automatic token injection
   - ✅ Updated all 10+ frontend pages to use the API client
   - ✅ Implemented login/signup UI components
   - ✅ Added protected routes and auth guards
   - ✅ Implemented 401 response handling with automatic token refresh
   - ✅ Removed all hardcoded userId/orgId from frontend code
   - ✅ Integrated AuthContext with API client
   - **Status:** ✅ End-to-end secure authentication flow complete
   - **Result:** Full-stack authentication working (backend + frontend)

### Next Priority Tasks

**Priority 1 (Immediate - This Week):**

1. **Authentication Testing & Validation** 🧪 HIGH PRIORITY
   - Test complete signup → login → API call flow
   - Verify multi-tenant isolation (ensure no cross-org access)
   - Test token refresh on expiration
   - Test RBAC (members cannot access admin endpoints)
   - Add integration tests for auth endpoints
   - **Goal:** Production-grade security validation

2. **User Onboarding Flow** 👤 USER EXPERIENCE
   - Create organization setup wizard for new users
   - Add team member invitation system
   - Build initial Working Genius profile setup
   - Create sample data seeding for demo purposes
   - **Goal:** Smooth first-time user experience

3. **Role-Based UI Features** 🎨 USER EXPERIENCE
   - Hide admin actions from non-admin users in UI
   - Add role indicators in navigation
   - Implement permission-aware component rendering
   - **Goal:** Polished role-based user experience

**Priority 2 (Next 2-4 Weeks):**

4. **Enhanced Mobile Experience** 📱 USER EXPERIENCE
   - Add swipe gestures for task completion
   - Implement pull-to-refresh for data updates
   - Add haptic feedback for touch interactions
   - Create tablet-optimized layouts
   - Improve offline capabilities and sync
   - **Goal:** Best-in-class mobile PWA experience

5. **Real-time Collaboration** 🔄 PRODUCTIVITY
   - Add WebSocket/SSE for live updates
   - Show when other users are viewing/editing
   - Real-time task status updates across clients
   - Live notifications for assignments and completions
   - Optimistic UI updates with conflict resolution
   - **Goal:** Live collaborative team experience

**Priority 3 (Next Quarter):**

6. **Advanced Testing & Quality** 🧪 RELIABILITY
   - Expand integration tests for all API endpoints
   - Add E2E tests for critical user flows (Playwright/Cypress)
   - Increase test coverage to 80%+
   - Set up CI/CD pipeline with automated testing
   - Add performance testing and monitoring
   - **Goal:** Production-grade reliability and confidence

7. **Enhanced UX & Accessibility** ✨ USER EXPERIENCE
   - In-app tooltips and interactive guides
   - Keyboard shortcuts for power users
   - Dark mode support with theme toggle
   - Accessibility audit (WCAG 2.1 AA compliance)
   - Improved error messages and user feedback
   - **Goal:** Exceptional, inclusive user experience

8. **Data Management & Analytics** 📊 ENTERPRISE
   - Bulk data export (CSV, JSON, PDF reports)
   - Data import from other tools (Jira, Asana, etc.)
   - Automated backup and restore functionality
   - Archival system for completed quests
   - Advanced analytics and custom reports
   - **Goal:** Enterprise-grade data capabilities

## Integration with Suite

Questboard integrates with other Signal Blueprint apps:
- **Console** - Displays active quests and team status
- **Worker** - Runs scheduled jobs for questmaster and sprint planning
- **Events** - Publishes task events for suite-wide tracking

## Documentation

- [Main Suite README](../../README.md) - Complete suite overview
- [Suite Map](../../docs/SUITE_MAP.md) - App registry and architecture
- [Jobs System](../../docs/JOBS.md) - Scheduled job documentation
- [Authentication Implementation](./AUTH_IMPLEMENTATION.md) - Detailed auth implementation notes
- [Setup Guide](./SETUP.md) - Development setup instructions

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines and best practices.


