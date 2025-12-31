/**
 * Retry job for failed executions
 * Automatically retries recently failed jobs with exponential backoff
 */

import { type Job } from "@sb/jobs";
import { getAllJobExecutions } from "./executions";
import { runJobWithTracking } from "./job-runner";

/**
 * Configuration for retry behavior
 */
interface RetryConfig {
  /** Maximum number of retry attempts per job */
  maxRetries: number;
  /** Time window to look for failed jobs (in hours) */
  lookbackHours: number;
  /** Jobs that should not be retried automatically */
  excludeJobs: string[];
}

/**
 * Default retry configuration
 */
const DEFAULT_CONFIG: RetryConfig = {
  maxRetries: 3,
  lookbackHours: 24,
  excludeJobs: [
    "daily.questmaster.dryrun", // Dry runs don't need retry
    "maintenance.cleanup",       // Cleanup can wait for next run
    "maintenance.retry",         // Don't retry the retry job itself
  ],
};

/**
 * Retry job - retries failed job executions
 */
export const retryJob: Job = {
  id: "maintenance.retry",
  name: "Retry Failed Jobs",
  scheduleHint: "every hour",
  run: async (ctx) => {
    ctx.logger.info("Starting retry job");

    try {
      // Get config from input or use defaults
      const config: RetryConfig = {
        maxRetries: (ctx.input?.maxRetries as number) || DEFAULT_CONFIG.maxRetries,
        lookbackHours: (ctx.input?.lookbackHours as number) || DEFAULT_CONFIG.lookbackHours,
        excludeJobs: (ctx.input?.excludeJobs as string[]) || DEFAULT_CONFIG.excludeJobs,
      };

      ctx.logger.info(`Retry config: max ${config.maxRetries} retries, ${config.lookbackHours}h lookback`);

      // Calculate cutoff time for failed jobs
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - config.lookbackHours);

      // Get all failed executions within the lookback window
      const allFailedExecutions = await getAllJobExecutions({ status: "failed" });
      const recentFailures = allFailedExecutions.filter((exec) => {
        const execTime = new Date(exec.startedAt);
        return execTime >= cutoffTime;
      });

      ctx.logger.info(`Found ${recentFailures.length} failed execution(s) in last ${config.lookbackHours}h`);

      let retriedCount = 0;
      let skippedCount = 0;

      for (const failedExec of recentFailures) {
        // Skip excluded jobs
        if (config.excludeJobs.includes(failedExec.jobId)) {
          ctx.logger.info(`Skipping excluded job: ${failedExec.jobId}`);
          skippedCount++;
          continue;
        }

        // Count how many times this specific execution has been retried
        // We'll use a simple heuristic: count recent failures of the same job within last hour
        const oneHourAgo = new Date();
        oneHourAgo.setHours(oneHourAgo.getHours() - 1);
        const recentJobFailures = allFailedExecutions.filter((exec) => {
          return (
            exec.jobId === failedExec.jobId &&
            new Date(exec.startedAt) >= oneHourAgo
          );
        });

        if (recentJobFailures.length >= config.maxRetries) {
          ctx.logger.warn(
            `Job ${failedExec.jobId} has failed ${recentJobFailures.length} times, ` +
            `exceeding max retries (${config.maxRetries}), skipping`
          );
          skippedCount++;
          continue;
        }

        // Retry the job
        try {
          ctx.logger.info(
            `Retrying job ${failedExec.jobId} (execution ${failedExec.id}), ` +
            `attempt ${recentJobFailures.length + 1}/${config.maxRetries}`
          );

          await runJobWithTracking(failedExec.jobId, failedExec.input);
          retriedCount++;

          ctx.logger.info(`Successfully retried job ${failedExec.jobId}`);
        } catch (error) {
          ctx.logger.error(`Failed to retry job ${failedExec.jobId}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          // Continue to next job even if retry fails
        }

        // Add a small delay between retries to avoid overwhelming the system
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      ctx.logger.info(
        `Retry job completed: ${retriedCount} retried, ${skippedCount} skipped`
      );

      // Publish event
      await ctx.events.publish("job.retry.completed", {
        retriedCount,
        skippedCount,
        totalFailed: recentFailures.length,
      }, {
        sourceApp: "worker",
      });
    } catch (error) {
      ctx.logger.error("Retry job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};
