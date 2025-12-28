/**
 * Daily Questmaster job
 * Recalculates unlocks, updates Quest Decks, flags stuck/blocked items, emits digest events
 */

import { type Job } from "@sb/jobs";
import { runQuestmaster } from "../../questboard/src/questmaster";
import { saveJobRunSummary, getEntityCounts, listOrgs } from "../../questboard/src/store";

/**
 * Daily Questmaster job
 */
export const dailyQuestmasterJob: Job = {
  id: "daily.questmaster",
  name: "Daily Questmaster",
  scheduleHint: "daily at 9am",
  run: async (ctx) => {
    ctx.logger.info("Starting Daily Questmaster job");

    // Require orgId from input
    const orgId = ctx.input?.orgId as string | undefined;
    
    if (!orgId) {
      ctx.logger.error("ERROR: --org <orgId> is required for daily.questmaster");
      ctx.logger.error("");
      ctx.logger.error("Available orgs:");
      try {
        const orgs = await listOrgs();
        if (orgs.length === 0) {
          ctx.logger.error("  No orgs found. Run 'pnpm sb seed:demo' to create one.");
        } else {
          orgs.forEach(org => {
            ctx.logger.error(`  ${org.id} - ${org.name || org.id}`);
          });
        }
      } catch (error) {
        ctx.logger.error(`  Error listing orgs: ${error instanceof Error ? error.message : String(error)}`);
      }
      ctx.logger.error("");
      ctx.logger.error("Usage: pnpm --filter worker dev -- job daily.questmaster --org <orgId>");
      ctx.logger.error("Or list orgs: pnpm sb orgs:list");
      throw new Error("Missing required --org argument");
    }

    ctx.logger.info(`Processing org: ${orgId}`);

    // Validate that data exists for this org
    const counts = await getEntityCounts(orgId);
    if (counts.goals === 0 && counts.quests === 0 && counts.tasks === 0) {
      const errorMsg = `No data found for org "${orgId}". Run 'pnpm sb seed:demo' or check storage mode.`;
      ctx.logger.error(`ERROR: ${errorMsg}`);
      ctx.logger.error("");
      ctx.logger.error(`  Goals: ${counts.goals}`);
      ctx.logger.error(`  Questlines: ${counts.questlines}`);
      ctx.logger.error(`  Quests: ${counts.quests}`);
      ctx.logger.error(`  Tasks: ${counts.tasks}`);
      ctx.logger.error(`  Decks: ${counts.decks}`);
      ctx.logger.error(`  Sprint Plans: ${counts.sprintPlans}`);
      throw new Error(errorMsg);
    }

    const startedAt = ctx.now.toISOString();
    // Generate jobRunId upfront so we can link it to the DailyDeck
    const jobRunId = `summary-daily.questmaster-${orgId}-${Date.now()}`;

    let stats = {
      goals: 0,
      questlines: 0,
      quests: 0,
      tasks: 0,
      decksGenerated: 0,
      unlockedQuests: 0,
      staleTasks: 0,
      dailyDeckTasks: 0,
      dailyDeckWarnings: 0,
    };
    let status: "success" | "failed" = "success";
    let error: string | undefined = undefined;

    try {
      // Pass jobRunId to runQuestmaster so it can link the DailyDeck
      stats = await runQuestmaster(orgId, ctx.now, jobRunId);
      const finishedAt = new Date().toISOString();

      // Save job run summary with the pre-generated ID
      await saveJobRunSummary({
        orgId,
        jobId: "daily.questmaster",
        startedAt,
        finishedAt,
        status,
        stats,
      }, jobRunId);

      // Log final summary
      ctx.logger.info(
        `daily.questmaster finished: org=${orgId} goals=${stats.goals} questlines=${stats.questlines} quests=${stats.quests} tasks=${stats.tasks} decks=${stats.decksGenerated} unlocked=${stats.unlockedQuests} stale=${stats.staleTasks}`
      );

      ctx.logger.info("Daily Questmaster job completed successfully");
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
      const finishedAt = new Date().toISOString();

      ctx.logger.error("Daily Questmaster job failed", {
        error,
      });

      // Save failed job run summary
      try {
        await saveJobRunSummary({
          orgId,
          jobId: "daily.questmaster",
          startedAt,
          finishedAt,
          status,
          error,
          stats,
        }, jobRunId);
      } catch (summaryError) {
        ctx.logger.error("Failed to save job run summary", { error: summaryError });
      }

      throw err;
    }
  },
};

