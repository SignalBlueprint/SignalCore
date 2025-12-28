/**
 * Daily Questmaster job
 * Recalculates unlocks, updates Quest Decks, flags stuck/blocked items, emits digest events
 */

import { type Job } from "@sb/jobs";
import { runQuestmaster } from "../../questboard/src/questmaster";

const GOAL_KIND = "goals";
const QUESTLINE_KIND = "questlines";
const QUEST_KIND = "quests";
const TASK_KIND = "tasks";
const MEMBER_KIND = "members";
const DECK_KIND = "member_quest_decks";

/**
 * Daily Questmaster job
 */
export const dailyQuestmasterJob: Job = {
  id: "daily.questmaster",
  name: "Daily Questmaster",
  scheduleHint: "daily at 9am",
  run: async (ctx) => {
    ctx.logger.info("Starting Daily Questmaster job");

    // Get org_id from context or process all orgs
    // For now, we'll process "default-org" - in production, this would iterate over all orgs
    const orgId = "default-org"; // TODO: Get from job input or iterate over all orgs

    ctx.logger.info(`Processing org: ${orgId}`);

    try {
      await runQuestmaster(orgId, ctx.now);
      ctx.logger.info("Daily Questmaster job completed successfully");
    } catch (error) {
      ctx.logger.error("Daily Questmaster job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};

