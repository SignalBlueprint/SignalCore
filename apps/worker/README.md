# Worker

## TL;DR
CLI job runner with cron scheduling, priority-based queue, dependency chains, alerting, and automatic retries. Production-ready for unattended execution.

## Product Goal
- Execute scheduled jobs automatically without human intervention
- Provide reliable job queue with priority, dependencies, and retries
- Alert on failures via Slack/Email/Discord
- Enable autonomous worker execution picking tasks from suite apps

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Cron scheduling**: YAML config with timezone support, runs jobs on schedule
- **Job registry**: 6+ jobs registered (questmaster, sprintplanner, github-sync, cleanup, retry)
- **Priority queue**: Critical/high/normal/low priority levels
- **Dependency chains**: Jobs can depend on other jobs completing first
- **Dead letter queue**: Failed jobs isolated for retry/inspection
- **Automatic retries**: Exponential backoff with configurable attempts
- **Alerting**: Multi-channel (Slack, Email, Discord) with throttling
- **Execution tracking**: Complete history with statistics persisted to @sb/storage
- **CLI commands**: daemon, job, list, schedules, queue:*, alert:*

### 🟡 Partial (Works but Incomplete)
- **Job monitoring UI**: Console shows basic metrics, could be richer
- **Limited job variety**: Only 6 jobs, need more automation opportunities

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **No job editor UI**: Must edit YAML manually to change schedules
- **No job marketplace**: Can't share/discover jobs from community
- **Limited cross-app jobs**: Most jobs are Questboard-focused

## How to Run

### Install
```bash
# From monorepo root
pnpm install
```

### Dev
```bash
# Start daemon (runs continuously)
pnpm --filter worker dev -- daemon

# Run single job manually
pnpm --filter worker dev -- job daily.questmaster --org default-org

# List all jobs
pnpm --filter worker dev -- list

# Show configured schedules
pnpm --filter worker dev -- schedules
```

### Test
```bash
# No tests yet
pnpm --filter worker test
```

### Build
```bash
pnpm --filter worker build
```

### Env Vars
Required in root `.env`:
- `OPENAI_API_KEY` - For AI-powered jobs
- `DATABASE_URL` - For execution tracking persistence
- `GITHUB_TOKEN` - Optional, for GitHub sync job
- `SLACK_WEBHOOK_URL` or `SLACK_BOT_TOKEN` - Optional, for Slack alerts
- `SENDGRID_API_KEY` - Optional, for Email alerts

### URLs/Ports
- **CLI only** (no web interface)
- Logs output to stdout/stderr

## Architecture (Short)

### Stack
- **Runtime**: Node.js CLI (TypeScript)
- **Scheduler**: node-cron for cron expressions
- **Queue**: In-memory priority queue with persistence
- **Storage**: @sb/storage for execution history
- **Events**: Publishes to @sb/events for suite integration
- **Alerting**: @sb/notify for multi-channel notifications

### Key Modules
- `src/index.ts` - CLI entry point with command routing
- `src/jobs.ts` - Job registry
- `src/scheduler.ts` - Cron scheduler loading scheduler.yaml
- `src/queue-manager.ts` - Priority queue with dependencies
- `src/alerting.ts` - Alert rules from alerts.yaml
- `scheduler.yaml` - Job schedule configuration
- `alerts.yaml` - Alert rules and thresholds

### Data Flow
- Scheduler loads scheduler.yaml → cron tasks created
- Cron triggers → job enqueued in priority queue
- Queue manager picks ready jobs → executes job.run()
- Job publishes events → Console aggregates
- Job execution tracked → persisted via @sb/storage
- Failures trigger alerts → sent via @sb/notify

## Known Issues

### No Web UI for Job Management
- **Repro**: Want to change job schedule → must edit YAML manually
- **Root cause**: Worker is CLI-only, no web interface
- **Workaround**: Edit scheduler.yaml and restart daemon
- **Fix needed**: Build job management UI in Console

### Limited Job Library
- **Repro**: Want to automate X → no job exists, must write custom
- **Root cause**: Only 6 jobs implemented so far
- **Fix needed**: Implement more jobs for common automation needs

### Manual Alert Configuration
- **Repro**: Want different alert thresholds → edit alerts.yaml manually
- **Root cause**: No UI for alert management
- **Fix needed**: Add alert config UI in Console

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| WKR-1 | Job management UI in Console | P2 | TODO | `apps/console/src/worker-ui.ts`, `apps/console/web/worker-jobs.html` | **What**: Build web UI in Console for managing Worker jobs<br>**Why**: Editing YAML files is tedious and error-prone<br>**Where**: New Console page for job management<br>**AC**: View jobs, enable/disable schedules, trigger manual runs, edit cron expressions, see execution history | |
| WKR-2 | Test suite for Worker | P1 | TODO | `__tests__/scheduler.test.ts`, `__tests__/queue.test.ts` | **What**: Add comprehensive tests for scheduler + queue + jobs<br>**Why**: No tests = high regression risk on critical infrastructure<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ coverage, test cron parsing, queue priority, dependency chains, retries | |
| WKR-3 | Data sync jobs (LeadScout enrichment) | P2 | TODO | `src/jobs/leadscout-enrich.ts` | **What**: Create scheduled job to enrich leads with external data<br>**Why**: Manual lead enrichment is slow<br>**Where**: New job calling Hunter.io/Apollo APIs<br>**AC**: Job runs daily, fetches emails/company data, updates leads in LeadScout, tracks enrichment costs | |
| WKR-4 | Email digest jobs | P3 | TODO | `src/jobs/daily-digest.ts`, `src/jobs/weekly-summary.ts` | **What**: Send daily/weekly email digests of activity across suite<br>**Why**: Users want summary without logging in<br>**Where**: New digest jobs using @sb/notify<br>**AC**: Daily digest at 8am, weekly summary on Monday, includes tasks completed, leads added, campaigns sent | |
| WKR-5 | Alert configuration UI | P3 | TODO | `apps/console/src/alerts-ui.ts`, `apps/console/web/alerts.html` | **What**: Build UI in Console for configuring alert rules<br>**Why**: Editing alerts.yaml is not user-friendly<br>**Where**: New Console page for alerts<br>**AC**: Add/edit/delete alert rules, set thresholds, test alerts, enable/disable channels | |
| WKR-6 | Job template generator | P3 | TODO | `src/cli/create-job.ts` | **What**: CLI command to scaffold new job from template<br>**Why**: Writing jobs from scratch has boilerplate<br>**Where**: New `create-job` CLI command<br>**AC**: `pnpm dev -- create-job my-job` generates template with types, registers in jobs.ts | |
| WKR-7 | Backup/restore job | P2 | TODO | `src/jobs/backup.ts` | **What**: Scheduled job to backup all Supabase data to S3/file<br>**Why**: No automated backups, data loss risk<br>**Where**: New backup job with configurable retention<br>**AC**: Daily backup of all tables, exports to JSON/SQL, uploads to S3, keeps last 30 days | |
| WKR-8 | Job performance profiling | P3 | TODO | `src/profiler.ts` | **What**: Track job execution time breakdown (DB queries, API calls, etc)<br>**Why**: Slow jobs don't show what's taking time<br>**Where**: Profiler wrapper around job execution<br>**AC**: Execution summary shows time per operation, identifies bottlenecks, alerts on slowness | |
| WKR-9 | Cross-app workflow jobs | P2 | TODO | `src/jobs/lead-to-campaign.ts` | **What**: Job that moves qualified leads to Outreach campaigns automatically<br>**Why**: Manual lead→campaign workflow is slow<br>**Where**: New job querying LeadScout + creating Outreach campaigns<br>**AC**: Job runs hourly, finds high-score leads, creates campaign, marks leads contacted | |
| WKR-10 | Job marketplace/registry | P3 | TODO | `src/marketplace.ts` | **What**: Community job sharing - browse/install jobs from others<br>**Why**: Don't want to rewrite common jobs<br>**Where**: Marketplace API + catalog of shared jobs<br>**AC**: Browse jobs, preview code, install with one command, rate/review jobs | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

Must pass before production release:

```bash
# All tests pass (once written)
pnpm --filter worker test

# No TypeScript errors
pnpm --filter worker typecheck

# No linting errors
pnpm --filter worker lint

# Builds successfully
pnpm --filter worker build

# Manual smoke test:
# - Start daemon → jobs execute on schedule
# - Manual job execution → completes successfully
# - Job fails → alert sent, moves to DLQ
# - Dependency chain → jobs run in order
# - Execution history → persisted correctly
```
