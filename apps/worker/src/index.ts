#!/usr/bin/env node

/**
 * Worker app - runs scheduled and on-demand jobs
 */

// Import jobs to register them
import "./jobs";
import { runJob, getJobs } from "@sb/jobs";
import { logger } from "@sb/logger";

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const jobId = args[1];

  if (command === "job" && jobId) {
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
  } else {
    console.log(`
Worker - Job Runner

Usage:
  pnpm --filter worker dev -- job <jobId> [--org <orgId>]  Run a specific job
  pnpm --filter worker dev -- list                         List all registered jobs

Examples:
  pnpm --filter worker dev -- job daily.questmaster --org default-org
  pnpm --filter worker dev -- job daily.questmaster.dryrun
  pnpm --filter worker dev -- list
    `);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

