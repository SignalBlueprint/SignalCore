# @sb/jobs

Job definition and registration system for scheduled background tasks in the Signal Blueprint suite.

## Purpose

`@sb/jobs` provides the core job system used by the Worker app for scheduling and executing background tasks like daily questmaster, sprint planning, and external integrations.

## Features

- **Job Definition** - TypeScript interface for defining jobs
- **Job Registry** - Central registration of all available jobs
- **Job Context** - Provides logger, events, telemetry, and input to jobs
- **Type Safety** - Full TypeScript support for job inputs and outputs

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Defining a Job

```typescript
import { type Job } from "@sb/jobs";

export const myJob: Job = {
  id: "my.job",
  name: "My Custom Job",
  scheduleHint: "daily",
  run: async (ctx) => {
    ctx.logger.info("Running my custom job");

    // Access input
    const orgId = ctx.input?.orgId as string;

    // Do work
    const result = await doWork(orgId);

    // Publish events
    await ctx.events.publish("my.job.completed", {
      processed: result.count
    }, {
      sourceApp: "worker"
    });

    ctx.logger.info("Job completed", { count: result.count });
  }
};
```

### Registering Jobs

```typescript
import { registerJobs } from "@sb/jobs";
import { myJob } from "./my-job";
import { dailyQuestmaster } from "./daily-questmaster";

registerJobs([
  dailyQuestmaster,
  myJob
]);
```

### Job Context API

Jobs receive a `JobContext` with:
```typescript
interface JobContext {
  logger: Logger;              // Logger instance
  events: EventPublisher;      // Event publishing
  telemetry: TelemetryAPI;     // Telemetry tracking
  now: Date;                   // Current execution time
  input?: Record<string, any>; // Input data from config
}
```

## Job Structure

```typescript
interface Job {
  id: string;            // Unique job ID (e.g., "daily.questmaster")
  name: string;          // Human-readable name
  scheduleHint: string;  // Suggested schedule ("daily", "weekly", etc.)
  run: (ctx: JobContext) => Promise<void>;
}
```

## Testing

```bash
pnpm --filter @sb/jobs test
```

## Dependencies

- `@sb/logger` - Logging
- `@sb/events` - Event publishing
- `@sb/telemetry` - Usage tracking

## Used By

- **Worker** - Executes registered jobs on schedule

See [Worker README](../../apps/worker/README.md) for details on job scheduling and execution.

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
