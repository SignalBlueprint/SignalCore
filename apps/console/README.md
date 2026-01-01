# Console

**Status:** 🟢 Fully Functional - Admin hub with UI
**Port:** 4000

Unified admin console for the Signal Blueprint suite - your team's home base for collaboration, monitoring, and management across all apps.

## Purpose

Console serves as the command center and team hub for the entire suite, providing a comprehensive dashboard with real-time system health monitoring, team member profiles with Working Genius assignments, activity timeline and event tracking, AI telemetry and cost monitoring, and quick actions for common operations.

## Features

### Dashboard (Home)
The main landing page with at-a-glance information:
- **Key metrics** - Team size, apps online, recent activity, AI usage
- **Quick actions** - Fast navigation to common views (Team, Apps, Health, Activity, Telemetry)
- **Recent activity** - Latest 5 events across all apps with timestamps
- **Team overview** - Team members with current workload indicators and capacity status

### Team Management
Complete team member directory featuring:
- **Member profiles** - Name, email, role, and avatar
- **Working Genius profiles** - Each member's top 2 geniuses, competencies, and frustrations
- **Workload tracking** - Current workload vs daily capacity with visual indicators
- **Overload warnings** - Highlights when team members exceed capacity (red indicators)
- **Capacity visualization** - Color-coded workload bars (green/yellow/red)

### System Health
Real-time health monitoring for all suite apps:
- **Status indicators** - Online/offline status for each app with visual badges
- **Port information** - Quick reference for local development
- **Direct links** - Click to open running apps in new tab
- **Last checked** - Timestamp of last health check
- **Suite-wide status** - At-a-glance view of entire system health

### Apps Registry
Complete suite registry with detailed app information:
- **App catalog** - All apps with status badges (skeleton, wip, beta, prod)
- **App metadata** - ID, purpose, ownership, and current status
- **Quick navigation** - Links to each app's running instance
- **Status tracking** - Production readiness indicators

### Activity Timeline
Event timeline across all suite apps:
- **Latest 200 events** - Reverse chronological feed of all system events
- **Event details** - Type, source app, timestamp, and full payload
- **Searchable** - Full event data in formatted JSON for debugging
- **Real-time updates** - New events appear automatically
- **Event filtering** - View events by app or type

### Telemetry Dashboard
AI usage and cost monitoring across the entire suite:
- **Call statistics** - Total, cached, and fresh AI calls
- **Cache hit rate** - Percentage of calls served from cache (optimization metric)
- **Token usage** - Total tokens consumed across all AI operations
- **Cost tracking** - Cumulative AI costs across all operations
- **Performance insights** - Identify caching opportunities and cost optimization

### Active Quests Integration
Direct integration with Questboard:
- **Active quests display** - View currently active quests from Questboard
- **Quest status** - See quest progress and assignments
- **Quick navigation** - Jump to Questboard for detailed quest management

### Worker Job Monitoring ✨ NEW
Real-time monitoring and analytics for background jobs:
- **Job registry** - View all registered worker jobs with status indicators
- **Execution statistics** - Success rate, average duration, and run counts for each job
- **Recent executions** - Timeline of job executions with status and duration
- **24-hour metrics** - Overview of job performance in the last 24 hours
- **Failure tracking** - Detailed error messages for failed job executions
- **Visual indicators** - Color-coded status badges and progress metrics

### Authentication System ✨ NEW
Complete JWT-based authentication for the entire suite:
- **User signup** - Create new user accounts with email/password
- **User login** - Authenticate and receive JWT access tokens
- **Token refresh** - Automatic token rotation for security
- **Multi-org support** - Users can belong to multiple organizations
- **Role-based access** - Owner, admin, and member roles
- **Password validation** - Complexity requirements and secure hashing
- **Service accounts** - Token support for background jobs

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables (if needed)
cp ../../.env.example ../../.env

# Run the development server
pnpm --filter console dev
```

Then open `http://localhost:4000` in your browser.

## Architecture

- **Backend**: Express.js REST API with frontend SPA
- **Frontend**: Static HTML/CSS/JavaScript (no build step)
- **Storage**: Currently uses in-memory mock data for team (pending migration to `@sb/storage`)
- **Integration**: Connects to all suite apps via health check endpoints
- **Events**: Aggregates events from `@sb/events` across all apps
- **Telemetry**: Monitors AI usage via `@sb/telemetry`

## API Endpoints

The console exposes several API endpoints for data access:

### Core APIs
- `GET /health` - Console health check
- `GET /api/dashboard/stats` - Quick stats for dashboard (team size, apps online, recent events, AI calls)

### Authentication ✨ NEW
- `POST /api/auth/signup` - Create new user account
- `POST /api/auth/login` - Authenticate and get JWT tokens
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - Logout (client-side token discard)
- `GET /api/auth/me` - Get current authenticated user info

### App Management
- `GET /api/apps` - Suite registry with all apps and metadata
- `GET /api/health` - Health checks for all suite apps

### Team Management
- `GET /api/team` - Team members with Working Genius profiles
- *(Future)* `POST /api/team` - Add new team member
- *(Future)* `PUT /api/team/:id` - Update team member
- *(Future)* `DELETE /api/team/:id` - Remove team member

### Activity & Events
- `GET /api/events` - Event log (last 200 events across all apps)
- `GET /api/events?sourceApp=<app>` - Filter events by source app

### Telemetry
- `GET /api/telemetry` - AI usage statistics (calls, cache hits, tokens, costs)

### Questboard Integration
- `GET /api/questboard/active` - Get active quests from Questboard

### Worker Job Monitoring ✨ NEW
- `GET /api/worker/overview` - Complete overview with job stats and recent executions
- `GET /api/worker/jobs` - List all registered worker jobs
- `GET /api/worker/executions` - Get recent job executions (with filters)
- `GET /api/worker/executions/:jobId` - Get execution history for specific job
- `GET /api/worker/stats/:jobId` - Get statistics for specific job

## Current Status

### ✅ Production-Ready Features
- Complete Express.js API with frontend SPA
- **JWT-based authentication system** (signup, login, refresh, logout)
- **Multi-org support** with role-based access control
- **Worker job monitoring dashboard** - Real-time job execution tracking and analytics
- Real-time health checks for all suite apps
- Event log aggregation (last 200 events)
- AI telemetry tracking (calls, costs, cache hits)
- Team member profiles with Working Genius (mock in-memory data)
- Dashboard statistics and metrics
- Active quests integration with Questboard
- Responsive web interface with navigation

### ⚠️ Known Limitations
- Team data is mock/in-memory (not persistent) - migration to @sb/storage needed
- Authentication available in backend but not integrated into frontend UI yet
- No real-time WebSocket/SSE updates (manual refresh needed)
- No admin user management interface in UI
- No centralized error tracking or performance monitoring

### Next Steps

**Priority 1 (Next 2-4 Weeks):**

1. **Authentication Frontend Integration** 🔥 HIGH PRIORITY
   - Add login/signup UI to Console frontend
   - Implement JWT token storage and refresh logic
   - Add authentication state management (React Context or Zustand)
   - Build protected route components with auth guards
   - Create user profile dropdown with logout button
   - Add org switcher for multi-org users
   - **Goal:** Secure Console app and provide foundation for suite-wide auth

2. **Team Data Persistence**
   - Migrate team data from in-memory mock to `@sb/storage`
   - Persist Working Genius profiles to database
   - Implement team member CRUD operations via API
   - Store user preferences and settings
   - Add team member invitation system
   - **Goal:** Make team management production-ready

**Priority 2 (Next 1-2 Months):**

3. **Real-time Updates**
   - Add WebSocket/SSE for live updates
   - Real-time app status monitoring
   - Live event stream viewer
   - Push notifications for critical events

4. **Unified Analytics Dashboard**
   - Aggregate metrics from all suite apps
   - Build cross-app analytics views
   - Add suite-wide KPI tracking
   - Create executive summary dashboard
   - Track AI costs and usage trends

5. **Notification System**
   - Build notification center with alerts
   - Add email notifications for critical events
   - Implement Slack/Discord webhooks
   - Create alert rules (app down, errors, high costs)

**Priority 3 (Next Quarter):**

6. **Enhanced Team Management**
   - Build team member invitation system
   - Implement Working Genius assessment flow
   - Add team analytics and capacity insights
   - Create team calendar and availability tracking

7. **Suite Orchestration**
   - Monitor app deployment status
   - Environment configuration management
   - Suite-wide settings panel
   - Backup and restore functionality

## Integration with Suite

Console integrates with all Signal Blueprint apps:
- **Questboard** - Display active quests and team status
- **Catalog** - Monitor product catalog activity
- **LeadScout** - Track lead discovery metrics
- **Outreach** - View campaign activity
- **Worker** - Monitor scheduled job execution
- **All Apps** - Health monitoring and event aggregation

## Documentation

- [Main Suite README](../../README.md) - Complete suite overview
- [Suite Map](../../docs/SUITE_MAP.md) - App registry and architecture
- [Authentication Strategy](../../docs/AUTHENTICATION_STRATEGY.md) - JWT-based auth architecture

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines and best practices.

