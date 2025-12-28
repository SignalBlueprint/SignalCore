# Console

Unified admin console for the Signal Blueprint suite - your team's home base for collaboration, monitoring, and management.

## Purpose

Console serves as the command center and team hub for the entire suite, providing a comprehensive dashboard with:
- Real-time system health monitoring
- Team member profiles with Working Genius assignments
- Activity timeline and event tracking
- AI telemetry and cost monitoring
- Quick actions for common operations

## Features

### Dashboard (Home)
The main landing page with at-a-glance information:
- **Key metrics** - Team size, apps online, recent activity, AI usage
- **Quick actions** - Fast navigation to common views
- **Recent activity** - Latest 5 events across all apps
- **Team overview** - Team members with current workload indicators

### Team
Complete team member directory featuring:
- **Member profiles** - Name, email, role, and avatar
- **Working Genius profiles** - Each member's top 2 geniuses, competencies, and frustrations
- **Workload tracking** - Current workload vs daily capacity with visual indicators
- **Overload warnings** - Highlights when team members exceed capacity

### System Health
Real-time health monitoring for all suite apps:
- **Status indicators** - Online/offline status for each app
- **Port information** - Quick reference for local development
- **Direct links** - Click to open running apps
- **Last checked** - Timestamp of last health check

### Apps
Complete suite registry with:
- **App catalog** - All apps with status badges (skeleton, wip, beta, prod)
- **App metadata** - ID, purpose, and ownership information

### Activity
Event timeline across all suite apps:
- **Latest 200 events** - Reverse chronological feed
- **Event details** - Type, source app, timestamp, and payload
- **Searchable** - Full event data in formatted JSON

### Telemetry
AI usage and cost monitoring:
- **Call statistics** - Total, cached, and fresh AI calls
- **Cache hit rate** - Percentage of calls served from cache
- **Token usage** - Total tokens consumed
- **Cost tracking** - Cumulative AI costs across operations

## Running

```bash
pnpm --filter console dev
```

Then open http://localhost:4000 in your browser.

## API Endpoints

The console exposes several API endpoints for data access:

- `GET /api/apps` - Suite registry
- `GET /api/team` - Team members with Working Genius profiles
- `GET /api/health` - Health checks for all apps
- `GET /api/events` - Event log (last 200 events)
- `GET /api/telemetry` - AI usage statistics
- `GET /api/dashboard/stats` - Quick stats for dashboard
- `GET /health` - Console health check

## Team Data

Currently uses mock team data for demonstration. In production, this would connect to:
- Database for persistent team member storage
- Real-time workload calculation from task assignments
- Integration with actual Working Genius assessments

