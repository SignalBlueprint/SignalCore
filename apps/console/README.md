# Console

## TL;DR
Admin hub for suite management with health monitoring, event aggregation, AI telemetry tracking, and worker job oversight. Dashboard works but team data stored in-memory.

## Product Goal
- Provide centralized command center for entire Signal Blueprint suite
- Monitor real-time health of all apps and services
- Track AI usage costs and performance across the suite
- Manage team members with Working Genius profiles
- Aggregate events and activity from all apps
- Monitor Worker job execution and performance

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Dashboard**: Key metrics (team size, apps online, recent activity, AI usage)
- **Health checks**: Real-time status for all suite apps with port info
- **Event timeline**: Last 200 events across all apps with filtering
- **AI telemetry**: Calls, cache hits, tokens, costs aggregation
- **Worker monitoring**: Job registry, execution history, statistics, 24hr metrics, failure tracking
- **Auth backend**: JWT signup/login/refresh endpoints working
- **Active quests**: Integration with Questboard to show current work

### 🟡 Partial (Works but Incomplete)
- **Team data in-memory**: Team member profiles stored in Map, lost on restart
- **Auth frontend missing**: Backend endpoints work but no login UI
- **Manual refresh**: No WebSocket/SSE for real-time updates

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **Team persistence**: Team CRUD doesn't persist to database
- **No auth UI**: Can't login/signup from Console frontend
- **No notifications**: No alerts when apps go down or jobs fail
- **No unified analytics**: Each app tracked separately, no cross-app views

## How to Run

### Install
```bash
# From monorepo root
pnpm install
```

### Dev
```bash
pnpm --filter console dev
```

### Test
```bash
# No tests yet
pnpm --filter console test
```

### Build
```bash
pnpm --filter console build
```

### Env Vars
Required in root `.env`:
- `JWT_SECRET` - For authentication endpoints
- `DATABASE_URL` - Supabase connection (needed for future team persistence)

### URLs/Ports
- **Console**: http://localhost:4000

## Architecture (Short)

### Stack
- **Backend**: Express.js REST API (TypeScript)
- **Frontend**: Static HTML/CSS/JavaScript (no build step)
- **Storage**: In-memory for team data (needs migration to @sb/storage)
- **Integration**: HTTP calls to all suite app health endpoints
- **Events**: Consumes from `@sb/events` package
- **Telemetry**: Reads from `@sb/telemetry` package

### Key Modules
- `src/server.ts` - Express server with routes
- `src/team-routes.ts` - Team member CRUD (in-memory Map)
- `src/worker-routes.ts` - Worker job monitoring endpoints
- `web/` - Static frontend files (dashboard.html, team.html, etc.)

### Data Flow
- **Health checks**: HTTP GET to each app's `/health` endpoint
- **Events**: Read from shared `@sb/events` in-memory store
- **Telemetry**: Read from shared `@sb/telemetry` global state
- **Team**: In-memory Map (no persistence)
- **Worker jobs**: Fetch from Worker via HTTP API

## Known Issues

### Team Data Lost on Restart
- **Repro**: Add team member → restart Console server → member gone
- **Root cause**: Team data stored in `Map<string, TeamMember>` in-memory
- **Workaround**: Re-add team members after restart
- **Fix needed**: Migrate to `@sb/storage` TeamRepository persisting to Supabase

### No Login UI
- **Repro**: Open Console → no way to login, API calls work unauthenticated
- **Root cause**: Auth backend complete but frontend integration missing
- **Workaround**: Use Questboard for auth, or curl API directly
- **Fix needed**: Add login/signup pages to Console frontend

### No Real-Time Updates
- **Repro**: App goes down → Console still shows "online" until manual refresh
- **Root cause**: No WebSocket/SSE for live data
- **Workaround**: Manually refresh page
- **Fix needed**: Add SSE or polling for auto-refresh

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| CON-1 | Team data persistence | P0 | TODO | `src/team-routes.ts`, `src/repository.ts` | **What**: Migrate team data from in-memory Map to @sb/storage<br>**Why**: Team members lost on server restart (critical blocker)<br>**Where**: Team routes + new TeamRepository<br>**AC**: Team CRUD persists to Supabase, restart preserves data, existing API unchanged | |
| CON-2 | Auth frontend integration | P1 | TODO | `web/login.html`, `web/signup.html`, `web/js/auth.js` | **What**: Add login/signup UI pages to Console frontend<br>**Why**: No way to authenticate from Console UI<br>**Where**: New HTML pages + auth JavaScript<br>**AC**: Login page works, signup creates account, JWT stored in localStorage, protected pages redirect to login | |
| CON-3 | Real-time updates (SSE) | P1 | TODO | `src/sse-server.ts`, `web/js/realtime.js` | **What**: Add Server-Sent Events for live dashboard updates<br>**Why**: Must manually refresh to see changes<br>**Where**: SSE endpoint + frontend listener<br>**AC**: Dashboard auto-updates when apps change status, events appear live, no polling needed | |
| CON-4 | Alerting system | P2 | TODO | `src/alerting.ts`, `web/notifications.html` | **What**: Alert when apps go down or Worker jobs fail<br>**Why**: Don't know when things break without checking<br>**Where**: Alert rules + notification service<br>**AC**: Slack/email when app down, job fails 3x, or AI costs spike, configurable thresholds | |
| CON-5 | Unified analytics dashboard | P2 | TODO | `src/analytics-routes.ts`, `web/analytics.html` | **What**: Aggregate metrics from all 7 apps into single view<br>**Why**: No suite-wide visibility into usage/costs<br>**Where**: New analytics page pulling from all apps<br>**AC**: Charts show requests/errors/AI costs per app, trend lines, filters by date range | |
| CON-6 | Test suite for Console | P1 | TODO | `__tests__/routes.test.ts`, `__tests__/team.test.ts` | **What**: Add comprehensive tests for all API routes<br>**Why**: No tests = high regression risk<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ coverage, test health checks, team CRUD, worker monitoring, auth endpoints | |
| CON-7 | User preferences storage | P3 | TODO | `src/preferences-routes.ts`, `web/js/preferences.js` | **What**: Persist user settings (theme, dashboard layout, alert prefs)<br>**Why**: Settings lost on browser clear or device change<br>**Where**: New preferences API + localStorage<br>**AC**: Save theme, dashboard widget order, alert settings, sync across devices | |
| CON-8 | App deployment status | P3 | TODO | `src/deployment-routes.ts`, `web/deployment.html` | **What**: Show deployment info (version, last deploy, environment)<br>**Why**: Don't know what version is running where<br>**Where**: New deployment page querying apps<br>**AC**: Display version, commit SHA, deploy timestamp, environment for each app | |
| CON-9 | Suite-wide search | P3 | TODO | `src/search-routes.ts`, `web/search.html` | **What**: Search across all apps (tasks, leads, campaigns, projects)<br>**Why**: Have to search each app individually<br>**Where**: Unified search API calling all apps<br>**AC**: Type query → see results from all apps, click to jump to app, filters by type/app | |
| CON-10 | Performance monitoring | P2 | TODO | `src/performance-routes.ts`, `web/performance.html` | **What**: Track response times, error rates, throughput per app<br>**Why**: No visibility into app performance<br>**Where**: Perf metrics collection + dashboard<br>**AC**: Charts show p50/p95/p99 latency, error rate %, requests/sec, alerts on degradation | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

Must pass before production release:

```bash
# All tests pass (once written)
pnpm --filter console test

# No TypeScript errors
pnpm --filter console typecheck

# No linting errors
pnpm --filter console lint

# Builds successfully
pnpm --filter console build

# Manual smoke test:
# - All apps show online in health checks
# - Events appear in timeline
# - AI telemetry shows calls/costs
# - Worker jobs display with stats
# - Team data persists after restart (once fixed)
```
