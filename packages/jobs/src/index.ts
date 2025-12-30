/**
 * @sb/jobs
 * Job runner for scheduled and on-demand tasks
 */

import { logger } from "@sb/logger";
import { publish } from "@sb/events";
import { getTelemetryState } from "@sb/telemetry";

// Export scheduler
export * from "./scheduler";

/**
 * Job execution context
 */
export interface JobContext {
  logger: typeof logger;
  events: {
    publish: typeof publish;
  };
  telemetry: {
    getState: typeof getTelemetryState;
  };
  now: Date;
  input?: Record<string, unknown>; // Optional input data (e.g., { orgId: "default-org" })
}

/**
 * Job definition
 */
export interface Job {
  id: string;
  name: string;
  scheduleHint?: string; // e.g., "daily at 9am", "every 5 minutes", "on-demand"
  run: (ctx: JobContext) => Promise<void>;
}

/**
 * Registered jobs registry
 */
const jobs = new Map<string, Job>();

/**
 * Register jobs
 */
export function registerJobs(jobList: Job[]): void {
  for (const job of jobList) {
    if (jobs.has(job.id)) {
      throw new Error(`Job with id "${job.id}" is already registered`);
    }
    jobs.set(job.id, job);
  }
}

/**
 * Get all registered jobs
 */
export function getJobs(): Job[] {
  return Array.from(jobs.values());
}

/**
 * Get a specific job by ID
 */
export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/**
 * Run a job by ID
 */
export async function runJob(id: string, input?: Record<string, unknown>): Promise<void> {
  const job = jobs.get(id);
  if (!job) {
    throw new Error(`Job "${id}" not found`);
  }

  const ctx: JobContext = {
    logger,
    events: {
      publish,
    },
    telemetry: {
      getState: getTelemetryState,
    },
    now: new Date(),
    input,
  };

  ctx.logger.info(`Starting job: ${job.name} (${job.id})`);
  const startTime = Date.now();

  try {
    await job.run(ctx);
    const duration = Date.now() - startTime;
    ctx.logger.info(`Completed job: ${job.name} (${job.id}) in ${duration}ms`);

    // Publish job completion event
    await ctx.events.publish("job.completed", {
      jobId: job.id,
      jobName: job.name,
      duration,
      success: true,
    }, {
      sourceApp: "worker",
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.logger.error(`Failed job: ${job.name} (${job.id}) after ${duration}ms`, {
      error: error instanceof Error ? error.message : String(error),
    });

    // Publish job failure event
    await ctx.events.publish("job.failed", {
      jobId: job.id,
      jobName: job.name,
      duration,
      error: error instanceof Error ? error.message : String(error),
    }, {
      sourceApp: "worker",
    });

    throw error;
  }
}

