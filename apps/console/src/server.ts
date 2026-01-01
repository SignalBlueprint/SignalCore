/**
 * Console Server - Suite hub UI
 */

// Load environment variables from root .env file
// This is done automatically via @sb/config, but we import it here to ensure it loads
import "@sb/config";

import express from "express";
import * as path from "path";
import { SUITE_APPS, getSuiteApp } from "@sb/suite";
import { readEvents } from "@sb/events";
import { getTelemetryState } from "@sb/telemetry";
import type { Member, JobExecution, QueuedJob, DeadLetterJob, JobPriority } from "@sb/schemas";
import authRouter from "./routes/auth";
import teamRouter from "./routes/team";
import { getJobs, getQueueManager } from "@sb/jobs";
import { storage } from "@sb/storage";
import { seedTeamMembers } from "./seed";

const app = express();
const suiteApp = getSuiteApp("console");
const PORT = Number(process.env.PORT ?? suiteApp.defaultPort);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// API Routes

// Authentication routes
app.use("/api/auth", authRouter);

// Team member routes
app.use("/api/team", teamRouter);

// Get suite apps
app.get("/api/apps", (req, res) => {
  res.json(SUITE_APPS);
});

app.get(suiteApp.routes.health, (req, res) => {
  res.status(200).json({ status: "ok", app: suiteApp.id });
});

// Get latest events (last 200)
app.get("/api/events", (req, res) => {
  try {
    const events = readEvents(200);
    res.json(events);
  } catch (error) {
    console.error("Error reading events:", error);
    res.status(500).json({ error: "Failed to read events" });
  }
});

// Get telemetry state
app.get("/api/telemetry", (req, res) => {
  try {
    const state = getTelemetryState();
    res.json(state);
  } catch (error) {
    console.error("Error getting telemetry:", error);
    res.status(500).json({ error: "Failed to get telemetry" });
  }
});


// Get system health for all suite apps
app.get("/api/health", async (req, res) => {
  try {
    const healthChecks = await Promise.all(
      SUITE_APPS.map(async (suiteApp) => {
        try {
          const response = await fetch(
            `http://localhost:${suiteApp.defaultPort}${suiteApp.routes.health}`,
            { signal: AbortSignal.timeout(2000) }
          );
          const isHealthy = response.ok;
          return {
            id: suiteApp.id,
            name: suiteApp.name,
            status: isHealthy ? "online" : "offline",
            port: suiteApp.defaultPort,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          return {
            id: suiteApp.id,
            name: suiteApp.name,
            status: "offline",
            port: suiteApp.defaultPort,
            lastChecked: new Date().toISOString()
          };
        }
      })
    );
    res.json(healthChecks);
  } catch (error) {
    console.error("Error checking health:", error);
    res.status(500).json({ error: "Failed to check health" });
  }
});

// Get quick stats for dashboard
app.get("/api/dashboard/stats", (req, res) => {
  try {
    const events = readEvents(50);
    const telemetry = getTelemetryState();

    const stats = {
      totalEvents: events.length,
      recentEventsCount: events.filter((e) =>
        new Date(e.createdAt).getTime() > Date.now() - 3600000
      ).length,
      totalAICalls: telemetry.totalCalls,
      totalCost: telemetry.totalCost,
      cacheHitRate: telemetry.totalCalls > 0
        ? ((telemetry.cachedCalls / telemetry.totalCalls) * 100).toFixed(1)
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

// Get active quests summary for the console dashboard (game-like view)
app.get("/api/quests/active", async (req, res) => {
  try {
    const questboardBaseUrl = `http://localhost:${getSuiteApp("questboard").defaultPort}`;

    // Fetch active questlines from questboard
    const questlinesResponse = await fetch(`${questboardBaseUrl}/api/questlines?orgId=default-org`);
    if (!questlinesResponse.ok) {
      throw new Error(`Failed to fetch questlines: ${questlinesResponse.statusText}`);
    }
    const questlines = await questlinesResponse.json();

    // Fetch all quests for these questlines
    const questPromises = questlines.map(async (ql: any) => {
      const questsResponse = await fetch(`${questboardBaseUrl}/api/questlines/${ql.id}/quests`);
      if (!questsResponse.ok) return [];
      return await questsResponse.json();
    });
    const questsArrays = await Promise.all(questPromises);
    const allQuests = questsArrays.flat();

    // Fetch tasks for all quests to calculate progress
    const taskPromises = allQuests.map(async (quest: any) => {
      const tasksResponse = await fetch(`${questboardBaseUrl}/api/quests/${quest.id}/tasks`);
      if (!tasksResponse.ok) return { questId: quest.id, tasks: [] };
      const tasks = await tasksResponse.json();
      return { questId: quest.id, tasks };
    });
    const tasksByQuest = await Promise.all(taskPromises);
    const taskMap = new Map(tasksByQuest.map(t => [t.questId, t.tasks]));

    // Build quest summary with progress
    const questSummary = questlines.map((ql: any) => {
      const questlineQuests = allQuests.filter((q: any) => q.questlineId === ql.id);

      const questProgress = questlineQuests.map((quest: any) => {
        const tasks = taskMap.get(quest.id) || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
        const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress').length;

        return {
          id: quest.id,
          title: quest.title,
          objective: quest.objective,
          state: quest.state,
          totalTasks,
          completedTasks,
          inProgressTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          unlockedAt: quest.unlockedAt,
          completedAt: quest.completedAt,
        };
      });

      const totalQuestlineTasks = questProgress.reduce((sum, q) => sum + q.totalTasks, 0);
      const completedQuestlineTasks = questProgress.reduce((sum, q) => sum + q.completedTasks, 0);

      return {
        id: ql.id,
        title: ql.title,
        description: ql.description,
        epic: ql.epic,
        owner: ql.owner,
        assignmentReason: ql.assignmentReason,
        quests: questProgress,
        totalTasks: totalQuestlineTasks,
        completedTasks: completedQuestlineTasks,
        progress: totalQuestlineTasks > 0 ? Math.round((completedQuestlineTasks / totalQuestlineTasks) * 100) : 0,
      };
    });

    res.json({
      questlines: questSummary,
      totalQuestlines: questlines.length,
      activeQuests: allQuests.filter((q: any) => q.state === 'unlocked' || q.state === 'in-progress').length,
      completedQuests: allQuests.filter((q: any) => q.state === 'completed').length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching active quests:", error);
    res.status(500).json({ error: "Failed to fetch active quests" });
  }
});

// Worker Job Monitoring endpoints
const JOB_EXECUTION_KIND = "job-executions";

// Helper: Get all job executions
async function getAllJobExecutions(options?: {
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

  const sorted = allExecutions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

// Helper: Get job executions for a specific job
async function getJobExecutions(
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

  const sorted = allExecutions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

// Helper: Get job stats
async function getJobStats(jobId: string, orgId?: string) {
  const executions = await getJobExecutions(jobId, { orgId });

  const totalRuns = executions.length;
  const successCount = executions.filter((e) => e.status === "success").length;
  const failureCount = executions.filter((e) => e.status === "failed").length;
  const timeoutCount = executions.filter((e) => e.status === "timeout").length;

  const completedExecutions = executions.filter((e) => e.duration !== undefined);
  const averageDuration =
    completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
        completedExecutions.length
      : 0;

  const lastRun = executions[0];
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

app.get("/api/worker/jobs", (req, res) => {
  try {
    const jobs = getJobs();
    res.json(jobs.map((job) => ({
      id: job.id,
      name: job.name,
      scheduleHint: job.scheduleHint,
    })));
  } catch (error) {
    console.error("Error getting worker jobs:", error);
    res.status(500).json({ error: "Failed to get worker jobs" });
  }
});

app.get("/api/worker/executions", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const status = req.query.status as "running" | "success" | "failed" | "timeout" | undefined;
    const orgId = req.query.orgId as string | undefined;

    const executions = await getAllJobExecutions({ limit, status, orgId });
    res.json(executions);
  } catch (error) {
    console.error("Error getting worker executions:", error);
    res.status(500).json({ error: "Failed to get worker executions" });
  }
});

app.get("/api/worker/executions/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const orgId = req.query.orgId as string | undefined;

    const executions = await getJobExecutions(jobId, { limit, orgId });
    res.json(executions);
  } catch (error) {
    console.error("Error getting job executions:", error);
    res.status(500).json({ error: "Failed to get job executions" });
  }
});

app.get("/api/worker/stats/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const orgId = req.query.orgId as string | undefined;

    const stats = await getJobStats(jobId, orgId);
    res.json(stats);
  } catch (error) {
    console.error("Error getting job stats:", error);
    res.status(500).json({ error: "Failed to get job stats" });
  }
});

app.get("/api/worker/overview", async (req, res) => {
  try {
    const jobs = getJobs();
    const recentExecutions = await getAllJobExecutions({ limit: 100 });

    // Calculate overview stats
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentExecs = recentExecutions.filter(
      (e) => new Date(e.startedAt).getTime() > last24Hours
    );

    const totalJobs = jobs.length;
    const totalExecutions = recentExecs.length;
    const successCount = recentExecs.filter((e) => e.status === "success").length;
    const failureCount = recentExecs.filter((e) => e.status === "failed").length;
    const runningCount = recentExecs.filter((e) => e.status === "running").length;
    const successRate = totalExecutions > 0
      ? ((successCount / totalExecutions) * 100).toFixed(1)
      : "0";

    // Get stats for each job
    const jobStatsPromises = jobs.map(async (job) => {
      try {
        const stats = await getJobStats(job.id);
        const recentJobExecs = recentExecs.filter((e) => e.jobId === job.id);
        return {
          jobId: job.id,
          jobName: job.name,
          totalRuns: stats.totalRuns,
          successCount: stats.successCount,
          failureCount: stats.failureCount,
          averageDuration: Math.round(stats.averageDuration),
          lastRun: stats.lastRun,
          recentRuns24h: recentJobExecs.length,
        };
      } catch (error) {
        return {
          jobId: job.id,
          jobName: job.name,
          totalRuns: 0,
          successCount: 0,
          failureCount: 0,
          averageDuration: 0,
          lastRun: null,
          recentRuns24h: 0,
        };
      }
    });

    const jobStats = await Promise.all(jobStatsPromises);

    res.json({
      overview: {
        totalJobs,
        totalExecutions24h: totalExecutions,
        successCount,
        failureCount,
        runningCount,
        successRate,
      },
      jobs: jobStats,
      recentExecutions: recentExecutions.slice(0, 10),
    });
  } catch (error) {
    console.error("Error getting worker overview:", error);
    res.status(500).json({ error: "Failed to get worker overview" });
  }
});

// ========================================
// Advanced Queue API Endpoints
// ========================================

// Get queue status and statistics
app.get("/api/queue/status", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    const stats = await queueManager.getStats();
    const config = queueManager.getConfig();

    res.json({
      config: {
        mode: config.mode,
        maxConcurrency: config.maxConcurrency,
        concurrencyLimits: config.concurrencyLimits,
        priorityWeights: config.priorityWeights,
        deadLetterEnabled: config.deadLetterEnabled,
        pausedAt: config.pausedAt,
        drainingStartedAt: config.drainingStartedAt,
      },
      stats,
    });
  } catch (error) {
    console.error("Error getting queue status:", error);
    res.status(500).json({ error: "Failed to get queue status" });
  }
});

// Get all queued jobs
app.get("/api/queue/jobs", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as JobPriority | undefined;
    const orgId = req.query.orgId as string | undefined;

    const allJobs = await storage.list<QueuedJob>("queued-jobs", { limit: 1000 });
    let jobs = allJobs.data;

    // Apply filters
    if (status) {
      jobs = jobs.filter((j) => j.status === status);
    }
    if (priority) {
      jobs = jobs.filter((j) => j.priority === priority);
    }
    if (orgId) {
      jobs = jobs.filter((j) => j.orgId === orgId);
    }

    // Sort by enqueued time (most recent first)
    jobs.sort((a, b) => new Date(b.enqueuedAt).getTime() - new Date(a.enqueuedAt).getTime());

    // Apply limit
    jobs = jobs.slice(0, limit);

    res.json(jobs);
  } catch (error) {
    console.error("Error getting queued jobs:", error);
    res.status(500).json({ error: "Failed to get queued jobs" });
  }
});

// Get a specific queued job
app.get("/api/queue/jobs/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const job = await storage.get<QueuedJob>("queued-jobs", id);

    if (!job) {
      return res.status(404).json({ error: "Queued job not found" });
    }

    res.json(job);
  } catch (error) {
    console.error("Error getting queued job:", error);
    res.status(500).json({ error: "Failed to get queued job" });
  }
});

// Enqueue a new job
app.post("/api/queue/enqueue", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    const {
      jobId,
      priority,
      input,
      scheduledFor,
      dependsOn,
      maxAttempts,
      retryDelay,
      retryBackoff,
      timeout,
      concurrencyKey,
      rateLimit,
      orgId,
      userId,
      tags,
      metadata,
    } = req.body;

    if (!jobId) {
      return res.status(400).json({ error: "jobId is required" });
    }

    const queuedJob = await queueManager.enqueue({
      jobId,
      priority,
      input,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
      dependsOn,
      maxAttempts,
      retryDelay,
      retryBackoff,
      timeout,
      concurrencyKey,
      rateLimit,
      orgId,
      userId,
      tags,
      metadata,
    });

    res.status(201).json(queuedJob);
  } catch (error) {
    console.error("Error enqueuing job:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to enqueue job",
    });
  }
});

// Cancel a queued job
app.post("/api/queue/cancel/:id", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    const { id } = req.params;

    await queueManager.cancel(id);

    res.json({ success: true, message: `Job ${id} cancelled` });
  } catch (error) {
    console.error("Error cancelling job:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to cancel job",
    });
  }
});

// Pause the queue
app.post("/api/queue/pause", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    await queueManager.pause();

    res.json({ success: true, message: "Queue paused" });
  } catch (error) {
    console.error("Error pausing queue:", error);
    res.status(500).json({ error: "Failed to pause queue" });
  }
});

// Resume the queue
app.post("/api/queue/resume", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    await queueManager.resume();

    res.json({ success: true, message: "Queue resumed" });
  } catch (error) {
    console.error("Error resuming queue:", error);
    res.status(500).json({ error: "Failed to resume queue" });
  }
});

// Drain the queue
app.post("/api/queue/drain", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    await queueManager.drain();

    res.json({ success: true, message: "Queue draining" });
  } catch (error) {
    console.error("Error draining queue:", error);
    res.status(500).json({ error: "Failed to drain queue" });
  }
});

// Get dead letter queue
app.get("/api/queue/dlq", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
    const orgId = req.query.orgId as string | undefined;

    const allDlqJobs = await storage.list<DeadLetterJob>("dead-letter-jobs", { limit: 1000 });
    let dlqJobs = allDlqJobs.data;

    // Apply filters
    if (orgId) {
      dlqJobs = dlqJobs.filter((j) => j.orgId === orgId);
    }

    // Sort by moved to DLQ time (most recent first)
    dlqJobs.sort(
      (a, b) => new Date(b.movedToDLQAt).getTime() - new Date(a.movedToDLQAt).getTime()
    );

    // Apply limit
    dlqJobs = dlqJobs.slice(0, limit);

    res.json(dlqJobs);
  } catch (error) {
    console.error("Error getting dead letter queue:", error);
    res.status(500).json({ error: "Failed to get dead letter queue" });
  }
});

// Retry a job from dead letter queue
app.post("/api/queue/dlq/retry/:id", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    const { id } = req.params;

    const newJob = await queueManager.retryDeadLetter(id);

    res.json({ success: true, job: newJob });
  } catch (error) {
    console.error("Error retrying job from DLQ:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to retry job from DLQ",
    });
  }
});

// Queue overview dashboard
app.get("/api/queue/overview", async (req, res) => {
  try {
    const queueManager = getQueueManager();
    const stats = await queueManager.getStats();
    const config = queueManager.getConfig();

    // Get recent queued jobs
    const allJobs = await storage.list<QueuedJob>("queued-jobs", { limit: 100 });
    const recentJobs = allJobs.data
      .sort((a, b) => new Date(b.enqueuedAt).getTime() - new Date(a.enqueuedAt).getTime())
      .slice(0, 10);

    // Get DLQ summary
    const dlqJobs = await storage.list<DeadLetterJob>("dead-letter-jobs", { limit: 10 });

    // Job type breakdown
    const jobTypeBreakdown: Record<string, number> = {};
    allJobs.data.forEach((job) => {
      jobTypeBreakdown[job.jobId] = (jobTypeBreakdown[job.jobId] || 0) + 1;
    });

    res.json({
      config: {
        mode: config.mode,
        maxConcurrency: config.maxConcurrency,
        pausedAt: config.pausedAt,
        drainingStartedAt: config.drainingStartedAt,
      },
      stats,
      recentJobs,
      deadLetterQueue: {
        total: dlqJobs.data.length,
        recent: dlqJobs.data.slice(0, 5),
      },
      jobTypeBreakdown,
    });
  } catch (error) {
    console.error("Error getting queue overview:", error);
    res.status(500).json({ error: "Failed to get queue overview" });
  }
});

// ========================================
// Alert API Endpoints
// ========================================

// Get alert configuration
app.get("/api/alerts/config", async (req, res) => {
  try {
    const alertsConfigPath = path.join(__dirname, "..", "..", "worker", "alerts.yaml");
    const fs = await import("fs");

    if (!fs.existsSync(alertsConfigPath)) {
      return res.status(404).json({ error: "Alert configuration not found" });
    }

    const yaml = await import("js-yaml");
    const content = fs.readFileSync(alertsConfigPath, "utf8");
    const config = yaml.load(content);

    res.json(config);
  } catch (error) {
    console.error("Error getting alert config:", error);
    res.status(500).json({ error: "Failed to get alert configuration" });
  }
});

// Get alert history
app.get("/api/alerts/history", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const severity = req.query.severity as string | undefined;
    const jobId = req.query.jobId as string | undefined;

    const alerts = await storage.list<any>("alert-events", { limit: 500 });

    // Filter alerts
    let filtered = alerts.data;
    if (severity) {
      filtered = filtered.filter((a) => a.severity === severity);
    }
    if (jobId) {
      filtered = filtered.filter((a) => a.jobId === jobId);
    }

    // Sort by triggeredAt descending
    const sorted = filtered.sort(
      (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
    );

    // Apply limit
    const limited = sorted.slice(0, limit);

    res.json({
      total: filtered.length,
      data: limited,
    });
  } catch (error) {
    console.error("Error getting alert history:", error);
    res.status(500).json({ error: "Failed to get alert history" });
  }
});

// Get alert statistics
app.get("/api/alerts/stats", async (req, res) => {
  try {
    const alerts = await storage.list<any>("alert-events", { limit: 1000 });

    // Calculate stats
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const last7d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const recent24h = alerts.data.filter(
      (a) => new Date(a.triggeredAt) >= last24h
    );
    const recent7d = alerts.data.filter(
      (a) => new Date(a.triggeredAt) >= last7d
    );

    const bySeverity = {
      critical: alerts.data.filter((a) => a.severity === "critical").length,
      high: alerts.data.filter((a) => a.severity === "high").length,
      medium: alerts.data.filter((a) => a.severity === "medium").length,
      low: alerts.data.filter((a) => a.severity === "low").length,
    };

    const byAlertName: Record<string, number> = {};
    alerts.data.forEach((a) => {
      byAlertName[a.alertName] = (byAlertName[a.alertName] || 0) + 1;
    });

    const topAlerts = Object.entries(byAlertName)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    res.json({
      total: alerts.data.length,
      last24h: recent24h.length,
      last7d: recent7d.length,
      bySeverity,
      topAlerts,
      mostRecent: alerts.data.sort(
        (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
      )[0],
    });
  } catch (error) {
    console.error("Error getting alert stats:", error);
    res.status(500).json({ error: "Failed to get alert statistics" });
  }
});

// Send a test alert
app.post("/api/alerts/test", async (req, res) => {
  try {
    const { sendSlackMessage, isSlackEnabled } = await import("@sb/notify");

    if (!isSlackEnabled()) {
      return res.status(400).json({ error: "Slack notifications are not enabled" });
    }

    const message = "🧪 Test Alert\n\nThis is a test alert from the Console app to verify your alerting configuration.";

    // Read slack config from alerts.yaml
    const alertsConfigPath = path.join(__dirname, "..", "..", "worker", "alerts.yaml");
    const fs = await import("fs");
    const yaml = await import("js-yaml");

    let slackChannel = "#worker-alerts";
    if (fs.existsSync(alertsConfigPath)) {
      const content = fs.readFileSync(alertsConfigPath, "utf8");
      const config = yaml.load(content) as any;
      slackChannel = config?.settings?.slack?.channel || slackChannel;
    }

    const success = await sendSlackMessage(slackChannel, message, {
      username: "Console Test",
      iconEmoji: ":test_tube:",
    });

    if (success) {
      res.json({ success: true, message: "Test alert sent successfully" });
    } else {
      res.status(500).json({ error: "Failed to send test alert" });
    }
  } catch (error) {
    console.error("Error sending test alert:", error);
    res.status(500).json({ error: "Failed to send test alert" });
  }
});

// Serve index.html for all other routes (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, async () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${PORT}${suiteApp.routes.base}`
  );

  // Seed initial data
  await seedTeamMembers();
});
