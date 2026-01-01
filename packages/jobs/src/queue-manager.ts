/**
 * Advanced Job Queue Manager
 * Handles priority queuing, dependencies, retries, and dead letter queue
 */

import { logger } from "@sb/logger";
import { storage } from "@sb/storage";
import { publish } from "@sb/events";
import type {
  QueuedJob,
  DeadLetterJob,
  QueueConfig,
  QueueStats,
  JobPriority,
  QueuedJobStatus,
  QueueMode,
  ConcurrencyGroup,
} from "@sb/schemas";
import { getJob } from "./index";

/**
 * Queue manager class
 */
export class QueueManager {
  private config: QueueConfig;
  private pollingInterval?: NodeJS.Timeout;
  private activeJobs = new Map<string, QueuedJob>();
  private concurrencyGroups = new Map<string, ConcurrencyGroup>();
  private rateLimitTracking = new Map<string, number[]>(); // jobId -> [timestamps]

  constructor(config?: Partial<QueueConfig>) {
    this.config = {
      maxConcurrency: config?.maxConcurrency ?? 5,
      concurrencyLimits: config?.concurrencyLimits ?? {},
      priorityWeights: config?.priorityWeights ?? {
        critical: 50,
        high: 30,
        normal: 15,
        low: 5,
      },
      defaultMaxAttempts: config?.defaultMaxAttempts ?? 3,
      defaultRetryDelay: config?.defaultRetryDelay ?? 5000,
      defaultRetryBackoff: config?.defaultRetryBackoff ?? "exponential",
      defaultTimeout: config?.defaultTimeout ?? 300000, // 5 minutes
      deadLetterEnabled: config?.deadLetterEnabled ?? true,
      deadLetterThreshold: config?.deadLetterThreshold ?? 5,
      mode: config?.mode ?? "active",
      pollInterval: config?.pollInterval ?? 1000, // 1 second
      retentionDays: config?.retentionDays ?? 7,
      cleanupInterval: config?.cleanupInterval ?? 3600000, // 1 hour
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Start the queue processor
   */
  async start(): Promise<void> {
    if (this.pollingInterval) {
      logger.warn("Queue manager already started");
      return;
    }

    logger.info("Starting advanced job queue manager", {
      maxConcurrency: this.config.maxConcurrency,
      mode: this.config.mode,
    });

    // Start polling for jobs
    this.pollingInterval = setInterval(() => {
      this.processQueue().catch((error) => {
        logger.error("Error processing queue", { error });
      });
    }, this.config.pollInterval);

    // Initial processing
    await this.processQueue();
  }

  /**
   * Stop the queue processor
   */
  async stop(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }

    logger.info("Stopped job queue manager");
  }

  /**
   * Enqueue a new job
   */
  async enqueue(options: {
    jobId: string;
    priority?: JobPriority;
    input?: Record<string, unknown>;
    scheduledFor?: Date;
    dependsOn?: string[];
    maxAttempts?: number;
    retryDelay?: number;
    retryBackoff?: "fixed" | "exponential" | "linear";
    timeout?: number;
    concurrencyKey?: string;
    rateLimit?: { maxRuns: number; windowMs: number };
    orgId?: string;
    userId?: string;
    tags?: string[];
    metadata?: Record<string, unknown>;
  }): Promise<QueuedJob> {
    const job = getJob(options.jobId);
    if (!job) {
      throw new Error(`Job "${options.jobId}" not found in registry`);
    }

    // Check if rate limited
    if (options.rateLimit) {
      const canRun = await this.checkRateLimit(options.jobId, options.rateLimit);
      if (!canRun) {
        throw new Error(
          `Job "${options.jobId}" is rate limited (${options.rateLimit.maxRuns} runs per ${options.rateLimit.windowMs}ms)`
        );
      }
    }

    const now = new Date().toISOString();
    const id = `queue-${options.jobId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const queuedJob: QueuedJob = {
      id,
      jobId: options.jobId,
      jobName: job.name,
      status: options.scheduledFor ? "delayed" : options.dependsOn ? "pending" : "ready",
      priority: options.priority ?? "normal",
      scheduledFor: options.scheduledFor?.toISOString(),
      enqueuedAt: now,
      dependsOn: options.dependsOn,
      dependencyStatus: options.dependsOn?.reduce(
        (acc, depId) => {
          acc[depId] = "pending";
          return acc;
        },
        {} as Record<string, "pending" | "completed" | "failed">
      ),
      attempt: 0,
      maxAttempts: options.maxAttempts ?? this.config.defaultMaxAttempts,
      retryDelay: options.retryDelay ?? this.config.defaultRetryDelay,
      retryBackoff: options.retryBackoff ?? this.config.defaultRetryBackoff,
      timeout: options.timeout ?? this.config.defaultTimeout,
      concurrencyKey: options.concurrencyKey,
      rateLimit: options.rateLimit,
      input: options.input,
      orgId: options.orgId,
      userId: options.userId,
      tags: options.tags,
      metadata: options.metadata,
      createdAt: now,
      updatedAt: now,
    };

    // Save to storage
    await storage.create("queued-jobs", queuedJob);

    // Publish event
    await publish("queue.enqueued", {
      queuedJobId: id,
      jobId: options.jobId,
      priority: queuedJob.priority,
      status: queuedJob.status,
    }, { sourceApp: "worker" });

    logger.info(`Enqueued job: ${job.name} (${id})`, {
      priority: queuedJob.priority,
      status: queuedJob.status,
      scheduledFor: queuedJob.scheduledFor,
    });

    return queuedJob;
  }

  /**
   * Process the queue - find and execute ready jobs
   */
  private async processQueue(): Promise<void> {
    // Skip if not in active mode
    if (this.config.mode === "paused") {
      return;
    }

    // Check concurrency limit
    const activeCount = this.activeJobs.size;
    if (activeCount >= this.config.maxConcurrency) {
      return;
    }

    // Get ready jobs sorted by priority
    const readyJobs = await this.getReadyJobs(this.config.maxConcurrency - activeCount);

    for (const queuedJob of readyJobs) {
      // Check concurrency key limits
      if (queuedJob.concurrencyKey) {
        const canRun = this.checkConcurrencyLimit(queuedJob);
        if (!canRun) {
          continue;
        }
      }

      // Execute the job
      this.executeJob(queuedJob).catch((error) => {
        logger.error("Error executing job", {
          queuedJobId: queuedJob.id,
          error,
        });
      });
    }

    // In draining mode, stop when all jobs are done
    if (this.config.mode === "draining" && this.activeJobs.size === 0) {
      const stats = await this.getStats();
      if (stats.readyJobs === 0 && stats.pendingJobs === 0 && stats.delayedJobs === 0) {
        await this.stop();
        logger.info("Queue drained, stopped processing");
      }
    }
  }

  /**
   * Get ready jobs sorted by priority
   */
  private async getReadyJobs(limit: number): Promise<QueuedJob[]> {
    const now = new Date().toISOString();

    // Get all jobs that are ready or delayed and due
    const allJobs = await storage.list<QueuedJob>("queued-jobs", {
      limit: 1000, // Get more than needed for filtering
    });

    const readyJobs = allJobs.data.filter((job) => {
      // Must be ready status OR delayed and past scheduled time
      if (job.status === "ready") {
        return true;
      }
      if (job.status === "delayed" && job.scheduledFor && job.scheduledFor <= now) {
        return true;
      }
      return false;
    });

    // Sort by priority (weighted random selection)
    const sorted = this.sortByPriority(readyJobs);

    return sorted.slice(0, limit);
  }

  /**
   * Sort jobs by priority using weighted random selection
   */
  private sortByPriority(jobs: QueuedJob[]): QueuedJob[] {
    const weights = this.config.priorityWeights!;
    const priorityGroups: Record<JobPriority, QueuedJob[]> = {
      critical: [],
      high: [],
      normal: [],
      low: [],
    };

    // Group by priority
    for (const job of jobs) {
      priorityGroups[job.priority].push(job);
    }

    // Sort each group by enqueue time (FIFO within priority)
    for (const priority of Object.keys(priorityGroups) as JobPriority[]) {
      priorityGroups[priority].sort(
        (a, b) => new Date(a.enqueuedAt).getTime() - new Date(b.enqueuedAt).getTime()
      );
    }

    // Weighted interleaving
    const result: QueuedJob[] = [];
    const totalWeight = weights.critical + weights.high + weights.normal + weights.low;

    // Calculate how many from each priority (proportional)
    while (
      priorityGroups.critical.length > 0 ||
      priorityGroups.high.length > 0 ||
      priorityGroups.normal.length > 0 ||
      priorityGroups.low.length > 0
    ) {
      // Critical (highest weight)
      const criticalCount = Math.ceil((weights.critical / totalWeight) * 10);
      for (let i = 0; i < criticalCount && priorityGroups.critical.length > 0; i++) {
        result.push(priorityGroups.critical.shift()!);
      }

      // High
      const highCount = Math.ceil((weights.high / totalWeight) * 10);
      for (let i = 0; i < highCount && priorityGroups.high.length > 0; i++) {
        result.push(priorityGroups.high.shift()!);
      }

      // Normal
      const normalCount = Math.ceil((weights.normal / totalWeight) * 10);
      for (let i = 0; i < normalCount && priorityGroups.normal.length > 0; i++) {
        result.push(priorityGroups.normal.shift()!);
      }

      // Low
      const lowCount = Math.ceil((weights.low / totalWeight) * 10);
      for (let i = 0; i < lowCount && priorityGroups.low.length > 0; i++) {
        result.push(priorityGroups.low.shift()!);
      }
    }

    return result;
  }

  /**
   * Execute a queued job
   */
  private async executeJob(queuedJob: QueuedJob): Promise<void> {
    const job = getJob(queuedJob.jobId);
    if (!job) {
      logger.error(`Job "${queuedJob.jobId}" not found in registry`);
      return;
    }

    // Track as active
    this.activeJobs.set(queuedJob.id, queuedJob);

    // Update concurrency tracking
    if (queuedJob.concurrencyKey) {
      this.incrementConcurrency(queuedJob);
    }

    // Update rate limit tracking
    if (queuedJob.rateLimit) {
      this.trackRateLimit(queuedJob.jobId);
    }

    // Update status to running
    queuedJob.status = "running";
    queuedJob.attempt += 1;
    queuedJob.startedAt = new Date().toISOString();
    queuedJob.lastAttemptAt = queuedJob.startedAt;
    queuedJob.updatedAt = queuedJob.startedAt;

    await storage.update("queued-jobs", queuedJob.id, queuedJob);

    // Publish event
    await publish("queue.started", {
      queuedJobId: queuedJob.id,
      jobId: queuedJob.jobId,
      attempt: queuedJob.attempt,
    }, { sourceApp: "worker" });

    logger.info(`Executing job: ${job.name} (${queuedJob.id})`, {
      attempt: queuedJob.attempt,
      maxAttempts: queuedJob.maxAttempts,
    });

    const startTime = Date.now();
    let executionError: Error | undefined;

    try {
      // Execute with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Job execution timeout")), queuedJob.timeout);
      });

      const jobPromise = job.run({
        logger,
        events: { publish },
        telemetry: { getState: () => ({ events: [], metrics: {} }) },
        now: new Date(),
        input: queuedJob.input,
      });

      await Promise.race([jobPromise, timeoutPromise]);

      // Success!
      const duration = Date.now() - startTime;
      queuedJob.status = "completed";
      queuedJob.completedAt = new Date().toISOString();
      queuedJob.updatedAt = queuedJob.completedAt;

      await storage.update("queued-jobs", queuedJob.id, queuedJob);

      await publish("queue.completed", {
        queuedJobId: queuedJob.id,
        jobId: queuedJob.jobId,
        duration,
        attempt: queuedJob.attempt,
      }, { sourceApp: "worker" });

      logger.info(`Completed job: ${job.name} (${queuedJob.id}) in ${duration}ms`);

      // Update dependent jobs
      await this.resolveDependencies(queuedJob.id, "completed");
    } catch (error) {
      executionError = error instanceof Error ? error : new Error(String(error));
      const duration = Date.now() - startTime;

      logger.error(`Failed job: ${job.name} (${queuedJob.id}) after ${duration}ms`, {
        error: executionError.message,
        attempt: queuedJob.attempt,
        maxAttempts: queuedJob.maxAttempts,
      });

      // Check if should retry
      if (queuedJob.attempt < queuedJob.maxAttempts) {
        // Schedule retry
        await this.scheduleRetry(queuedJob, executionError);
      } else if (this.config.deadLetterEnabled && queuedJob.attempt >= this.config.deadLetterThreshold) {
        // Move to dead letter queue
        await this.moveToDeadLetter(queuedJob, executionError);
      } else {
        // Permanent failure
        queuedJob.status = "failed";
        queuedJob.error = executionError.message;
        queuedJob.errorStack = executionError.stack;
        queuedJob.completedAt = new Date().toISOString();
        queuedJob.updatedAt = queuedJob.completedAt;

        await storage.update("queued-jobs", queuedJob.id, queuedJob);

        await publish("queue.failed", {
          queuedJobId: queuedJob.id,
          jobId: queuedJob.jobId,
          error: executionError.message,
          attempt: queuedJob.attempt,
        }, { sourceApp: "worker" });

        // Update dependent jobs
        await this.resolveDependencies(queuedJob.id, "failed");
      }
    } finally {
      // Remove from active tracking
      this.activeJobs.delete(queuedJob.id);

      // Update concurrency tracking
      if (queuedJob.concurrencyKey) {
        this.decrementConcurrency(queuedJob);
      }
    }
  }

  /**
   * Schedule a retry for a failed job
   */
  private async scheduleRetry(queuedJob: QueuedJob, error: Error): Promise<void> {
    let delay = queuedJob.retryDelay ?? this.config.defaultRetryDelay;

    // Apply backoff strategy
    if (queuedJob.retryBackoff === "exponential") {
      delay = delay * Math.pow(2, queuedJob.attempt - 1);
    } else if (queuedJob.retryBackoff === "linear") {
      delay = delay * queuedJob.attempt;
    }

    const scheduledFor = new Date(Date.now() + delay);

    queuedJob.status = "delayed";
    queuedJob.scheduledFor = scheduledFor.toISOString();
    queuedJob.error = error.message;
    queuedJob.errorStack = error.stack;
    queuedJob.updatedAt = new Date().toISOString();

    await storage.update("queued-jobs", queuedJob.id, queuedJob);

    await publish("queue.retry", {
      queuedJobId: queuedJob.id,
      jobId: queuedJob.jobId,
      attempt: queuedJob.attempt,
      nextAttempt: queuedJob.attempt + 1,
      scheduledFor: queuedJob.scheduledFor,
      delay,
    }, { sourceApp: "worker" });

    logger.info(`Scheduled retry for job: ${queuedJob.jobName} (${queuedJob.id})`, {
      attempt: queuedJob.attempt,
      nextAttempt: queuedJob.attempt + 1,
      delay,
      scheduledFor: queuedJob.scheduledFor,
    });
  }

  /**
   * Move a job to the dead letter queue
   */
  private async moveToDeadLetter(queuedJob: QueuedJob, error: Error): Promise<void> {
    const now = new Date().toISOString();

    const deadLetterJob: DeadLetterJob = {
      id: `dlq-${queuedJob.id}`,
      originalJobId: queuedJob.id,
      jobId: queuedJob.jobId,
      jobName: queuedJob.jobName,
      failureReason: `Failed after ${queuedJob.attempt} attempts: ${error.message}`,
      attempts: queuedJob.attempt,
      firstAttemptAt: queuedJob.enqueuedAt,
      lastAttemptAt: queuedJob.lastAttemptAt ?? now,
      input: queuedJob.input,
      error: error.message,
      errorStack: error.stack,
      movedToDLQAt: now,
      canRetry: true,
      retryCount: 0,
      orgId: queuedJob.orgId,
      tags: queuedJob.tags,
      metadata: queuedJob.metadata,
      createdAt: now,
      updatedAt: now,
    };

    await storage.create("dead-letter-jobs", deadLetterJob);

    // Update original job
    queuedJob.status = "dead-letter";
    queuedJob.error = error.message;
    queuedJob.errorStack = error.stack;
    queuedJob.completedAt = now;
    queuedJob.updatedAt = now;

    await storage.update("queued-jobs", queuedJob.id, queuedJob);

    await publish("queue.dead-letter", {
      queuedJobId: queuedJob.id,
      jobId: queuedJob.jobId,
      deadLetterJobId: deadLetterJob.id,
      attempts: queuedJob.attempt,
    }, { sourceApp: "worker" });

    logger.warn(`Moved job to dead letter queue: ${queuedJob.jobName} (${queuedJob.id})`, {
      attempts: queuedJob.attempt,
      deadLetterJobId: deadLetterJob.id,
    });

    // Update dependent jobs
    await this.resolveDependencies(queuedJob.id, "failed");
  }

  /**
   * Resolve dependencies for jobs that depend on this one
   */
  private async resolveDependencies(
    completedJobId: string,
    status: "completed" | "failed"
  ): Promise<void> {
    // Find all jobs that depend on this one
    const allJobs = await storage.list<QueuedJob>("queued-jobs", { limit: 1000 });
    const dependentJobs = allJobs.data.filter(
      (job) => job.dependsOn?.includes(completedJobId) && job.status === "pending"
    );

    for (const job of dependentJobs) {
      if (!job.dependencyStatus) continue;

      // Update dependency status
      job.dependencyStatus[completedJobId] = status;

      // Check if all dependencies are met
      const allCompleted = Object.values(job.dependencyStatus).every((s) => s === "completed");
      const anyFailed = Object.values(job.dependencyStatus).some((s) => s === "failed");

      if (allCompleted) {
        // All dependencies met, mark as ready
        job.status = "ready";
        job.updatedAt = new Date().toISOString();
        await storage.update("queued-jobs", job.id, job);
        logger.info(`Job ready after dependencies met: ${job.jobName} (${job.id})`);
      } else if (anyFailed) {
        // A dependency failed, mark this job as failed too
        job.status = "failed";
        job.error = `Dependency failed: ${completedJobId}`;
        job.completedAt = new Date().toISOString();
        job.updatedAt = job.completedAt;
        await storage.update("queued-jobs", job.id, job);
        logger.warn(`Job failed due to dependency failure: ${job.jobName} (${job.id})`);

        // Cascade to its dependents
        await this.resolveDependencies(job.id, "failed");
      }
    }
  }

  /**
   * Check concurrency limit for a job
   */
  private checkConcurrencyLimit(queuedJob: QueuedJob): boolean {
    if (!queuedJob.concurrencyKey) return true;

    const group = this.concurrencyGroups.get(queuedJob.concurrencyKey);
    if (!group) return true;

    const limit = this.config.concurrencyLimits?.[queuedJob.concurrencyKey] ?? Infinity;
    return group.activeCount < limit;
  }

  /**
   * Increment concurrency counter
   */
  private incrementConcurrency(queuedJob: QueuedJob): void {
    if (!queuedJob.concurrencyKey) return;

    let group = this.concurrencyGroups.get(queuedJob.concurrencyKey);
    if (!group) {
      const limit = this.config.concurrencyLimits?.[queuedJob.concurrencyKey] ?? Infinity;
      group = {
        key: queuedJob.concurrencyKey,
        limit,
        activeCount: 0,
        queuedCount: 0,
        jobs: [],
      };
      this.concurrencyGroups.set(queuedJob.concurrencyKey, group);
    }

    group.activeCount++;
    group.jobs.push(queuedJob.id);
  }

  /**
   * Decrement concurrency counter
   */
  private decrementConcurrency(queuedJob: QueuedJob): void {
    if (!queuedJob.concurrencyKey) return;

    const group = this.concurrencyGroups.get(queuedJob.concurrencyKey);
    if (!group) return;

    group.activeCount--;
    group.jobs = group.jobs.filter((id) => id !== queuedJob.id);

    if (group.activeCount === 0) {
      this.concurrencyGroups.delete(queuedJob.concurrencyKey);
    }
  }

  /**
   * Check if job is rate limited
   */
  private async checkRateLimit(
    jobId: string,
    rateLimit: { maxRuns: number; windowMs: number }
  ): Promise<boolean> {
    const now = Date.now();
    const timestamps = this.rateLimitTracking.get(jobId) ?? [];

    // Remove old timestamps outside the window
    const validTimestamps = timestamps.filter((ts) => now - ts < rateLimit.windowMs);

    // Check if we're at the limit
    return validTimestamps.length < rateLimit.maxRuns;
  }

  /**
   * Track rate limit execution
   */
  private trackRateLimit(jobId: string): void {
    const now = Date.now();
    const timestamps = this.rateLimitTracking.get(jobId) ?? [];
    timestamps.push(now);
    this.rateLimitTracking.set(jobId, timestamps);
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<void> {
    this.config.mode = "paused";
    this.config.pausedAt = new Date().toISOString();
    this.config.updatedAt = this.config.pausedAt;

    logger.info("Queue paused");

    await publish("queue.paused", {}, { sourceApp: "worker" });
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<void> {
    this.config.mode = "active";
    this.config.pausedAt = undefined;
    this.config.updatedAt = new Date().toISOString();

    logger.info("Queue resumed");

    await publish("queue.resumed", {}, { sourceApp: "worker" });
  }

  /**
   * Drain the queue (finish existing jobs but don't accept new ones)
   */
  async drain(): Promise<void> {
    this.config.mode = "draining";
    this.config.drainingStartedAt = new Date().toISOString();
    this.config.updatedAt = this.config.drainingStartedAt;

    logger.info("Queue draining (will stop after all jobs complete)");

    await publish("queue.draining", {}, { sourceApp: "worker" });
  }

  /**
   * Cancel a queued job
   */
  async cancel(queuedJobId: string): Promise<void> {
    const job = await storage.get<QueuedJob>("queued-jobs", queuedJobId);
    if (!job) {
      throw new Error(`Queued job "${queuedJobId}" not found`);
    }

    if (job.status === "running") {
      throw new Error("Cannot cancel a running job");
    }

    job.status = "cancelled";
    job.completedAt = new Date().toISOString();
    job.updatedAt = job.completedAt;

    await storage.update("queued-jobs", queuedJobId, job);

    await publish("queue.cancelled", {
      queuedJobId,
      jobId: job.jobId,
    }, { sourceApp: "worker" });

    logger.info(`Cancelled job: ${job.jobName} (${queuedJobId})`);

    // Update dependents
    await this.resolveDependencies(queuedJobId, "failed");
  }

  /**
   * Retry a job from the dead letter queue
   */
  async retryDeadLetter(deadLetterJobId: string): Promise<QueuedJob> {
    const dlJob = await storage.get<DeadLetterJob>("dead-letter-jobs", deadLetterJobId);
    if (!dlJob) {
      throw new Error(`Dead letter job "${deadLetterJobId}" not found`);
    }

    if (!dlJob.canRetry) {
      throw new Error("This job cannot be retried");
    }

    // Create a new queued job
    const newQueuedJob = await this.enqueue({
      jobId: dlJob.jobId,
      priority: "high", // Give retried jobs higher priority
      input: dlJob.input,
      orgId: dlJob.orgId,
      tags: dlJob.tags,
      metadata: {
        ...dlJob.metadata,
        retriedFromDLQ: true,
        originalJobId: dlJob.originalJobId,
      },
    });

    // Update DLQ entry
    dlJob.retryCount++;
    dlJob.updatedAt = new Date().toISOString();
    await storage.update("dead-letter-jobs", deadLetterJobId, dlJob);

    logger.info(`Retried job from DLQ: ${dlJob.jobName} (${deadLetterJobId})`, {
      newQueuedJobId: newQueuedJob.id,
    });

    return newQueuedJob;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const [queuedJobs, deadLetterJobs] = await Promise.all([
      storage.list<QueuedJob>("queued-jobs", { limit: 10000 }),
      storage.list<DeadLetterJob>("dead-letter-jobs", { limit: 10000 }),
    ]);

    const stats: QueueStats = {
      mode: this.config.mode,
      totalJobs: queuedJobs.data.length,
      pendingJobs: queuedJobs.data.filter((j) => j.status === "pending").length,
      readyJobs: queuedJobs.data.filter((j) => j.status === "ready").length,
      runningJobs: queuedJobs.data.filter((j) => j.status === "running").length,
      completedJobs: queuedJobs.data.filter((j) => j.status === "completed").length,
      failedJobs: queuedJobs.data.filter((j) => j.status === "failed").length,
      delayedJobs: queuedJobs.data.filter((j) => j.status === "delayed").length,
      deadLetterJobs: deadLetterJobs.data.length,
      criticalJobs: queuedJobs.data.filter((j) => j.priority === "critical").length,
      highPriorityJobs: queuedJobs.data.filter((j) => j.priority === "high").length,
      normalPriorityJobs: queuedJobs.data.filter((j) => j.priority === "normal").length,
      lowPriorityJobs: queuedJobs.data.filter((j) => j.priority === "low").length,
      activeWorkers: this.activeJobs.size,
      maxConcurrency: this.config.maxConcurrency,
      lastUpdated: new Date().toISOString(),
    };

    // Calculate performance metrics
    const completedJobs = queuedJobs.data.filter((j) => j.status === "completed");
    if (completedJobs.length > 0) {
      const waitTimes = completedJobs
        .filter((j) => j.startedAt)
        .map((j) => new Date(j.startedAt!).getTime() - new Date(j.enqueuedAt).getTime());
      const execTimes = completedJobs
        .filter((j) => j.startedAt && j.completedAt)
        .map(
          (j) => new Date(j.completedAt!).getTime() - new Date(j.startedAt!).getTime()
        );

      if (waitTimes.length > 0) {
        stats.averageWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
      }
      if (execTimes.length > 0) {
        stats.averageExecutionTime = execTimes.reduce((a, b) => a + b, 0) / execTimes.length;
      }

      const totalJobs = stats.completedJobs + stats.failedJobs;
      if (totalJobs > 0) {
        stats.successRate = (stats.completedJobs / totalJobs) * 100;
      }
    }

    return stats;
  }

  /**
   * Get configuration
   */
  getConfig(): QueueConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<QueueConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Singleton instance
 */
let queueManagerInstance: QueueManager | undefined;

/**
 * Get or create queue manager instance
 */
export function getQueueManager(config?: Partial<QueueConfig>): QueueManager {
  if (!queueManagerInstance) {
    queueManagerInstance = new QueueManager(config);
  }
  return queueManagerInstance;
}
