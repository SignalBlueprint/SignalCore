/**
 * Job runner with automatic execution tracking
 */

import { runJob as runJobCore, getJob } from "@sb/jobs";
import { logger } from "@sb/logger";
import {
  createJobExecution,
  markJobSuccess,
  markJobFailure,
} from "./executions";

/**
 * Run a job with automatic execution tracking
 */
export async function runJobWithTracking(
  jobId: string,
  input?: Record<string, unknown>
): Promise<void> {
  // Get job details
  const job = getJob(jobId);
  if (!job) {
    throw new Error(`Job "${jobId}" not found`);
  }

  // Extract orgId from input if present
  const orgId = input?.orgId as string | undefined;

  // Create execution record (marks as running)
  const execution = await createJobExecution({
    jobId,
    jobName: job.name,
    orgId,
    input,
  });

  logger.info(`[${execution.id}] Starting job execution`, {
    jobId,
    jobName: job.name,
    orgId,
  });

  try {
    // Run the actual job
    await runJobCore(jobId, input);

    // Mark as successful
    await markJobSuccess({
      executionId: execution.id,
      output: {
        // Jobs can optionally return output in the future
        // For now, we just track success
      },
    });

    logger.info(`[${execution.id}] Job execution completed successfully`, {
      jobId,
      jobName: job.name,
    });
  } catch (error) {
    // Mark as failed
    const errorMessage = error instanceof Error ? error.message : String(error);
    await markJobFailure({
      executionId: execution.id,
      error: errorMessage,
    });

    logger.error(`[${execution.id}] Job execution failed`, {
      jobId,
      jobName: job.name,
      error: errorMessage,
    });

    // Re-throw to maintain existing error handling behavior
    throw error;
  }
}
