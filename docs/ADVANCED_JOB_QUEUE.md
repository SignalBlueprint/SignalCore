# Advanced Job Queue System

The SignalCore Worker now includes an advanced job queue system that provides enterprise-grade features for managing background jobs, including priority queuing, job dependencies, automatic retries, dead letter queue, and comprehensive monitoring.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [CLI Commands](#cli-commands)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Advanced Usage](#advanced-usage)
- [Monitoring](#monitoring)
- [Best Practices](#best-practices)

## Overview

The advanced job queue extends the existing cron-based scheduler with a powerful queuing system that allows you to:

- Enqueue jobs dynamically with different priorities
- Define dependencies between jobs
- Automatically retry failed jobs with configurable backoff strategies
- Handle permanently failed jobs in a dead letter queue
- Control concurrency and rate limiting
- Monitor queue health and performance in real-time

## Key Features

### 1. Priority Queue System

Jobs can be assigned one of four priority levels:

- **Critical** (🔴) - Highest priority, processed immediately
- **High** (🟠) - High priority, processed frequently
- **Normal** (🟢) - Default priority, regular processing
- **Low** (🔵) - Lowest priority, processed when resources available

Priority distribution is configurable via weights (default: 50% critical, 30% high, 15% normal, 5% low).

### 2. Job Dependencies

Jobs can depend on other jobs completing successfully before they start:

```typescript
await queueManager.enqueue({
  jobId: "send-report",
  dependsOn: ["generate-data", "process-analytics"],
  priority: "high",
});
```

### 3. Automatic Retry Logic

Failed jobs are automatically retried with configurable:

- Maximum attempts (default: 3)
- Retry delay (default: 5000ms)
- Backoff strategy: `fixed`, `exponential`, or `linear`

```typescript
await queueManager.enqueue({
  jobId: "api-sync",
  maxAttempts: 5,
  retryDelay: 10000,
  retryBackoff: "exponential", // 10s, 20s, 40s, 80s, 160s
});
```

### 4. Dead Letter Queue (DLQ)

Jobs that fail repeatedly (default: 5 attempts) are moved to a dead letter queue for manual inspection and retry:

```bash
# View dead letter queue
pnpm --filter worker dev -- queue:dlq

# Retry a job from DLQ
pnpm --filter worker dev -- queue:retry <dlq-job-id>
```

### 5. Concurrency Control

Limit concurrent execution globally and per concurrency group:

```typescript
await queueManager.enqueue({
  jobId: "heavy-processing",
  concurrencyKey: "cpu-intensive",
  // Only 2 jobs with this key can run simultaneously
});
```

Configure limits:

```typescript
const queueManager = getQueueManager({
  maxConcurrency: 10, // Global limit
  concurrencyLimits: {
    "cpu-intensive": 2,
    "io-bound": 5,
  },
});
```

### 6. Rate Limiting

Control how frequently specific jobs can run:

```typescript
await queueManager.enqueue({
  jobId: "api-call",
  rateLimit: {
    maxRuns: 10, // Maximum 10 runs
    windowMs: 60000, // Per minute
  },
});
```

### 7. Scheduled/Delayed Jobs

Schedule jobs for future execution:

```typescript
await queueManager.enqueue({
  jobId: "scheduled-task",
  scheduledFor: new Date("2026-01-15T10:00:00Z"),
});
```

### 8. Queue Management

Control queue behavior:

- **Active** - Normal processing
- **Paused** - Stop processing new jobs (running jobs continue)
- **Draining** - Finish all jobs then stop

## Architecture

```
┌─────────────────────────────────────────────────────┐
│              Queue Manager                          │
│  - Priority-based job selection                    │
│  - Dependency resolution                            │
│  - Retry logic with backoff                        │
│  - Dead letter queue handling                      │
│  - Concurrency & rate limiting                     │
└───────────┬─────────────────────────────────────────┘
            │
    ┌───────▼────────┐
    │   Storage      │
    │  - Queued Jobs │
    │  - DLQ Jobs    │
    └───────┬────────┘
            │
    ┌───────▼────────┐
    │  Job Registry  │
    │  (from @sb/jobs)│
    └────────────────┘
```

## Getting Started

### 1. Start the Queue Manager

```bash
pnpm --filter worker dev -- queue:start
```

This starts the queue processor which continuously polls for ready jobs.

### 2. Enqueue Jobs

#### Via CLI:

```bash
# Enqueue with default priority
pnpm --filter worker dev -- queue:enqueue daily.questmaster

# Enqueue with high priority
pnpm --filter worker dev -- queue:enqueue github.sync --priority high

# Schedule for future execution
pnpm --filter worker dev -- queue:enqueue weekly.sprintplanner \
  --scheduled-for "2026-01-10T09:00:00Z"

# With dependencies
pnpm --filter worker dev -- queue:enqueue send-report \
  --depends-on "generate-data,process-analytics"

# With concurrency control
pnpm --filter worker dev -- queue:enqueue heavy-task \
  --concurrency-key "cpu-intensive"
```

#### Via API:

```typescript
import { getQueueManager } from "@sb/jobs";

const queueManager = getQueueManager();

await queueManager.enqueue({
  jobId: "daily.questmaster",
  priority: "normal",
  input: { orgId: "org-123" },
  orgId: "org-123",
  tags: ["daily", "automated"],
});
```

### 3. Monitor Queue Status

```bash
pnpm --filter worker dev -- queue:status
```

Output:

```
📊 Queue Status

  Mode: active
  Max Concurrency: 5
  Active Workers: 2/5

📈 Queue Statistics

  Total Jobs: 45
  Ready: 8
  Running: 2
  Pending: 5
  Delayed: 10
  Completed: 15
  Failed: 3
  Dead Letter: 2

🎯 Priority Breakdown

  Critical: 2
  High: 10
  Normal: 25
  Low: 8

⏱️  Performance Metrics

  Avg Wait Time: 1250ms
  Avg Execution Time: 3450ms
  Success Rate: 92.3%
```

## CLI Commands

### Queue Management

```bash
# Start queue manager (daemon mode)
pnpm --filter worker dev -- queue:start

# Show queue status and statistics
pnpm --filter worker dev -- queue:status

# Pause queue processing
pnpm --filter worker dev -- queue:pause

# Resume queue processing
pnpm --filter worker dev -- queue:resume

# Drain queue (finish all jobs then stop)
pnpm --filter worker dev -- queue:drain
```

### Job Management

```bash
# Enqueue a new job
pnpm --filter worker dev -- queue:enqueue <jobId> [options]
  --priority <critical|high|normal|low>
  --org <orgId>
  --scheduled-for <ISO date>
  --depends-on <jobId1,jobId2>
  --concurrency-key <key>

# List queued jobs
pnpm --filter worker dev -- queue:list
pnpm --filter worker dev -- queue:list --status ready
pnpm --filter worker dev -- queue:list --priority high
pnpm --filter worker dev -- queue:list --limit 100

# Cancel a queued job
pnpm --filter worker dev -- queue:cancel <queuedJobId>
```

### Dead Letter Queue

```bash
# View dead letter queue
pnpm --filter worker dev -- queue:dlq
pnpm --filter worker dev -- queue:dlq --limit 50

# Retry a job from DLQ (creates new job with high priority)
pnpm --filter worker dev -- queue:retry <dlqJobId>
```

## API Endpoints

### Queue Status

```
GET /api/queue/status
```

Returns queue configuration and statistics.

### Queued Jobs

```
GET /api/queue/jobs?limit=100&status=ready&priority=high&orgId=org-123
```

List all queued jobs with optional filters.

```
GET /api/queue/jobs/:id
```

Get a specific queued job.

```
POST /api/queue/enqueue
Content-Type: application/json

{
  "jobId": "daily.questmaster",
  "priority": "high",
  "input": { "orgId": "org-123" },
  "scheduledFor": "2026-01-15T10:00:00Z",
  "dependsOn": ["job-1", "job-2"],
  "maxAttempts": 5,
  "retryDelay": 10000,
  "retryBackoff": "exponential",
  "timeout": 300000,
  "concurrencyKey": "questmaster",
  "orgId": "org-123",
  "tags": ["automated", "daily"]
}
```

Enqueue a new job.

```
POST /api/queue/cancel/:id
```

Cancel a queued job.

### Queue Control

```
POST /api/queue/pause
```

Pause the queue.

```
POST /api/queue/resume
```

Resume the queue.

```
POST /api/queue/drain
```

Drain the queue.

### Dead Letter Queue

```
GET /api/queue/dlq?limit=100&orgId=org-123
```

Get dead letter queue entries.

```
POST /api/queue/dlq/retry/:id
```

Retry a job from the dead letter queue.

### Overview Dashboard

```
GET /api/queue/overview
```

Get comprehensive queue overview with statistics, recent jobs, and DLQ summary.

## Configuration

### Default Configuration

```typescript
{
  maxConcurrency: 5,
  concurrencyLimits: {},
  priorityWeights: {
    critical: 50,
    high: 30,
    normal: 15,
    low: 5,
  },
  defaultMaxAttempts: 3,
  defaultRetryDelay: 5000, // 5 seconds
  defaultRetryBackoff: "exponential",
  defaultTimeout: 300000, // 5 minutes
  deadLetterEnabled: true,
  deadLetterThreshold: 5,
  mode: "active",
  pollInterval: 1000, // 1 second
  retentionDays: 7,
  cleanupInterval: 3600000, // 1 hour
}
```

### Custom Configuration

```typescript
import { getQueueManager } from "@sb/jobs";

const queueManager = getQueueManager({
  maxConcurrency: 10,
  concurrencyLimits: {
    "cpu-intensive": 2,
    "io-bound": 8,
  },
  priorityWeights: {
    critical: 60,
    high: 25,
    normal: 10,
    low: 5,
  },
  defaultMaxAttempts: 5,
  deadLetterThreshold: 10,
});
```

### Runtime Configuration Updates

```typescript
queueManager.updateConfig({
  maxConcurrency: 15,
  mode: "active",
});
```

## Advanced Usage

### Job Dependency Chains

Create complex job workflows:

```typescript
// Job A (no dependencies)
const jobA = await queueManager.enqueue({
  jobId: "fetch-data",
  priority: "high",
});

// Job B depends on A
const jobB = await queueManager.enqueue({
  jobId: "process-data",
  dependsOn: [jobA.id],
  priority: "high",
});

// Job C depends on B
const jobC = await queueManager.enqueue({
  jobId: "generate-report",
  dependsOn: [jobB.id],
  priority: "normal",
});

// Job D depends on B and C
const jobD = await queueManager.enqueue({
  jobId: "send-notifications",
  dependsOn: [jobB.id, jobC.id],
  priority: "normal",
});
```

### Delayed Job Scheduling

Schedule jobs for specific times:

```typescript
// Run in 1 hour
const oneHourLater = new Date(Date.now() + 60 * 60 * 1000);
await queueManager.enqueue({
  jobId: "scheduled-task",
  scheduledFor: oneHourLater,
  priority: "normal",
});

// Run daily at 9 AM (combine with cron for recurring)
const tomorrow9AM = new Date();
tomorrow9AM.setDate(tomorrow9AM.getDate() + 1);
tomorrow9AM.setHours(9, 0, 0, 0);
await queueManager.enqueue({
  jobId: "daily.report",
  scheduledFor: tomorrow9AM,
  priority: "high",
});
```

### Custom Retry Strategies

```typescript
// Exponential backoff (2x each retry)
await queueManager.enqueue({
  jobId: "unstable-api",
  maxAttempts: 5,
  retryDelay: 1000, // 1s, 2s, 4s, 8s, 16s
  retryBackoff: "exponential",
});

// Linear backoff (constant increase)
await queueManager.enqueue({
  jobId: "rate-limited-api",
  maxAttempts: 5,
  retryDelay: 5000, // 5s, 10s, 15s, 20s, 25s
  retryBackoff: "linear",
});

// Fixed delay
await queueManager.enqueue({
  jobId: "simple-retry",
  maxAttempts: 3,
  retryDelay: 10000, // 10s, 10s, 10s
  retryBackoff: "fixed",
});
```

### Concurrency Groups

Group jobs that share resource limits:

```typescript
// CPU-intensive jobs (max 2 concurrent)
await queueManager.enqueue({
  jobId: "video-processing",
  concurrencyKey: "cpu-intensive",
});

await queueManager.enqueue({
  jobId: "image-compression",
  concurrencyKey: "cpu-intensive",
});

// I/O-bound jobs (max 5 concurrent)
await queueManager.enqueue({
  jobId: "file-upload",
  concurrencyKey: "io-bound",
});

// Configure limits
queueManager.updateConfig({
  concurrencyLimits: {
    "cpu-intensive": 2,
    "io-bound": 5,
  },
});
```

## Monitoring

### CLI Monitoring

```bash
# Real-time queue status
pnpm --filter worker dev -- queue:status

# List all jobs
pnpm --filter worker dev -- queue:list

# Filter by status
pnpm --filter worker dev -- queue:list --status running
pnpm --filter worker dev -- queue:list --status failed

# Filter by priority
pnpm --filter worker dev -- queue:list --priority critical

# Monitor dead letter queue
pnpm --filter worker dev -- queue:dlq
```

### API Monitoring

```bash
# Queue overview
curl http://localhost:3001/api/queue/overview

# Queue status
curl http://localhost:3001/api/queue/status

# Queued jobs
curl http://localhost:3001/api/queue/jobs

# Dead letter queue
curl http://localhost:3001/api/queue/dlq
```

### Event Monitoring

The queue publishes events for all operations:

- `queue.enqueued` - Job added to queue
- `queue.started` - Job execution started
- `queue.completed` - Job completed successfully
- `queue.failed` - Job execution failed
- `queue.retry` - Job scheduled for retry
- `queue.dead-letter` - Job moved to DLQ
- `queue.cancelled` - Job cancelled
- `queue.paused` - Queue paused
- `queue.resumed` - Queue resumed
- `queue.draining` - Queue draining

Monitor these events via the Console app or Events API.

## Best Practices

### 1. Choose Appropriate Priorities

- **Critical**: System-critical operations, alerts, real-time processing
- **High**: User-facing operations, time-sensitive tasks
- **Normal**: Regular background jobs, scheduled tasks
- **Low**: Cleanup, optimization, non-urgent tasks

### 2. Use Dependencies Wisely

- Keep dependency chains short (max 3-4 levels)
- Consider splitting complex workflows into multiple jobs
- Handle dependency failures gracefully

### 3. Configure Retry Logic

- Use exponential backoff for external APIs
- Use linear backoff for rate-limited services
- Set appropriate maxAttempts (3-5 for most cases)
- Don't retry non-idempotent operations automatically

### 4. Implement Timeouts

- Set realistic timeouts based on job complexity
- Default is 5 minutes - adjust as needed
- Consider breaking long-running jobs into smaller chunks

### 5. Monitor Dead Letter Queue

- Review DLQ regularly for systematic failures
- Fix root causes before retrying
- Consider implementing alerts for DLQ growth

### 6. Use Concurrency Keys

- Group resource-intensive jobs together
- Prevent resource exhaustion
- Balance throughput with system stability

### 7. Tag and Organize Jobs

```typescript
await queueManager.enqueue({
  jobId: "data-sync",
  tags: ["automated", "daily", "critical"],
  metadata: {
    source: "scheduler",
    version: "2.0",
  },
});
```

### 8. Handle Errors Gracefully

Jobs should:
- Log errors comprehensively
- Clean up resources on failure
- Be idempotent when possible
- Fail fast for unrecoverable errors

### 9. Test Queue Behavior

```typescript
// Test with dry-run jobs
await queueManager.enqueue({
  jobId: "daily.questmaster.dryrun",
  priority: "low",
  tags: ["test", "dryrun"],
});
```

### 10. Monitor Performance

- Track average wait time
- Monitor success rate
- Watch for queue growth
- Alert on DLQ threshold

## Comparison: Queue vs Scheduler

### Use the Queue When:

- Jobs need to run dynamically (user-triggered, event-driven)
- Priority matters (some jobs must run before others)
- Jobs have dependencies on other jobs
- Retry logic and DLQ are important
- Concurrency and rate limiting are needed
- Jobs need flexible scheduling (not just cron)

### Use the Scheduler When:

- Jobs run on fixed schedules (cron expressions)
- No priority or dependencies needed
- Simple retry is sufficient
- Jobs are independent
- Simpler setup is preferred

### Best of Both Worlds:

You can use both! The scheduler can enqueue jobs to the queue:

```yaml
# scheduler.yaml
schedules:
  - jobId: daily.questmaster
    schedule: "0 9 * * *"
    enabled: true
    # Instead of running directly, enqueue with priority
    queueOptions:
      priority: high
      maxAttempts: 5
```

## Troubleshooting

### Jobs Stuck in Pending

Check dependencies:

```bash
pnpm --filter worker dev -- queue:list --status pending
```

Verify dependency jobs have completed.

### High DLQ Count

1. Check DLQ for common errors
2. Fix root causes
3. Retry or purge DLQ jobs

```bash
pnpm --filter worker dev -- queue:dlq
pnpm --filter worker dev -- queue:retry <dlq-job-id>
```

### Low Throughput

1. Increase maxConcurrency
2. Check for blocking jobs
3. Review concurrency limits

```typescript
queueManager.updateConfig({ maxConcurrency: 20 });
```

### Queue Growing

1. Check active workers
2. Verify queue is not paused
3. Increase concurrency
4. Review job execution times

```bash
pnpm --filter worker dev -- queue:status
```

## Future Enhancements

Planned features:

- [ ] Distributed queue support (Redis/PostgreSQL backend)
- [ ] Job progress tracking
- [ ] Batch job processing
- [ ] Job templates
- [ ] Advanced scheduling (cron-like for queued jobs)
- [ ] Job chaining DSL
- [ ] Webhook notifications
- [ ] Queue analytics dashboard
- [ ] Job replay from history
- [ ] A/B testing for job variants

---

## Support

For issues or questions:

- GitHub Issues: https://github.com/SignalBlueprint/SignalCore/issues
- Documentation: /docs
- Examples: /examples/queue

## License

MIT
