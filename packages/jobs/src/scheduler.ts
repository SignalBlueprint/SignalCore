/**
 * Job scheduler using node-cron
 */

import cron from "node-cron";
import { logger } from "@sb/logger";
import { runJob, getJob } from "./index";

/**
 * Job schedule configuration
 */
export interface JobSchedule {
  jobId: string;
  schedule: string; // Cron expression
  enabled: boolean;
  timezone?: string;
  input?: Record<string, unknown>; // Optional input data (e.g., { orgId: "default-org" })
  description?: string;
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
  schedules: JobSchedule[];
}

/**
 * Scheduled task handle
 */
interface ScheduledTask {
  jobId: string;
  task: cron.ScheduledTask;
  schedule: JobSchedule;
}

/**
 * Job scheduler
 */
export class Scheduler {
  private tasks: Map<string, ScheduledTask> = new Map();
  private isRunning = false;

  /**
   * Start the scheduler with the given configuration
   */
  start(config: SchedulerConfig): void {
    if (this.isRunning) {
      logger.warn("Scheduler is already running");
      return;
    }

    logger.info(`Starting scheduler with ${config.schedules.length} schedules`);

    for (const schedule of config.schedules) {
      if (!schedule.enabled) {
        logger.info(`Skipping disabled schedule: ${schedule.jobId}`);
        continue;
      }

      // Validate that the job exists
      const job = getJob(schedule.jobId);
      if (!job) {
        logger.error(`Job not found: ${schedule.jobId}, skipping schedule`);
        continue;
      }

      // Validate cron expression
      if (!cron.validate(schedule.schedule)) {
        logger.error(`Invalid cron expression for ${schedule.jobId}: ${schedule.schedule}`);
        continue;
      }

      try {
        // Create scheduled task
        const task = cron.schedule(
          schedule.schedule,
          async () => {
            logger.info(`Executing scheduled job: ${schedule.jobId}`);
            try {
              await runJob(schedule.jobId, schedule.input);
            } catch (error) {
              logger.error(`Scheduled job failed: ${schedule.jobId}`, {
                error: error instanceof Error ? error.message : String(error),
              });
            }
          },
          {
            scheduled: true,
            timezone: schedule.timezone || "UTC",
          }
        );

        this.tasks.set(schedule.jobId, {
          jobId: schedule.jobId,
          task,
          schedule,
        });

        logger.info(
          `Scheduled job: ${schedule.jobId} (${schedule.schedule})${
            schedule.timezone ? ` [${schedule.timezone}]` : ""
          }`
        );
      } catch (error) {
        logger.error(`Failed to schedule job: ${schedule.jobId}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    this.isRunning = true;
    logger.info("Scheduler started successfully");
  }

  /**
   * Stop the scheduler and all scheduled tasks
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn("Scheduler is not running");
      return;
    }

    logger.info("Stopping scheduler");

    for (const [jobId, scheduledTask] of this.tasks.entries()) {
      scheduledTask.task.stop();
      logger.info(`Stopped scheduled job: ${jobId}`);
    }

    this.tasks.clear();
    this.isRunning = false;
    logger.info("Scheduler stopped");
  }

  /**
   * Get all scheduled tasks
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Check if scheduler is running
   */
  isActive(): boolean {
    return this.isRunning;
  }

  /**
   * Get a specific scheduled task
   */
  getTask(jobId: string): ScheduledTask | undefined {
    return this.tasks.get(jobId);
  }
}

/**
 * Global scheduler instance
 */
export const scheduler = new Scheduler();
