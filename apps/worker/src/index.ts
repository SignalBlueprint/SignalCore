#!/usr/bin/env node

/**
 * Worker app - runs scheduled and on-demand jobs
 */

// Import jobs to register them
import "./jobs";
import { runJob, getJobs, scheduler } from "@sb/jobs";
import { logger } from "@sb/logger";
import { loadSchedulerConfig, validateSchedulerConfig } from "./config";

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

      // Start scheduler
      logger.info("Starting Worker in daemon mode");
      scheduler.start(config);

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
      await runJob(jobId, orgId ? { orgId } : undefined);
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
  } else {
    console.log(`
Worker - Job Runner and Scheduler

Usage:
  pnpm --filter worker dev -- daemon [--config <path>]      Start scheduler daemon
  pnpm --filter worker dev -- job <jobId> [--org <orgId>]   Run a specific job once
  pnpm --filter worker dev -- list                          List all registered jobs
  pnpm --filter worker dev -- schedules [--config <path>]   Show configured schedules

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
    `);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

