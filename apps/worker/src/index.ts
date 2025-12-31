#!/usr/bin/env node

/**
 * Worker app - runs scheduled and on-demand jobs
 */

// Import jobs to register them
import "./jobs";
import { getJobs, scheduler } from "@sb/jobs";
import { logger } from "@sb/logger";
import { loadSchedulerConfig, validateSchedulerConfig } from "./config";
import { runJobWithTracking } from "./job-runner";
import {
  getJobExecutions,
  getAllJobExecutions,
  getJobStats
} from "./executions";

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
      process.on("SIGINT", () => {
        logger.info("Received SIGINT, stopping scheduler...");
        scheduler.stop();
        process.exit(0);
      });

      process.on("SIGTERM", () => {
        logger.info("Received SIGTERM, stopping scheduler...");
        scheduler.stop();
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

