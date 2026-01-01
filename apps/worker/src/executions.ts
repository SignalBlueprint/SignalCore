/**
 * Job execution tracking and storage
 */

import { storage } from "@sb/storage";
import type { JobExecution, JobExecutionStats } from "@sb/schemas";
import { getAlertManager } from "./alert-manager";

const JOB_EXECUTION_KIND = "job-executions";

/**
 * Generate a unique job execution ID
 */
function generateExecutionId(jobId: string): string {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 9);
  return `exec-${jobId}-${timestamp}-${randomId}`;
}

/**
 * Create a new job execution record (marks as running)
 */
export async function createJobExecution(params: {
  jobId: string;
  jobName: string;
  orgId?: string;
  input?: Record<string, unknown>;
}): Promise<JobExecution> {
  const now = new Date().toISOString();
  const execution: JobExecution = {
    id: generateExecutionId(params.jobId),
    jobId: params.jobId,
    jobName: params.jobName,
    orgId: params.orgId,
    status: "running",
    startedAt: now,
    input: params.input,
    createdAt: now,
    updatedAt: now,
  };

  await storage.upsert(JOB_EXECUTION_KIND, execution);
  return execution;
}

/**
 * Mark job execution as successful
 */
export async function markJobSuccess(params: {
  executionId: string;
  output?: Record<string, unknown>;
}): Promise<JobExecution> {
  const execution = await storage.get<JobExecution>(JOB_EXECUTION_KIND, params.executionId);
  if (!execution) {
    throw new Error(`Job execution ${params.executionId} not found`);
  }

  const now = new Date().toISOString();
  const startTime = new Date(execution.startedAt).getTime();
  const duration = Date.now() - startTime;

  const updatedExecution: JobExecution = {
    ...execution,
    status: "success",
    finishedAt: now,
    duration,
    output: params.output,
    updatedAt: now,
  };

  await storage.upsert(JOB_EXECUTION_KIND, updatedExecution);

  // Trigger alerts for successful execution (for performance monitoring)
  try {
    const alertManager = getAlertManager();
    await alertManager.onJobExecutionComplete(updatedExecution);
  } catch (error) {
    // Don't fail job execution if alerting fails
    console.error("Failed to process success alerts:", error);
  }

  return updatedExecution;
}

/**
 * Mark job execution as failed
 */
export async function markJobFailure(params: {
  executionId: string;
  error: string;
  output?: Record<string, unknown>;
}): Promise<JobExecution> {
  const execution = await storage.get<JobExecution>(JOB_EXECUTION_KIND, params.executionId);
  if (!execution) {
    throw new Error(`Job execution ${params.executionId} not found`);
  }

  const now = new Date().toISOString();
  const startTime = new Date(execution.startedAt).getTime();
  const duration = Date.now() - startTime;

  const updatedExecution: JobExecution = {
    ...execution,
    status: "failed",
    finishedAt: now,
    duration,
    error: params.error,
    output: params.output,
    updatedAt: now,
  };

  await storage.upsert(JOB_EXECUTION_KIND, updatedExecution);

  // Trigger alerts for failed execution
  try {
    const alertManager = getAlertManager();
    await alertManager.onJobExecutionComplete(updatedExecution);
  } catch (error) {
    // Don't fail job execution if alerting fails
    console.error("Failed to process failure alerts:", error);
  }

  return updatedExecution;
}

/**
 * Get job execution by ID
 */
export async function getJobExecution(executionId: string): Promise<JobExecution | null> {
  return storage.get<JobExecution>(JOB_EXECUTION_KIND, executionId);
}

/**
 * Get all job executions for a specific job
 */
export async function getJobExecutions(
  jobId: string,
  options?: { limit?: number; orgId?: string }
): Promise<JobExecution[]> {
  const allExecutions = await storage.list<JobExecution>(
    JOB_EXECUTION_KIND,
    (exec) => {
      if (exec.jobId !== jobId) return false;
      if (options?.orgId && exec.orgId !== options.orgId) return false;
      return true;
    }
  );

  // Sort by startedAt descending (most recent first)
  const sorted = allExecutions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  // Apply limit if specified
  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

/**
 * Get all job executions (across all jobs)
 */
export async function getAllJobExecutions(options?: {
  limit?: number;
  orgId?: string;
  status?: JobExecution["status"];
}): Promise<JobExecution[]> {
  const allExecutions = await storage.list<JobExecution>(
    JOB_EXECUTION_KIND,
    (exec) => {
      if (options?.orgId && exec.orgId !== options.orgId) return false;
      if (options?.status && exec.status !== options.status) return false;
      return true;
    }
  );

  // Sort by startedAt descending (most recent first)
  const sorted = allExecutions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  // Apply limit if specified
  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

/**
 * Get statistics for a specific job
 */
export async function getJobStats(jobId: string, orgId?: string): Promise<JobExecutionStats> {
  const executions = await getJobExecutions(jobId, { orgId });

  const totalRuns = executions.length;
  const successCount = executions.filter((e) => e.status === "success").length;
  const failureCount = executions.filter((e) => e.status === "failed").length;
  const timeoutCount = executions.filter((e) => e.status === "timeout").length;

  // Calculate average duration (only for completed jobs)
  const completedExecutions = executions.filter((e) => e.duration !== undefined);
  const averageDuration =
    completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
        completedExecutions.length
      : 0;

  const lastRun = executions[0]; // Most recent
  const lastSuccess = executions.find((e) => e.status === "success");
  const lastFailure = executions.find((e) => e.status === "failed");

  return {
    jobId,
    totalRuns,
    successCount,
    failureCount,
    timeoutCount,
    averageDuration,
    lastRun,
    lastSuccess,
    lastFailure,
  };
}

/**
 * Clean up old job executions (retention policy)
 */
export async function cleanupOldExecutions(retentionDays: number = 30): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
  const cutoffTimestamp = cutoffDate.getTime();

  const allExecutions = await storage.list<JobExecution>(JOB_EXECUTION_KIND);
  const toDelete = allExecutions.filter((exec) => {
    const execDate = new Date(exec.startedAt).getTime();
    return execDate < cutoffTimestamp;
  });

  for (const exec of toDelete) {
    await storage.remove(JOB_EXECUTION_KIND, exec.id);
  }

  return toDelete.length;
}
