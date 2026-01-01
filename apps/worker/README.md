# Worker - Job Runner and Scheduler

The Worker app is a CLI-based job runner with automatic scheduling capabilities. It executes background jobs like daily quest management, sprint planning, and external integrations.

## Features

- **Scheduled Job Execution**: Automatic job execution using cron expressions
- **Manual Job Execution**: Run any job on-demand via CLI
- **YAML Configuration**: Simple, readable job scheduling configuration
- **Timezone Support**: Schedule jobs in different timezones
- **Job Registry**: Extensible job registration system
- **Event Publishing**: Jobs publish events for integration with other apps
- **Comprehensive Logging**: Detailed logging for monitoring and debugging
- **Signal Handling**: Graceful shutdown on SIGINT/SIGTERM

## Quick Start

### Install Dependencies

```bash
pnpm install
```

### Configure Schedules

Edit `scheduler.yaml` to configure when jobs should run:

```yaml
schedules:
  - jobId: daily.questmaster
    schedule: "0 9 * * *"  # 9 AM daily
    enabled: true
    timezone: "America/New_York"
    input:
      orgId: "your-org-id"
```

### Start the Scheduler Daemon

```bash
pnpm --filter worker dev -- daemon
```

This will start the Worker in daemon mode and execute jobs according to the schedule.

### Run a Job Manually

```bash
pnpm --filter worker dev -- job daily.questmaster --org your-org-id
```

## Commands

### `daemon` - Start Scheduler Daemon

Starts the Worker in daemon mode, executing jobs according to the schedule configuration.

```bash
# Use default config (scheduler.yaml)
pnpm --filter worker dev -- daemon

# Use custom config file
pnpm --filter worker dev -- daemon --config /path/to/config.yaml
```

The daemon will run continuously until stopped with Ctrl+C or a SIGTERM signal.

### `job` - Run a Job Once

Execute a specific job immediately (one-off execution).

```bash
pnpm --filter worker dev -- job <jobId> [--org <orgId>]
```

**Examples:**

```bash
# Run daily questmaster for specific org
pnpm --filter worker dev -- job daily.questmaster --org default-org

# Run sprint planner
pnpm --filter worker dev -- job weekly.sprintplanner --org default-org

# Run GitHub sync
pnpm --filter worker dev -- job github.sync

# Run dry run (no changes)
pnpm --filter worker dev -- job daily.questmaster.dryrun
```

### `list` - List All Jobs

Display all registered jobs.

```bash
pnpm --filter worker dev -- list
```

### `schedules` - Show Configured Schedules

Display all configured schedules from the config file.

```bash
# Use default config
pnpm --filter worker dev -- schedules

# Use custom config
pnpm --filter worker dev -- schedules --config /path/to/config.yaml
```

## Available Jobs

### `daily.questmaster`

**Schedule Hint:** Daily at 9 AM
**Requires:** `--org <orgId>`

Performs daily Questboard maintenance:
- Unlocks quests based on dependency completion
- Generates daily Quest Decks for team members
- Flags stuck/blocked tasks
- Updates quest status
- Publishes daily digest events

**Example:**

```bash
pnpm --filter worker dev -- job daily.questmaster --org default-org
```

### `weekly.sprintplanner`

**Schedule Hint:** Weekly on Monday at 9 AM
**Requires:** `--org <orgId>`

Generates weekly sprint plans:
- Creates sprint plan for the current week
- Generates individual member plans
- Assigns tasks based on Working Genius profiles
- Publishes sprint planning events

**Example:**

```bash
pnpm --filter worker dev -- job weekly.sprintplanner --org default-org
```

### `github.sync`

**Schedule Hint:** Every 5-15 minutes
**Requires:** GitHub configuration (GITHUB_TOKEN)

Syncs tasks to GitHub Issues:
- Creates GitHub Issues for tasks marked with `syncToGithub=true`
- Updates existing issues when task changes
- Syncs labels, status, and metadata
- Closes issues when tasks are completed

**Configuration:**

Set the following environment variables:

```bash
GITHUB_TOKEN=your_github_token
```

Tasks must have the `syncToGithub` field set to `true` and a `github.repo` field:

```json
{
  "syncToGithub": true,
  "github": {
    "repo": "owner/repo-name"
  }
}
```

**Example:**

```bash
pnpm --filter worker dev -- job github.sync
```

### `daily.questmaster.dryrun`

**Schedule Hint:** Daily at 10 AM
**Purpose:** Testing

A dry-run version of the questmaster job for testing purposes. Doesn't make actual changes.

**Example:**

```bash
pnpm --filter worker dev -- job daily.questmaster.dryrun
```

### `maintenance.cleanup`

**Schedule Hint:** Daily at midnight
**Purpose:** Maintenance

Cleans up old job execution records to keep storage usage under control. By default, removes executions older than 30 days.

**Configuration:**

```yaml
input:
  retentionDays: 30  # Number of days to keep execution records
```

**Example:**

```bash
# Clean up executions older than 30 days
pnpm --filter worker dev -- job maintenance.cleanup

# Custom retention period (via input)
pnpm --filter worker dev -- job maintenance.cleanup --retention 60
```

### `maintenance.retry`

**Schedule Hint:** Every hour
**Purpose:** Reliability

Automatically retries failed jobs with intelligent backoff logic. Looks for recently failed jobs within a configurable time window and retries them up to a maximum number of attempts.

**Features:**
- Exponential backoff between retries
- Configurable max retry attempts
- Configurable lookback window
- Excludes certain jobs from retry (dry runs, maintenance jobs)

**Configuration:**

```yaml
input:
  maxRetries: 3        # Maximum retry attempts per job
  lookbackHours: 24    # Time window to look for failed jobs
  excludeJobs:         # Jobs to exclude from retry (optional)
    - daily.questmaster.dryrun
    - maintenance.cleanup
```

**Example:**

```bash
# Run retry job manually
pnpm --filter worker dev -- job maintenance.retry
```

## Configuration

### Scheduler Configuration (`scheduler.yaml`)

The scheduler configuration is a YAML file that defines when and how jobs are executed.

**File Location:** `apps/worker/scheduler.yaml`

**Example Configuration:**

```yaml
schedules:
  # Daily Questmaster
  - jobId: daily.questmaster
    schedule: "0 9 * * *"  # Every day at 9:00 AM
    enabled: true
    timezone: "America/New_York"
    description: "Daily quest unlocking and deck generation"
    input:
      orgId: "default-org"

  # Weekly Sprint Planner
  - jobId: weekly.sprintplanner
    schedule: "0 9 * * 1"  # Every Monday at 9:00 AM
    enabled: true
    timezone: "America/New_York"
    description: "Weekly sprint planning and task assignments"
    input:
      orgId: "default-org"

  # GitHub Sync (every 15 minutes)
  - jobId: github.sync
    schedule: "*/15 * * * *"
    enabled: false
    timezone: "UTC"
    description: "Sync tasks to GitHub Issues"
```

### Schedule Fields

| Field | Required | Description |
|-------|----------|-------------|
| `jobId` | Yes | ID of the job to run (must match a registered job) |
| `schedule` | Yes | Cron expression defining when to run |
| `enabled` | Yes | Whether this schedule is active |
| `timezone` | No | Timezone for schedule (default: UTC) |
| `description` | No | Human-readable description |
| `input` | No | Input data passed to job (e.g., `orgId`) |

### Cron Expression Format

```
* * * * *
│ │ │ │ │
│ │ │ │ └─── Day of week (0-7, Sunday=0 or 7)
│ │ │ └──────── Month (1-12)
│ │ └───────────── Day of month (1-31)
│ └────────────────── Hour (0-23)
└─────────────────────── Minute (0-59)
```

**Examples:**

| Expression | Description |
|------------|-------------|
| `0 9 * * *` | Every day at 9:00 AM |
| `0 9 * * 1` | Every Monday at 9:00 AM |
| `*/15 * * * *` | Every 15 minutes |
| `0 */2 * * *` | Every 2 hours |
| `0 0 1 * *` | First day of every month at midnight |
| `30 8 * * 1-5` | 8:30 AM Monday through Friday |

### Alert Configuration (`alerts.yaml`)

The Worker app includes a comprehensive alerting system that monitors job health and sends notifications via Slack, email, or Discord.

**File Location:** `apps/worker/alerts.yaml`

**Example Configuration:**

```yaml
settings:
  enabled: true
  channels:
    - slack
  slack:
    channel: "#worker-alerts"
    username: "Worker Bot"
  throttle:
    minInterval: 300  # 5 minutes between identical alerts
    maxAlertsPerJobPerHour: 10

jobFailures:
  - name: "repeated-failures"
    enabled: true
    conditions:
      consecutiveFailures: 3
    severity: "high"
    channels: ["slack"]

queueHealth:
  - name: "dlq-jobs"
    enabled: true
    conditions:
      dlqSize: 1  # Alert on any DLQ job
    severity: "high"
    channels: ["slack"]

performance:
  - name: "low-success-rate"
    enabled: true
    conditions:
      successRate: 0.8  # Alert if below 80%
      timeWindow: 3600  # 1 hour
      minRuns: 5
    severity: "medium"
    channels: ["slack"]
```

See the [Alerting](#alerting) section for full details.

### Environment Variables

Some jobs and features require environment variables:

```bash
# GitHub Integration
GITHUB_TOKEN=your_github_personal_access_token

# OpenAI (for AI features in jobs)
OPENAI_API_KEY=your_openai_api_key

# Alerting (Slack)
NOTIFY_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=your_slack_webhook_url
# OR
SLACK_BOT_TOKEN=your_slack_bot_token

# Alerting (Email) - Optional
NOTIFY_EMAIL_ENABLED=true
SENDGRID_API_KEY=your_sendgrid_api_key
```

## Creating New Jobs

To create a new job:

### 1. Create a Job File

Create a new file in `src/` (e.g., `my-job.ts`):

```typescript
import { type Job } from "@sb/jobs";

export const myJob: Job = {
  id: "my.job",
  name: "My Custom Job",
  scheduleHint: "hourly",
  run: async (ctx) => {
    ctx.logger.info("Running my custom job");

    // Access input
    const orgId = ctx.input?.orgId as string | undefined;

    // Do work
    // ...

    // Publish events
    await ctx.events.publish("my.job.completed", {
      processedCount: 42,
    }, {
      sourceApp: "worker",
    });

    ctx.logger.info("Job completed");
  },
};
```

### 2. Register the Job

Add your job to `src/jobs.ts`:

```typescript
import { registerJobs } from "@sb/jobs";
import { myJob } from "./my-job";

registerJobs([
  // ... existing jobs
  myJob,
]);
```

### 3. Add to Scheduler Config

Add your job to `scheduler.yaml`:

```yaml
schedules:
  - jobId: my.job
    schedule: "0 * * * *"  # Every hour
    enabled: true
    timezone: "UTC"
    description: "My custom job"
    input:
      orgId: "default-org"
```

### 4. Test Your Job

```bash
# Run manually first
pnpm --filter worker dev -- job my.job --org default-org

# Then test with scheduler
pnpm --filter worker dev -- schedules
pnpm --filter worker dev -- daemon
```

## Job Context API

Jobs receive a `JobContext` object with the following properties:

```typescript
interface JobContext {
  logger: Logger;           // Logger instance
  events: {                 // Event system
    publish: Function;
  };
  telemetry: {             // Telemetry API
    getState: Function;
  };
  now: Date;               // Current execution time
  input?: Record<string, unknown>;  // Input data from config
}
```

**Example Usage:**

```typescript
run: async (ctx) => {
  // Logging
  ctx.logger.info("Starting job");
  ctx.logger.error("Error occurred", { error: "details" });

  // Access input
  const orgId = ctx.input?.orgId as string;

  // Get current time
  const today = ctx.now.toISOString().split("T")[0];

  // Publish events
  await ctx.events.publish("job.event", {
    data: "value",
  }, {
    sourceApp: "worker",
  });
}
```

## Monitoring and Debugging

### Viewing Logs

Worker uses `@sb/logger` for logging. Logs are output to stdout/stderr.

**Log Levels:**
- `info` - General information
- `warn` - Warnings
- `error` - Errors

### Job Events

Jobs publish events that can be consumed by other apps (like Console):

- `job.completed` - Job finished successfully
- `job.failed` - Job failed with error
- Job-specific events (e.g., `sprint.plan.generated`)

### Debugging a Job

1. **Run manually** with explicit logging:
   ```bash
   pnpm --filter worker dev -- job daily.questmaster --org default-org
   ```

2. **Check job run summaries** (stored in Questboard):
   - View in Console app
   - Query storage directly

3. **Use dry-run mode** if available

4. **Check event logs** in Console app

## Production Deployment

### Using PM2 (Recommended)

PM2 is a production process manager that keeps the Worker running.

**Install PM2:**

```bash
npm install -g pm2
```

**Create PM2 config (`ecosystem.config.js`):**

```javascript
module.exports = {
  apps: [{
    name: 'worker',
    script: 'dist/index.js',
    args: 'daemon',
    cwd: '/path/to/SignalCore/apps/worker',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      OPENAI_API_KEY: 'your-key',
      GITHUB_TOKEN: 'your-token',
    }
  }]
};
```

**Start with PM2:**

```bash
# Build first
pnpm --filter worker build

# Start
pm2 start ecosystem.config.js

# Monitor
pm2 logs worker
pm2 status

# Stop
pm2 stop worker
```

### Using systemd

**Create service file (`/etc/systemd/system/worker.service`):**

```ini
[Unit]
Description=Signal Blueprint Worker
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/SignalCore/apps/worker
ExecStart=/usr/bin/node dist/index.js daemon
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=OPENAI_API_KEY=your-key
Environment=GITHUB_TOKEN=your-token

[Install]
WantedBy=multi-user.target
```

**Start service:**

```bash
sudo systemctl enable worker
sudo systemctl start worker
sudo systemctl status worker
```

### Using Docker

**Create Dockerfile:**

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-workspace.yaml ./
COPY apps/worker ./apps/worker
COPY packages ./packages

# Install dependencies
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

# Build
RUN pnpm --filter worker build

WORKDIR /app/apps/worker

CMD ["node", "dist/index.js", "daemon"]
```

**Build and run:**

```bash
docker build -t worker .
docker run -d --name worker \
  -e OPENAI_API_KEY=your-key \
  -e GITHUB_TOKEN=your-token \
  -v $(pwd)/scheduler.yaml:/app/apps/worker/scheduler.yaml \
  worker
```

## Troubleshooting

### Job Not Running

1. Check if job is registered:
   ```bash
   pnpm --filter worker dev -- list
   ```

2. Check if schedule is enabled:
   ```bash
   pnpm --filter worker dev -- schedules
   ```

3. Verify cron expression is valid

4. Check timezone settings

### Job Failing

1. Run job manually to see error:
   ```bash
   pnpm --filter worker dev -- job <jobId> --org <orgId>
   ```

2. Check logs for error details

3. Verify required environment variables are set

4. Ensure org data exists (for Questboard jobs)

### Scheduler Not Starting

1. Check config file exists:
   ```bash
   ls -la scheduler.yaml
   ```

2. Validate YAML syntax

3. Check for config errors in logs

4. Verify all referenced jobs exist

## Architecture

### Job Registry

Jobs are registered in `src/jobs.ts` using the `@sb/jobs` package. The registry is a simple Map that stores job definitions.

### Scheduler

The scheduler uses `node-cron` to execute jobs on schedule. It:
1. Loads configuration from YAML
2. Validates job existence and cron expressions
3. Creates scheduled tasks
4. Handles graceful shutdown

### Job Execution

When a job runs (scheduled or manual):
1. Job context is created with logger, events, telemetry, and input
2. Job's `run` function is called
3. Success/failure events are published
4. Logs are written
5. For Questboard jobs, run summaries are saved

### Event System

Jobs publish events via `@sb/events`. Other apps (like Console) can subscribe to these events for monitoring and integration.

## Next Steps

### Completed Features

✅ **Job Execution Tracking**
   - Centralized execution tracking with @sb/storage
   - Execution history with statistics
   - CLI commands for viewing history and stats

✅ **Job Reliability**
   - Automatic retry logic with exponential backoff
   - Configurable retry attempts and lookback windows
   - Execution cleanup for storage management

✅ **Monitoring Dashboard**
   - Real-time job monitoring in Console app
   - Visual job registry with status indicators
   - Execution history and statistics
   - 24-hour performance metrics
   - Failure tracking with error details

✅ **Advanced Job Queue**
   - Priority-based job scheduling (critical, high, normal, low)
   - Job dependency chains
   - Dead letter queue for permanently failed jobs
   - Concurrency control and rate limiting
   - Queue pause/resume/drain modes
   - Configurable retry with backoff strategies

✅ **Alerting**
   - Multi-channel notifications (Slack, Email, Discord)
   - Job failure alerts with configurable thresholds
   - Queue health monitoring (DLQ, backlog, paused state)
   - Performance degradation detection
   - Alert throttling to prevent spam
   - CLI and API for alert management

### Planned Features

1. **Advanced Scheduling**
   - Job dependency chains
   - Conditional execution based on results
   - Dynamic schedule adjustments
   - Manual schedule overrides

5. **Developer Tools**
   - Job template generator CLI
   - Testing framework for jobs
   - Enhanced debugging tools
   - Auto-generated documentation

## Alerting

The Worker app includes a comprehensive alerting system that monitors job execution, queue health, and performance.

### Features

- **Multi-Channel Notifications**: Send alerts via Slack, Email, or Discord
- **Job Failure Alerts**: Detect repeated failures, critical job failures, and timeouts
- **Queue Health Alerts**: Monitor dead letter queue, backlog, and queue state
- **Performance Alerts**: Track success rates, duration spikes, and concurrency saturation
- **Throttling**: Prevent alert spam with configurable rate limits
- **Event-Driven**: Automatically triggered by job and queue events

### Configuration

Edit `apps/worker/alerts.yaml` to configure alert rules:

```yaml
settings:
  enabled: true
  channels: [slack]
  slack:
    channel: "#worker-alerts"
    username: "Worker Bot"
    iconEmoji: ":gear:"
  throttle:
    minInterval: 300  # Seconds between identical alerts
    maxAlertsPerJobPerHour: 10

jobFailures:
  - name: "repeated-failures"
    description: "Alert when a job fails multiple times in a row"
    enabled: true
    conditions:
      consecutiveFailures: 3
    severity: "high"
    channels: ["slack"]

  - name: "critical-job-failure"
    description: "Alert immediately when critical jobs fail"
    enabled: true
    conditions:
      jobPattern: "^(questmaster|sprintplanner|github-sync)"
      failureCount: 1
    severity: "critical"
    channels: ["slack"]

queueHealth:
  - name: "dlq-jobs"
    description: "Alert when jobs enter the dead letter queue"
    enabled: true
    conditions:
      dlqSize: 1
    severity: "high"
    channels: ["slack"]

  - name: "queue-backlog"
    description: "Alert when queue backlog grows too large"
    enabled: true
    conditions:
      pendingJobs: 50
    severity: "medium"
    channels: ["slack"]

performance:
  - name: "low-success-rate"
    description: "Alert when job success rate drops below threshold"
    enabled: true
    conditions:
      jobPattern: ".*"
      successRate: 0.8  # 80%
      timeWindow: 3600  # 1 hour
      minRuns: 5
    severity: "medium"
    channels: ["slack"]

  - name: "duration-spike"
    description: "Alert when job duration increases significantly"
    enabled: true
    conditions:
      jobPattern: ".*"
      durationIncrease: 2.0  # 2x normal duration
      timeWindow: 3600
      minRuns: 3
    severity: "low"
    channels: ["slack"]
```

### Alert Commands

```bash
# View alert configuration
pnpm --filter worker dev -- alert:status

# View recent alerts
pnpm --filter worker dev -- alert:history
pnpm --filter worker dev -- alert:history --limit 50

# Send a test alert
pnpm --filter worker dev -- alert:test
```

### Alert API Endpoints

The Console app exposes REST API endpoints for alerts:

```bash
# Get alert configuration
GET /api/alerts/config

# Get alert history
GET /api/alerts/history?limit=50&severity=high&jobId=daily.questmaster

# Get alert statistics
GET /api/alerts/stats

# Send a test alert
POST /api/alerts/test
```

### Environment Variables

Configure alert channels via environment variables:

```bash
# Slack (webhook or bot token)
NOTIFY_SLACK_ENABLED=true
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
# OR
SLACK_BOT_TOKEN=xoxb-your-bot-token

# Email (via SendGrid)
NOTIFY_EMAIL_ENABLED=true
SENDGRID_API_KEY=your-sendgrid-api-key

# Discord (webhook)
NOTIFY_DISCORD_ENABLED=true
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR/WEBHOOK
```

### Alert Types

#### Job Failure Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| repeated-failures | Job fails N times consecutively | high |
| critical-job-failure | Critical jobs fail once | critical |
| job-timeout | Job execution times out | medium |

#### Queue Health Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| dlq-jobs | Jobs move to dead letter queue | high |
| queue-backlog | Pending jobs exceed threshold | medium |
| queue-paused | Queue is manually paused | medium |
| delayed-jobs | Too many jobs delayed/retrying | low |

#### Performance Alerts

| Alert | Condition | Severity |
|-------|-----------|----------|
| low-success-rate | Success rate drops below threshold | medium |
| duration-spike | Job duration increases significantly | low |
| concurrency-limit | Queue at max concurrency for extended period | low |

### Alert Throttling

Alerts are automatically throttled to prevent spam:

- **Minimum Interval**: Configurable seconds between identical alerts
- **Max Alerts Per Hour**: Per-job hourly alert limit
- **Window-Based**: Throttle windows reset after 1 hour

### Integration

Alerts are automatically integrated with:
- **Job Execution Tracking**: Monitors all job completions and failures
- **Queue Manager**: Listens to queue events (DLQ, failures, retries)
- **Event System**: Subscribes to job and queue events
- **Console Dashboard**: View alert history and statistics

### Customizing Alerts

To add custom alert rules:

1. Edit `alerts.yaml` and add a new rule
2. Alerts are automatically loaded on worker startup
3. No code changes required
4. Reload config with `alert:status` to verify

### Testing Alerts

```bash
# Send a test alert to verify configuration
pnpm --filter worker dev -- alert:test

# Trigger a job failure to test failure alerts
pnpm --filter worker dev -- job nonexistent.job

# Check alert history
pnpm --filter worker dev -- alert:history
```

## Resources

- [Main README](../../README.md)
- [Jobs Documentation](../../docs/JOBS.md)
- [Cron Expression Reference](https://crontab.guru/)
- [node-cron Documentation](https://www.npmjs.com/package/node-cron)
- [@sb/jobs Package](../../packages/jobs/)
