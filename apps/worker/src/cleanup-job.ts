/**
 * Cleanup job for old execution records
 * Removes execution records older than the retention period
 */

import { type Job } from "@sb/jobs";
import { cleanupOldExecutions } from "./executions";

/**
 * Default retention period in days
 */
const DEFAULT_RETENTION_DAYS = 30;

/**
 * Cleanup job - removes old execution records
 */
export const cleanupJob: Job = {
  id: "maintenance.cleanup",
  name: "Execution Cleanup",
  scheduleHint: "daily at midnight",
  run: async (ctx) => {
    ctx.logger.info("Starting execution cleanup job");

    try {
      // Get retention days from input or use default
      const retentionDays = (ctx.input?.retentionDays as number) || DEFAULT_RETENTION_DAYS;

      ctx.logger.info(`Cleaning up executions older than ${retentionDays} days`);

      // Clean up old executions
      const deletedCount = await cleanupOldExecutions(retentionDays);

      ctx.logger.info(`Cleanup completed: removed ${deletedCount} old execution record(s)`);

      // Publish event
      await ctx.events.publish("execution.cleanup.completed", {
        retentionDays,
        deletedCount,
      }, {
        sourceApp: "worker",
      });
    } catch (error) {
      ctx.logger.error("Cleanup job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};
