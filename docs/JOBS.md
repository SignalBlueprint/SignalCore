# Jobs System

The jobs system allows you to run scheduled and on-demand tasks across the suite.

## Architecture

- **`@sb/jobs`** - Job runner package with job registration and execution
- **`apps/worker`** - Worker app that executes jobs via CLI

## Adding a Job

1. **Create the job definition** in `apps/worker/src/jobs.ts`:

```typescript
import { type Job } from "@sb/jobs";

const myNewJob: Job = {
  id: "my.job.id",
  name: "My Job Name",
  scheduleHint: "daily at 9am", // Optional: human-readable schedule hint
  run: async (ctx) => {
    // Job logic here
    ctx.logger.info("Running my job");
    
    // Access context:
    // - ctx.logger: structured logger
    // - ctx.events.publish(): publish events
    // - ctx.telemetry.getState(): get telemetry state
    // - ctx.now: current date/time
    
    await ctx.events.publish("my.event" as any, {
      data: "example"
    }, {
      sourceApp: "worker",
    });
  },
};
```

2. **Register the job** by adding it to the `registerJobs()` call:

```typescript
registerJobs([
  dailyQuestmasterDryrun,
  myNewJob, // Add your job here
]);
```

## Running Jobs

### Run a specific job:

```bash
pnpm --filter worker dev -- job <jobId>
```

Example:
```bash
pnpm --filter worker dev -- job daily.questmaster.dryrun
```

### List all registered jobs:

```bash
pnpm --filter worker dev -- list
```

## Testing Jobs Locally

1. **Run the job directly:**
   ```bash
   pnpm --filter worker dev -- job daily.questmaster.dryrun
   ```

2. **Check the output:**
   - Job logs will appear in the console
   - Events will be written to `.sb/events/events.jsonl`

3. **Verify events were published:**
   ```bash
   # Check the event log
   cat .sb/events/events.jsonl | grep "job.completed"
   ```

## Job Context

Every job receives a `JobContext` with:

- **`logger`**: Structured logger from `@sb/logger`
  - `logger.info(message, meta?)`
  - `logger.warn(message, meta?)`
  - `logger.error(message, meta?)`

- **`events.publish()`**: Publish events to the event system
  - Events are validated and written to `.sb/events/events.jsonl`
  - Other apps can subscribe to these events

- **`telemetry.getState()`**: Get current telemetry state
  - Useful for checking AI call counts, cache stats, etc.

- **`now`**: Current Date object
  - Use for time-based logic

## Job Events

Jobs automatically publish events:

- **`job.completed`**: When a job completes successfully
  - Payload: `{ jobId, jobName, duration, success: true }`

- **`job.failed`**: When a job fails
  - Payload: `{ jobId, jobName, duration, error }`

Jobs can also publish custom events using `ctx.events.publish()`.

## Best Practices

1. **Use descriptive job IDs**: Follow the pattern `domain.action`, e.g., `questmaster.rotate`, `lead.scan`
2. **Include schedule hints**: Help operators understand when jobs should run
3. **Log important steps**: Use `ctx.logger` for visibility
4. **Publish meaningful events**: Other apps can react to job events
5. **Handle errors gracefully**: Jobs should fail with clear error messages
6. **Keep jobs focused**: Each job should do one thing well

## Future: Scheduling

Currently jobs run on-demand via CLI. Future enhancements:
- Add a scheduler (e.g., node-cron) for automatic execution
- Add job status tracking and history
- Add retry logic for failed jobs
- Add job dependencies (job B runs after job A completes)

