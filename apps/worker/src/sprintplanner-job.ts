/**
 * Weekly Sprint Planner job
 * Generates weekly sprint plans for organizations
 */

import { type Job } from "@sb/jobs";
import { generateSprintPlan } from "../../questboard/src/sprintplanner";
import { publish } from "@sb/events";
import { saveJobRunSummary, getEntityCounts, listOrgs } from "../../questboard/src/store";

/**
 * Weekly Sprint Planner job
 */
export const weeklySprintPlannerJob: Job = {
  id: "weekly.sprintplanner",
  name: "Weekly Sprint Planner",
  scheduleHint: "weekly on Monday at 9am",
  run: async (ctx) => {
    ctx.logger.info("Starting Weekly Sprint Planner job");

    // Require orgId from input
    const orgId = ctx.input?.orgId as string | undefined;
    
    if (!orgId) {
      ctx.logger.error("ERROR: --org <orgId> is required for weekly.sprintplanner");
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
      ctx.logger.error("Usage: pnpm --filter worker dev -- job weekly.sprintplanner --org <orgId>");
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
    let status: "success" | "failed" = "success";
    let error: string | undefined = undefined;
    let stats = {
      sprintPlansGenerated: 0,
      memberPlansGenerated: 0,
      tasks: 0,
    };

    try {
      // Generate sprint plan for the current week
      const plan = await generateSprintPlan(orgId, ctx.now);

      stats = {
        sprintPlansGenerated: 1,
        memberPlansGenerated: plan.memberPlans.length,
        tasks: plan.memberPlans.reduce((sum, mp) => sum + mp.tasks.length, 0),
      };

      ctx.logger.info(`Generated sprint plan: ${plan.id}`, {
        weekStart: plan.weekStart,
        weekEnd: plan.weekEnd,
        memberCount: plan.memberPlans.length,
      });

      // Publish event
      await ctx.events.publish("sprint.plan.generated", {
        planId: plan.id,
        orgId: plan.orgId,
        weekStart: plan.weekStart,
        weekEnd: plan.weekEnd,
        memberCount: plan.memberPlans.length,
        totalTasks: stats.tasks,
      }, {
        sourceApp: "worker",
        correlationId: `sprint-plan-${plan.id}`,
      });

      const finishedAt = new Date().toISOString();

      // Save job run summary
      await saveJobRunSummary({
        orgId,
        jobId: "weekly.sprintplanner",
        startedAt,
        finishedAt,
        status,
        stats,
      });

      // Log final summary
      ctx.logger.info(
        `weekly.sprintplanner finished: org=${orgId} sprintPlans=${stats.sprintPlansGenerated} memberPlans=${stats.memberPlansGenerated} tasks=${stats.tasks}`
      );

      ctx.logger.info("Weekly Sprint Planner job completed successfully");
    } catch (err) {
      status = "failed";
      error = err instanceof Error ? err.message : String(err);
      const finishedAt = new Date().toISOString();

      ctx.logger.error("Weekly Sprint Planner job failed", {
        error,
      });

      // Save failed job run summary
      try {
        await saveJobRunSummary({
          orgId,
          jobId: "weekly.sprintplanner",
          startedAt,
          finishedAt,
          status,
          error,
          stats,
        });
      } catch (summaryError) {
        ctx.logger.error("Failed to save job run summary", { error: summaryError });
      }

      throw err;
    }
  },
};

