/**
 * Worker job definitions
 */

import { registerJobs, type Job } from "@sb/jobs";
import { dailyQuestmasterJob } from "./questmaster-job";

/**
 * Daily Questmaster dry run job (placeholder)
 */
const dailyQuestmasterDryrun: Job = {
  id: "daily.questmaster.dryrun",
  name: "Daily Questmaster Dry Run",
  scheduleHint: "daily at 9am",
  run: async (ctx) => {
    ctx.logger.info("Running daily questmaster dry run");
    
    // Placeholder logic
    const currentDate = ctx.now.toISOString().split("T")[0];
    ctx.logger.info(`Processing questmaster rotation for ${currentDate}`);
    
    // Example: check for goals that need attention
    ctx.logger.info("Checking for goals that need questmaster attention...");
    
    // Publish an event
    await ctx.events.publish("questmaster.dryrun.completed", {
      date: currentDate,
      processedCount: 0, // Placeholder
    }, {
      sourceApp: "worker",
    });
    
    ctx.logger.info("Daily questmaster dry run completed");
  },
};

// Register all jobs
registerJobs([
  dailyQuestmasterDryrun,
  dailyQuestmasterJob,
  weeklySprintPlannerJob,
  githubSyncJob,
]);

