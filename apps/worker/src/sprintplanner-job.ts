/**
 * Weekly Sprint Planner job
 * Generates weekly sprint plans for organizations
 */

import { type Job } from "@sb/jobs";
import { generateSprintPlan } from "../../questboard/src/sprintplanner";
import { publish } from "@sb/events";

/**
 * Weekly Sprint Planner job
 */
export const weeklySprintPlannerJob: Job = {
  id: "weekly.sprintplanner",
  name: "Weekly Sprint Planner",
  scheduleHint: "weekly on Monday at 9am",
  run: async (ctx) => {
    ctx.logger.info("Starting Weekly Sprint Planner job");

    // Get org_id from context or process all orgs
    // For now, we'll process "default-org" - in production, this would iterate over all orgs
    const orgId = "default-org"; // TODO: Get from job input or iterate over all orgs

    ctx.logger.info(`Processing org: ${orgId}`);

    try {
      // Generate sprint plan for the current week
      const plan = await generateSprintPlan(orgId, ctx.now);

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
        totalTasks: plan.memberPlans.reduce((sum, mp) => sum + mp.tasks.length, 0),
      }, {
        sourceApp: "worker",
        correlationId: `sprint-plan-${plan.id}`,
      });

      ctx.logger.info("Weekly Sprint Planner job completed successfully");
    } catch (error) {
      ctx.logger.error("Weekly Sprint Planner job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};

