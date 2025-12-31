/**
 * Job execution tracking schemas
 */

/**
 * Job execution record - tracks all job runs
 */
export interface JobExecution {
  id: string; // Format: exec-{jobId}-{timestamp}-{randomId}
  jobId: string; // e.g., "daily.questmaster", "weekly.sprintplanner", "github.sync"
  jobName: string; // Human-readable job name
  orgId?: string; // Optional org context (if job is org-specific)
  status: "running" | "success" | "failed" | "timeout";
  startedAt: string; // ISO timestamp
  finishedAt?: string; // ISO timestamp (undefined if still running)
  duration?: number; // Duration in milliseconds
  error?: string; // Error message if failed
  input?: Record<string, unknown>; // Input parameters passed to job
  output?: Record<string, unknown>; // Job-specific output/stats
  createdAt: string; // ISO timestamp
  updatedAt: string; // ISO timestamp
}

/**
 * Job execution statistics
 */
export interface JobExecutionStats {
  jobId: string;
  totalRuns: number;
  successCount: number;
  failureCount: number;
  timeoutCount: number;
  averageDuration: number; // in milliseconds
  lastRun?: JobExecution;
  lastSuccess?: JobExecution;
  lastFailure?: JobExecution;
}
