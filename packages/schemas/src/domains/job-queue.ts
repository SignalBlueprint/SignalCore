/**
 * Advanced Job Queue schemas
 * Extends the basic job system with priority queues, dependencies, and advanced features
 */

/**
 * Job priority levels
 */
export type JobPriority = "critical" | "high" | "normal" | "low";

/**
 * Job queue status
 */
export type QueuedJobStatus =
  | "pending"      // Waiting to be processed
  | "ready"        // Dependencies met, ready to run
  | "running"      // Currently executing
  | "completed"    // Successfully finished
  | "failed"       // Failed execution
  | "cancelled"    // Manually cancelled
  | "delayed"      // Scheduled for future execution
  | "dead-letter"; // Moved to dead letter queue

/**
 * Queue operation modes
 */
export type QueueMode = "active" | "paused" | "draining";

/**
 * Queued job entry
 */
export interface QueuedJob {
  id: string;                          // Format: queue-{jobId}-{timestamp}-{randomId}
  jobId: string;                       // Job type identifier (e.g., "daily.questmaster")
  jobName: string;                     // Human-readable name
  status: QueuedJobStatus;
  priority: JobPriority;

  // Scheduling
  scheduledFor?: string;               // ISO timestamp - when to execute (null = ASAP)
  enqueuedAt: string;                  // When added to queue
  startedAt?: string;                  // When execution began
  completedAt?: string;                // When execution finished

  // Dependencies
  dependsOn?: string[];                // IDs of jobs that must complete first
  dependencyStatus?: {                 // Track dependency resolution
    [jobId: string]: "pending" | "completed" | "failed";
  };

  // Retry logic
  attempt: number;                     // Current attempt number (1-based)
  maxAttempts: number;                 // Maximum retry attempts
  retryDelay?: number;                 // Delay between retries (ms)
  retryBackoff?: "fixed" | "exponential" | "linear";
  lastAttemptAt?: string;              // When last attempt occurred

  // Execution constraints
  timeout?: number;                    // Max execution time (ms)
  concurrencyKey?: string;             // Groups jobs that share concurrency limits
  rateLimit?: {
    maxRuns: number;                   // Max runs per window
    windowMs: number;                  // Time window in milliseconds
  };

  // Data
  input?: Record<string, unknown>;     // Job input parameters
  output?: Record<string, unknown>;    // Job output/results
  error?: string;                      // Error message if failed
  errorStack?: string;                 // Full error stack trace

  // Metadata
  orgId?: string;                      // Organization context
  userId?: string;                     // User who queued the job
  tags?: string[];                     // Searchable tags
  metadata?: Record<string, unknown>;  // Custom metadata

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Dead letter queue entry - jobs that have permanently failed
 */
export interface DeadLetterJob {
  id: string;
  originalJobId: string;               // ID of the original queued job
  jobId: string;                       // Job type
  jobName: string;

  // Failure details
  failureReason: string;               // Why it was moved to DLQ
  attempts: number;                    // Total attempts made
  firstAttemptAt: string;
  lastAttemptAt: string;

  // Original job data
  input?: Record<string, unknown>;
  error?: string;
  errorStack?: string;

  // Dead letter metadata
  movedToDLQAt: string;
  canRetry: boolean;                   // Whether manual retry is allowed
  retryCount: number;                  // Number of times manually retried from DLQ

  // Metadata
  orgId?: string;
  tags?: string[];
  metadata?: Record<string, unknown>;

  createdAt: string;
  updatedAt: string;
}

/**
 * Queue statistics and health metrics
 */
export interface QueueStats {
  // Queue health
  mode: QueueMode;
  totalJobs: number;

  // Status breakdown
  pendingJobs: number;
  readyJobs: number;
  runningJobs: number;
  completedJobs: number;
  failedJobs: number;
  delayedJobs: number;
  deadLetterJobs: number;

  // Priority breakdown
  criticalJobs: number;
  highPriorityJobs: number;
  normalPriorityJobs: number;
  lowPriorityJobs: number;

  // Performance metrics
  averageWaitTime?: number;            // Average time from enqueue to start (ms)
  averageExecutionTime?: number;       // Average execution duration (ms)
  throughput?: number;                 // Jobs/hour
  successRate?: number;                // Percentage (0-100)

  // Resource usage
  activeWorkers: number;
  maxConcurrency: number;
  cpuUsage?: number;
  memoryUsage?: number;

  // Timestamps
  lastUpdated: string;
}

/**
 * Queue configuration
 */
export interface QueueConfig {
  // Concurrency settings
  maxConcurrency: number;              // Global max concurrent jobs
  concurrencyLimits?: {                // Per-concurrency-key limits
    [key: string]: number;
  };

  // Priority settings
  priorityWeights?: {                  // How often to process each priority
    critical: number;                  // Default: 50% (always first)
    high: number;                      // Default: 30%
    normal: number;                    // Default: 15%
    low: number;                       // Default: 5%
  };

  // Retry settings (defaults)
  defaultMaxAttempts: number;
  defaultRetryDelay: number;
  defaultRetryBackoff: "fixed" | "exponential" | "linear";
  defaultTimeout?: number;

  // Dead letter settings
  deadLetterEnabled: boolean;
  deadLetterThreshold: number;         // Attempts before moving to DLQ

  // Queue behavior
  mode: QueueMode;
  pausedAt?: string;
  drainingStartedAt?: string;

  // Rate limiting
  globalRateLimit?: {
    maxRuns: number;
    windowMs: number;
  };

  // Polling settings
  pollInterval: number;                // How often to check for ready jobs (ms)

  // Cleanup settings
  retentionDays: number;               // Days to keep completed jobs
  cleanupInterval: number;             // How often to run cleanup (ms)

  createdAt: string;
  updatedAt: string;
}

/**
 * Job dependency definition
 */
export interface JobDependency {
  jobId: string;                       // The job that has dependencies
  dependsOn: string[];                 // Jobs it depends on
  strategy: "all" | "any";             // All must complete or any one
  failureStrategy: "fail" | "skip" | "continue"; // What to do if dependency fails
}

/**
 * Queue operation event
 */
export interface QueueEvent {
  id: string;
  eventType: "enqueued" | "started" | "completed" | "failed" | "retry" | "dead-letter" | "cancelled";
  queuedJobId: string;
  jobId: string;
  timestamp: string;
  data?: Record<string, unknown>;
}

/**
 * Concurrency group tracking
 */
export interface ConcurrencyGroup {
  key: string;                         // Concurrency key
  limit: number;                       // Max concurrent jobs
  activeCount: number;                 // Currently running jobs
  queuedCount: number;                 // Waiting jobs
  jobs: string[];                      // Active job IDs
}
