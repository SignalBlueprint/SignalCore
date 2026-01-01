#!/usr/bin/env node

/**
 * Worker app - runs scheduled and on-demand jobs
 */

// Import jobs to register them
import "./jobs";
import { getJobs, scheduler, getQueueManager } from "@sb/jobs";
import { logger } from "@sb/logger";
import { storage } from "@sb/storage";
import type { QueuedJob, DeadLetterJob, JobPriority } from "@sb/schemas";
import { loadSchedulerConfig, validateSchedulerConfig } from "./config";
import { runJobWithTracking } from "./job-runner";
import {
  getJobExecutions,
  getAllJobExecutions,
  getJobStats
} from "./executions";
import { startAlertManager, stopAlertManager } from "./alert-manager";
import { setupAlertEventHandlers } from "./alert-events";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const jobId = args[1];

  if (command === "daemon") {
    // Daemon mode - run scheduler with config
    try {
      // Parse command line arguments for --config
      let configPath: string | undefined;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === "--config" && i + 1 < args.length) {
          configPath = args[i + 1];
          break;
        }
      }

      // Load and validate config
      const config = loadSchedulerConfig(configPath);
      const errors = validateSchedulerConfig(config);

      if (errors.length > 0) {
        logger.error("Invalid scheduler configuration:");
        errors.forEach((err) => logger.error(`  - ${err}`));
        process.exit(1);
      }

      // Start alert manager
      logger.info("Starting alert manager");
      await startAlertManager();
      setupAlertEventHandlers();

      // Start scheduler with tracking runner
      logger.info("Starting Worker in daemon mode");
      scheduler.start({
        ...config,
        runnerFn: runJobWithTracking,
      });

      // Log scheduled jobs
      const tasks = scheduler.getTasks();
      console.log("\n🤖 Worker Daemon Started\n");
      console.log(`Scheduled ${tasks.length} job(s):\n`);
      tasks.forEach((task) => {
        console.log(`  ✓ ${task.jobId}`);
        console.log(`    Schedule: ${task.schedule.schedule}`);
        if (task.schedule.timezone) {
          console.log(`    Timezone: ${task.schedule.timezone}`);
        }
        if (task.schedule.description) {
          console.log(`    ${task.schedule.description}`);
        }
        console.log("");
      });
      console.log("Press Ctrl+C to stop the scheduler\n");

      // Keep process alive
      process.on("SIGINT", async () => {
        logger.info("Received SIGINT, stopping scheduler...");
        scheduler.stop();
        await stopAlertManager();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        logger.info("Received SIGTERM, stopping scheduler...");
        scheduler.stop();
        await stopAlertManager();
        process.exit(0);
      });

      // Keep process running
      await new Promise(() => {});
    } catch (error) {
      logger.error("Failed to start daemon", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "job" && jobId) {
    // One-off job execution
    try {
      // Parse command line arguments for --org
      let orgId: string | undefined;
      for (let i = 2; i < args.length; i++) {
        if (args[i] === "--org" && i + 1 < args.length) {
          orgId = args[i + 1];
          break;
        }
      }

      logger.info(`Running job: ${jobId}`);
      await runJobWithTracking(jobId, orgId ? { orgId } : undefined);
      logger.info("Job completed successfully");
      process.exit(0);
    } catch (error) {
      logger.error("Job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "list") {
    // List all registered jobs
    const jobs = getJobs();
    console.log("\n📋 Registered Jobs:\n");
    jobs.forEach((job) => {
      console.log(`  ${job.id}`);
      console.log(`    Name: ${job.name}`);
      if (job.scheduleHint) {
        console.log(`    Schedule: ${job.scheduleHint}`);
      }
      console.log("");
    });
  } else if (command === "schedules") {
    // Show configured schedules
    try {
      let configPath: string | undefined;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === "--config" && i + 1 < args.length) {
          configPath = args[i + 1];
          break;
        }
      }

      const config = loadSchedulerConfig(configPath);
      console.log("\n📅 Configured Schedules:\n");
      config.schedules.forEach((schedule) => {
        const status = schedule.enabled ? "✓ Enabled" : "✗ Disabled";
        console.log(`  ${schedule.jobId} [${status}]`);
        console.log(`    Schedule: ${schedule.schedule}`);
        if (schedule.timezone) {
          console.log(`    Timezone: ${schedule.timezone}`);
        }
        if (schedule.description) {
          console.log(`    ${schedule.description}`);
        }
        if (schedule.input) {
          console.log(`    Input: ${JSON.stringify(schedule.input)}`);
        }
        console.log("");
      });
    } catch (error) {
      logger.error("Failed to load schedules", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "history" && jobId) {
    // Show execution history for a specific job
    try {
      // Parse --limit option
      let limit = 10;
      let orgId: string | undefined;
      for (let i = 2; i < args.length; i++) {
        if (args[i] === "--limit" && i + 1 < args.length) {
          limit = parseInt(args[i + 1], 10);
        }
        if (args[i] === "--org" && i + 1 < args.length) {
          orgId = args[i + 1];
        }
      }

      const executions = await getJobExecutions(jobId, { limit, orgId });
      console.log(`\n📜 Execution History: ${jobId}\n`);
      if (executions.length === 0) {
        console.log("  No executions found");
      } else {
        executions.forEach((exec) => {
          const status = exec.status === "success" ? "✓" : exec.status === "failed" ? "✗" : "⏳";
          const duration = exec.duration ? `${exec.duration}ms` : "running";
          console.log(`  ${status} ${exec.startedAt} - ${duration}`);
          if (exec.orgId) {
            console.log(`    Org: ${exec.orgId}`);
          }
          if (exec.status === "failed" && exec.error) {
            console.log(`    Error: ${exec.error}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logger.error("Failed to load execution history", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "executions") {
    // Show all recent executions
    try {
      // Parse --limit and --status options
      let limit = 20;
      let orgId: string | undefined;
      let status: "running" | "success" | "failed" | "timeout" | undefined;
      for (let i = 1; i < args.length; i++) {
        if (args[i] === "--limit" && i + 1 < args.length) {
          limit = parseInt(args[i + 1], 10);
        }
        if (args[i] === "--org" && i + 1 < args.length) {
          orgId = args[i + 1];
        }
        if (args[i] === "--status" && i + 1 < args.length) {
          status = args[i + 1] as any;
        }
      }

      const executions = await getAllJobExecutions({ limit, orgId, status });
      console.log("\n📊 Recent Job Executions\n");
      if (executions.length === 0) {
        console.log("  No executions found");
      } else {
        executions.forEach((exec) => {
          const statusIcon = exec.status === "success" ? "✓" : exec.status === "failed" ? "✗" : "⏳";
          const duration = exec.duration ? `${exec.duration}ms` : "running";
          console.log(`  ${statusIcon} ${exec.jobId} - ${exec.startedAt} - ${duration}`);
          if (exec.orgId) {
            console.log(`    Org: ${exec.orgId}`);
          }
          if (exec.status === "failed" && exec.error) {
            console.log(`    Error: ${exec.error}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logger.error("Failed to load executions", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "stats" && jobId) {
    // Show statistics for a specific job
    try {
      // Parse --org option
      let orgId: string | undefined;
      for (let i = 2; i < args.length; i++) {
        if (args[i] === "--org" && i + 1 < args.length) {
          orgId = args[i + 1];
        }
      }

      const stats = await getJobStats(jobId, orgId);
      console.log(`\n📈 Job Statistics: ${jobId}\n`);
      console.log(`  Total Runs: ${stats.totalRuns}`);
      console.log(`  Success: ${stats.successCount} (${Math.round((stats.successCount / stats.totalRuns) * 100)}%)`);
      console.log(`  Failures: ${stats.failureCount} (${Math.round((stats.failureCount / stats.totalRuns) * 100)}%)`);
      if (stats.timeoutCount > 0) {
        console.log(`  Timeouts: ${stats.timeoutCount}`);
      }
      console.log(`  Average Duration: ${Math.round(stats.averageDuration)}ms`);
      console.log("");
      if (stats.lastRun) {
        console.log(`  Last Run: ${stats.lastRun.startedAt} - ${stats.lastRun.status}`);
      }
      if (stats.lastSuccess) {
        console.log(`  Last Success: ${stats.lastSuccess.startedAt}`);
      }
      if (stats.lastFailure) {
        console.log(`  Last Failure: ${stats.lastFailure.startedAt}`);
        if (stats.lastFailure.error) {
          console.log(`    Error: ${stats.lastFailure.error}`);
        }
      }
      console.log("");
    } catch (error) {
      logger.error("Failed to load statistics", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:start") {
    // Start the queue manager
    try {
      // Start alert manager
      await startAlertManager();
      setupAlertEventHandlers();

      const queueManager = getQueueManager();
      await queueManager.start();
      console.log("\n✓ Queue manager started\n");
      console.log("✓ Alert manager started\n");
      console.log("Press Ctrl+C to stop\n");

      // Keep process alive
      process.on("SIGINT", async () => {
        logger.info("Received SIGINT, stopping queue manager...");
        await queueManager.stop();
        await stopAlertManager();
        process.exit(0);
      });

      process.on("SIGTERM", async () => {
        logger.info("Received SIGTERM, stopping queue manager...");
        await queueManager.stop();
        await stopAlertManager();
        process.exit(0);
      });

      await new Promise(() => {});
    } catch (error) {
      logger.error("Failed to start queue manager", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:status") {
    // Show queue status and statistics
    try {
      const queueManager = getQueueManager();
      const stats = await queueManager.getStats();
      const config = queueManager.getConfig();

      console.log("\n📊 Queue Status\n");
      console.log(`  Mode: ${config.mode}`);
      console.log(`  Max Concurrency: ${config.maxConcurrency}`);
      console.log(`  Active Workers: ${stats.activeWorkers}/${stats.maxConcurrency}`);
      console.log("");

      console.log("📈 Queue Statistics\n");
      console.log(`  Total Jobs: ${stats.totalJobs}`);
      console.log(`  Ready: ${stats.readyJobs}`);
      console.log(`  Running: ${stats.runningJobs}`);
      console.log(`  Pending: ${stats.pendingJobs}`);
      console.log(`  Delayed: ${stats.delayedJobs}`);
      console.log(`  Completed: ${stats.completedJobs}`);
      console.log(`  Failed: ${stats.failedJobs}`);
      console.log(`  Dead Letter: ${stats.deadLetterJobs}`);
      console.log("");

      console.log("🎯 Priority Breakdown\n");
      console.log(`  Critical: ${stats.criticalJobs}`);
      console.log(`  High: ${stats.highPriorityJobs}`);
      console.log(`  Normal: ${stats.normalPriorityJobs}`);
      console.log(`  Low: ${stats.lowPriorityJobs}`);
      console.log("");

      if (stats.averageWaitTime !== undefined) {
        console.log("⏱️  Performance Metrics\n");
        console.log(`  Avg Wait Time: ${Math.round(stats.averageWaitTime)}ms`);
        if (stats.averageExecutionTime !== undefined) {
          console.log(`  Avg Execution Time: ${Math.round(stats.averageExecutionTime)}ms`);
        }
        if (stats.successRate !== undefined) {
          console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
        }
        console.log("");
      }
    } catch (error) {
      logger.error("Failed to get queue status", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:enqueue" && jobId) {
    // Enqueue a new job
    try {
      const queueManager = getQueueManager();

      // Parse options
      let priority: JobPriority = "normal";
      let orgId: string | undefined;
      let scheduledFor: Date | undefined;
      let dependsOn: string[] | undefined;
      let concurrencyKey: string | undefined;

      for (let i = 2; i < args.length; i++) {
        if (args[i] === "--priority" && i + 1 < args.length) {
          priority = args[i + 1] as JobPriority;
        }
        if (args[i] === "--org" && i + 1 < args.length) {
          orgId = args[i + 1];
        }
        if (args[i] === "--scheduled-for" && i + 1 < args.length) {
          scheduledFor = new Date(args[i + 1]);
        }
        if (args[i] === "--depends-on" && i + 1 < args.length) {
          dependsOn = args[i + 1].split(",");
        }
        if (args[i] === "--concurrency-key" && i + 1 < args.length) {
          concurrencyKey = args[i + 1];
        }
      }

      const queuedJob = await queueManager.enqueue({
        jobId,
        priority,
        input: orgId ? { orgId } : undefined,
        scheduledFor,
        dependsOn,
        concurrencyKey,
        orgId,
      });

      console.log("\n✓ Job enqueued successfully\n");
      console.log(`  Job ID: ${queuedJob.id}`);
      console.log(`  Job Type: ${queuedJob.jobId}`);
      console.log(`  Priority: ${queuedJob.priority}`);
      console.log(`  Status: ${queuedJob.status}`);
      if (queuedJob.scheduledFor) {
        console.log(`  Scheduled For: ${queuedJob.scheduledFor}`);
      }
      if (queuedJob.dependsOn) {
        console.log(`  Dependencies: ${queuedJob.dependsOn.join(", ")}`);
      }
      console.log("");
    } catch (error) {
      logger.error("Failed to enqueue job", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:pause") {
    // Pause the queue
    try {
      const queueManager = getQueueManager();
      await queueManager.pause();
      console.log("\n⏸️  Queue paused\n");
    } catch (error) {
      logger.error("Failed to pause queue", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:resume") {
    // Resume the queue
    try {
      const queueManager = getQueueManager();
      await queueManager.resume();
      console.log("\n▶️  Queue resumed\n");
    } catch (error) {
      logger.error("Failed to resume queue", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:drain") {
    // Drain the queue
    try {
      const queueManager = getQueueManager();
      await queueManager.drain();
      console.log("\n🚰 Queue draining (will stop after all jobs complete)\n");
    } catch (error) {
      logger.error("Failed to drain queue", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:cancel" && jobId) {
    // Cancel a queued job (jobId here is the queuedJobId)
    try {
      const queueManager = getQueueManager();
      await queueManager.cancel(jobId);
      console.log(`\n✓ Cancelled job: ${jobId}\n`);
    } catch (error) {
      logger.error("Failed to cancel job", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:list") {
    // List all queued jobs
    try {
      // Parse options
      let limit = 50;
      let status: string | undefined;
      let priority: JobPriority | undefined;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === "--limit" && i + 1 < args.length) {
          limit = parseInt(args[i + 1], 10);
        }
        if (args[i] === "--status" && i + 1 < args.length) {
          status = args[i + 1];
        }
        if (args[i] === "--priority" && i + 1 < args.length) {
          priority = args[i + 1] as JobPriority;
        }
      }

      const allJobs = await storage.list<QueuedJob>("queued-jobs", { limit });
      let jobs = allJobs.data;

      // Apply filters
      if (status) {
        jobs = jobs.filter((j) => j.status === status);
      }
      if (priority) {
        jobs = jobs.filter((j) => j.priority === priority);
      }

      console.log("\n📋 Queued Jobs\n");
      if (jobs.length === 0) {
        console.log("  No jobs found");
      } else {
        jobs.forEach((job) => {
          const statusIcon =
            job.status === "completed" ? "✓" :
            job.status === "failed" ? "✗" :
            job.status === "running" ? "⏳" :
            job.status === "ready" ? "🟢" :
            job.status === "pending" ? "🟡" :
            job.status === "delayed" ? "⏰" : "⚪";

          const priorityIcon =
            job.priority === "critical" ? "🔴" :
            job.priority === "high" ? "🟠" :
            job.priority === "normal" ? "🟢" : "🔵";

          console.log(`  ${statusIcon} ${priorityIcon} ${job.jobId}`);
          console.log(`    ID: ${job.id}`);
          console.log(`    Status: ${job.status}`);
          console.log(`    Priority: ${job.priority}`);
          console.log(`    Enqueued: ${job.enqueuedAt}`);
          if (job.scheduledFor) {
            console.log(`    Scheduled: ${job.scheduledFor}`);
          }
          if (job.attempt > 0) {
            console.log(`    Attempts: ${job.attempt}/${job.maxAttempts}`);
          }
          if (job.dependsOn && job.dependsOn.length > 0) {
            console.log(`    Dependencies: ${job.dependsOn.length}`);
          }
          if (job.error) {
            console.log(`    Error: ${job.error}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logger.error("Failed to list queued jobs", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:dlq") {
    // View dead letter queue
    try {
      // Parse options
      let limit = 50;

      for (let i = 1; i < args.length; i++) {
        if (args[i] === "--limit" && i + 1 < args.length) {
          limit = parseInt(args[i + 1], 10);
        }
      }

      const dlqJobs = await storage.list<DeadLetterJob>("dead-letter-jobs", { limit });

      console.log("\n💀 Dead Letter Queue\n");
      if (dlqJobs.data.length === 0) {
        console.log("  No jobs in dead letter queue");
      } else {
        dlqJobs.data.forEach((job) => {
          const canRetry = job.canRetry ? "✓ Can Retry" : "✗ Cannot Retry";
          console.log(`  ${job.jobId} [${canRetry}]`);
          console.log(`    ID: ${job.id}`);
          console.log(`    Original Job: ${job.originalJobId}`);
          console.log(`    Failure: ${job.failureReason}`);
          console.log(`    Attempts: ${job.attempts}`);
          console.log(`    Moved to DLQ: ${job.movedToDLQAt}`);
          if (job.retryCount > 0) {
            console.log(`    Retry Count: ${job.retryCount}`);
          }
          if (job.error) {
            console.log(`    Error: ${job.error}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logger.error("Failed to list dead letter queue", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "queue:retry" && jobId) {
    // Retry a job from dead letter queue (jobId is the DLQ job ID)
    try {
      const queueManager = getQueueManager();
      const newJob = await queueManager.retryDeadLetter(jobId);

      console.log("\n✓ Job retried from dead letter queue\n");
      console.log(`  New Job ID: ${newJob.id}`);
      console.log(`  Job Type: ${newJob.jobId}`);
      console.log(`  Priority: ${newJob.priority}`);
      console.log(`  Status: ${newJob.status}`);
      console.log("");
    } catch (error) {
      logger.error("Failed to retry job from DLQ", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "alert:status") {
    // Show alert configuration and status
    try {
      const { getAlertManager } = await import("./alert-manager");
      const alertManager = getAlertManager();
      const config = alertManager.getConfig();

      console.log("\n🔔 Alert Configuration\n");
      console.log(`  Enabled: ${config.settings.enabled ? "✓ Yes" : "✗ No"}`);
      console.log(`  Channels: ${config.settings.channels.join(", ")}`);

      if (config.settings.slack) {
        console.log(`\n  Slack:`);
        console.log(`    Channel: ${config.settings.slack.channel}`);
        console.log(`    Username: ${config.settings.slack.username || "Worker Bot"}`);
      }

      if (config.settings.throttle) {
        console.log(`\n  Throttle:`);
        console.log(`    Min Interval: ${config.settings.throttle.minInterval}s`);
        console.log(`    Max Alerts/Hour: ${config.settings.throttle.maxAlertsPerJobPerHour}`);
      }

      console.log(`\n  Alert Rules:`);
      const totalRules =
        (config.jobFailures?.length || 0) +
        (config.queueHealth?.length || 0) +
        (config.performance?.length || 0) +
        (config.dependencies?.length || 0);
      const enabledRules = [
        ...(config.jobFailures || []),
        ...(config.queueHealth || []),
        ...(config.performance || []),
        ...(config.dependencies || []),
      ].filter(r => r.enabled).length;

      console.log(`    Total: ${totalRules}`);
      console.log(`    Enabled: ${enabledRules}`);
      console.log(`    Disabled: ${totalRules - enabledRules}`);
      console.log("");
    } catch (error) {
      logger.error("Failed to get alert status", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "alert:history") {
    // Show recent alerts
    try {
      const limit = parseInt(args[args.indexOf("--limit") + 1] || "20");
      const alerts = await storage.list<any>("alert-events", { limit });

      console.log(`\n📜 Recent Alerts (${alerts.data.length})\n`);

      if (alerts.data.length === 0) {
        console.log("  No alerts found");
      } else {
        // Sort by triggeredAt descending
        const sorted = alerts.data.sort(
          (a, b) => new Date(b.triggeredAt).getTime() - new Date(a.triggeredAt).getTime()
        );

        sorted.forEach((alert) => {
          const severityIcon = {
            critical: "🚨",
            high: "⚠️",
            medium: "⚡",
            low: "ℹ️",
          }[alert.severity] || "•";

          console.log(`  ${severityIcon} ${alert.title}`);
          console.log(`    Severity: ${alert.severity}`);
          console.log(`    Alert: ${alert.alertName}`);
          console.log(`    Time: ${new Date(alert.triggeredAt).toLocaleString()}`);
          if (alert.jobId) {
            console.log(`    Job: ${alert.jobId}`);
          }
          console.log("");
        });
      }
    } catch (error) {
      logger.error("Failed to get alert history", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else if (command === "alert:test") {
    // Send a test alert
    try {
      const { getAlertManager } = await import("./alert-manager");
      const alertManager = getAlertManager();
      const config = alertManager.getConfig();

      if (!config.settings.enabled) {
        console.log("\n⚠️  Alerting is disabled in configuration\n");
        process.exit(1);
      }

      console.log("\n📤 Sending test alert...\n");

      // Send a test alert by directly calling the private method via type assertion
      await (alertManager as any).sendAlert({
        alertName: "test-alert",
        severity: "low" as const,
        title: "Test Alert",
        message: "This is a test alert from the Worker app to verify your alerting configuration is working correctly.",
        channels: config.settings.channels,
        metadata: {
          test: true,
          timestamp: new Date().toISOString(),
        },
      });

      console.log("✓ Test alert sent successfully");
      console.log(`  Channels: ${config.settings.channels.join(", ")}`);
      console.log("");
    } catch (error) {
      logger.error("Failed to send test alert", {
        error: error instanceof Error ? error.message : String(error),
      });
      process.exit(1);
    }
  } else {
    console.log(`
Worker - Job Runner and Scheduler

Usage:
  pnpm --filter worker dev -- daemon [--config <path>]        Start scheduler daemon
  pnpm --filter worker dev -- job <jobId> [--org <orgId>]     Run a specific job once
  pnpm --filter worker dev -- list                            List all registered jobs
  pnpm --filter worker dev -- schedules [--config <path>]     Show configured schedules
  pnpm --filter worker dev -- history <jobId> [--limit N]     Show execution history for a job
  pnpm --filter worker dev -- executions [--limit N]          Show all recent executions
  pnpm --filter worker dev -- stats <jobId>                   Show statistics for a job

Advanced Queue Commands:
  pnpm --filter worker dev -- queue:start                     Start the advanced queue manager
  pnpm --filter worker dev -- queue:status                    Show queue status and statistics
  pnpm --filter worker dev -- queue:enqueue <jobId> [opts]    Enqueue a job to the queue
    Options:
      --priority <critical|high|normal|low>                   Job priority (default: normal)
      --org <orgId>                                           Organization ID
      --scheduled-for <ISO date>                              Schedule for future execution
      --depends-on <jobId1,jobId2>                            Job dependencies (comma-separated)
      --concurrency-key <key>                                 Concurrency group key
  pnpm --filter worker dev -- queue:pause                     Pause queue processing
  pnpm --filter worker dev -- queue:resume                    Resume queue processing
  pnpm --filter worker dev -- queue:drain                     Drain queue (finish jobs, then stop)
  pnpm --filter worker dev -- queue:cancel <queuedJobId>      Cancel a queued job
  pnpm --filter worker dev -- queue:list [opts]               List queued jobs
    Options:
      --limit N                                               Limit results (default: 50)
      --status <status>                                       Filter by status
      --priority <priority>                                   Filter by priority
  pnpm --filter worker dev -- queue:dlq [--limit N]           View dead letter queue
  pnpm --filter worker dev -- queue:retry <dlqJobId>          Retry job from dead letter queue

Alert Commands:
  pnpm --filter worker dev -- alert:status                    Show alert configuration
  pnpm --filter worker dev -- alert:history [--limit N]       Show recent alerts
  pnpm --filter worker dev -- alert:test                      Send a test alert

Examples:
  # Start daemon with default config (scheduler.yaml)
  pnpm --filter worker dev -- daemon

  # Start daemon with custom config
  pnpm --filter worker dev -- daemon --config /path/to/config.yaml

  # Run a job manually
  pnpm --filter worker dev -- job daily.questmaster --org default-org
  pnpm --filter worker dev -- job daily.questmaster.dryrun

  # List all jobs
  pnpm --filter worker dev -- list

  # Show configured schedules
  pnpm --filter worker dev -- schedules

  # View execution history
  pnpm --filter worker dev -- history daily.questmaster
  pnpm --filter worker dev -- history daily.questmaster --limit 20

  # View all recent executions
  pnpm --filter worker dev -- executions
  pnpm --filter worker dev -- executions --status failed

  # View job statistics
  pnpm --filter worker dev -- stats daily.questmaster
    `);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

