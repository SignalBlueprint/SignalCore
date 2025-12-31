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

## Current Status

### ✅ Production-Ready Features
- Complete Express.js API with frontend SPA
- Real-time health checks for all suite apps
- Event log aggregation (last 200 events)
- AI telemetry tracking (calls, costs, cache hits)
- Team member profiles with Working Genius (mock in-memory data)
- Dashboard statistics and metrics
- Active quests integration with Questboard
- Responsive web interface with navigation

### ⚠️ Known Limitations
- Team data is mock/in-memory (not persistent)
- No authentication/authorization yet
- No real-time WebSocket updates (manual refresh needed)
- No admin user management interface

### Next Steps

1. **Data Persistence**
   - Migrate team data from mock to persistent storage (`@sb/storage`)
   - Add settings/configuration persistence
   - Implement user preferences storage
   - Add audit log storage for admin actions

2. **Authentication & Authorization**
   - Implement admin authentication system
   - Add role-based access control (super admin, admin, viewer)
   - Create API key management for apps
   - Add session management and security

3. **Real-time Monitoring**
   - Add WebSocket/SSE for live updates
   - Build real-time app status monitoring
   - Create live event stream viewer
   - Add real-time metrics dashboard (CPU, memory, requests)

4. **Notification System**
   - Build notification center with alerts
   - Add email notifications for critical events
   - Implement Slack/Discord webhook integrations
   - Create configurable alert rules (app down, high AI costs, errors)

5. **Team Management**
   - Build complete team member CRUD interface
   - Add team member invitation system
   - Implement Working Genius assessment flow
   - Add team analytics and insights
   - Create team calendar and availability

6. **Suite Orchestration**
   - Add ability to start/stop apps from Console
   - Build deployment management interface
   - Add environment variable management
   - Create suite-wide configuration panel
   - Implement backup and restore functionality

7. **Reporting & Analytics**
   - Build comprehensive analytics dashboard
   - Add cost tracking and forecasting
   - Create usage reports per app
   - Add data export (CSV, JSON, PDF reports)
   - Build custom report builder

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

