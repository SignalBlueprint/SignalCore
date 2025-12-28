/**
 * Sprint Planner service - generates weekly sprint plans
 */

import { storage } from "@sb/storage";
import type {
  Quest,
  Task,
  Member,
  SprintPlan,
} from "@sb/schemas";
import {
  getQuestsForUser,
  getTasksByQuestId,
  getMembersByOrgId,
} from "./store";

const QUEST_KIND = "quests";
const TASK_KIND = "tasks";
const MEMBER_KIND = "members";
const SPRINT_PLAN_KIND = "sprint_plans";

/**
 * Get Monday of the week for a given date
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  return new Date(d.setDate(diff));
}

/**
 * Get Friday of the week for a given date
 */
function getWeekEnd(weekStart: Date): Date {
  const friday = new Date(weekStart);
  friday.setDate(weekStart.getDate() + 4); // Monday + 4 days = Friday
  return friday;
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Generate sprint plan for an organization
 */
export async function generateSprintPlan(
  orgId: string,
  weekStartDate?: Date
): Promise<SprintPlan> {
  const now = weekStartDate || new Date();
  const weekStart = getWeekStart(now);
  const weekEnd = getWeekEnd(weekStart);
  
  const weekStartStr = formatDate(weekStart);
  const weekEndStr = formatDate(weekEnd);
  const planId = `sprint-${orgId}-${weekStartStr}`;

  // Check if plan already exists
  const existing = await storage.get<SprintPlan>(SPRINT_PLAN_KIND, planId);
  if (existing && existing.status !== "draft") {
    throw new Error(`Sprint plan for week ${weekStartStr} already exists and is not in draft status`);
  }

  // Get all members
  const members = await getMembersByOrgId(orgId);
  const activeMembers = members.filter((m) => m.dailyCapacityMinutes && m.dailyCapacityMinutes > 0);

  // Get all unlocked quests and their tasks
  const allQuests = await storage.list<Quest>(QUEST_KIND, (q) => 
    q.orgId === orgId && (q.state === "unlocked" || q.state === "in-progress")
  );

  // Get all tasks for these quests
  const allTasks: Task[] = [];
  for (const quest of allQuests) {
    const questTasks = await getTasksByQuestId(quest.id);
    allTasks.push(...questTasks.filter((t) => t.status !== "done"));
  }

  // Group tasks by owner
  const tasksByOwner = new Map<string, Task[]>();
  for (const task of allTasks) {
    if (task.owner) {
      const ownerTasks = tasksByOwner.get(task.owner) || [];
      ownerTasks.push(task);
      tasksByOwner.set(task.owner, ownerTasks);
    }
  }

  // Generate member plans
  const memberPlans = activeMembers.map((member) => {
    const memberTasks = tasksByOwner.get(member.id) || [];
    
    // Get quests that have tasks assigned to this member
    const memberQuestIds = new Set(memberTasks.map((t) => {
      // Find which quest this task belongs to
      for (const quest of allQuests) {
        if (quest.taskIds.includes(t.id)) {
          return quest.id;
        }
      }
      return null;
    }).filter((id): id is string => id !== null));

    const memberQuests = allQuests.filter((q) => memberQuestIds.has(q.id));

    // Calculate capacity (5 workdays)
    const totalCapacityMinutes = (member.dailyCapacityMinutes || 480) * 5;
    
    // Estimate task minutes (default 60 minutes per task if not specified)
    const estimatedMinutesPerTask = 60;
    const allocatedMinutes = memberTasks.length * estimatedMinutesPerTask;
    const capacityUtilization = totalCapacityMinutes > 0 
      ? allocatedMinutes / totalCapacityMinutes 
      : 0;

    return {
      memberId: member.id,
      memberEmail: member.email,
      quests: memberQuests.map((q) => ({
        questId: q.id,
        questTitle: q.title,
        priority: "medium", // TODO: Add priority to quest schema
      })),
      tasks: memberTasks.map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        priority: t.priority,
        estimatedMinutes: estimatedMinutesPerTask,
      })),
      totalCapacityMinutes,
      allocatedMinutes,
      capacityUtilization: Math.min(capacityUtilization, 1.0), // Cap at 100%
    };
  });

  // Create sprint plan
  const sprintPlan: SprintPlan = {
    id: planId,
    orgId,
    weekStart: weekStartStr,
    weekEnd: weekEndStr,
    memberPlans,
    status: existing?.status === "draft" ? "draft" : "draft",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Save plan
  await storage.upsert(SPRINT_PLAN_KIND, sprintPlan);

  return sprintPlan;
}

/**
 * Get sprint plan for a week
 */
export async function getSprintPlan(orgId: string, weekStart: string): Promise<SprintPlan | null> {
  const planId = `sprint-${orgId}-${weekStart}`;
  return storage.get<SprintPlan>(SPRINT_PLAN_KIND, planId);
}

/**
 * Get all sprint plans for an organization
 */
export async function getSprintPlans(orgId: string): Promise<SprintPlan[]> {
  return storage.list<SprintPlan>(SPRINT_PLAN_KIND, (p) => p.orgId === orgId);
}

/**
 * Approve sprint plan
 */
export async function approveSprintPlan(
  planId: string,
  approvedBy: string
): Promise<SprintPlan | null> {
  const plan = await storage.get<SprintPlan>(SPRINT_PLAN_KIND, planId);
  if (!plan) {
    return null;
  }

  const updated: SprintPlan = {
    ...plan,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy,
    updatedAt: new Date().toISOString(),
  };

  await storage.upsert(SPRINT_PLAN_KIND, updated);
  return updated;
}

/**
 * Compare two sprint plans and return diff
 */
export function compareSprintPlans(
  oldPlan: SprintPlan,
  newPlan: SprintPlan
): {
  added: SprintPlan["memberPlans"];
  removed: SprintPlan["memberPlans"];
  changed: Array<{
    memberId: string;
    oldAllocated: number;
    newAllocated: number;
    oldTasks: number;
    newTasks: number;
  }>;
} {
  const oldMap = new Map(oldPlan.memberPlans.map((mp) => [mp.memberId, mp]));
  const newMap = new Map(newPlan.memberPlans.map((mp) => [mp.memberId, mp]));

  const added: SprintPlan["memberPlans"] = [];
  const removed: SprintPlan["memberPlans"] = [];
  const changed: Array<{
    memberId: string;
    oldAllocated: number;
    newAllocated: number;
    oldTasks: number;
    newTasks: number;
  }> = [];

  // Find added and changed
  for (const [memberId, newPlan] of newMap.entries()) {
    const oldPlan = oldMap.get(memberId);
    if (!oldPlan) {
      added.push(newPlan);
    } else if (
      oldPlan.allocatedMinutes !== newPlan.allocatedMinutes ||
      oldPlan.tasks.length !== newPlan.tasks.length
    ) {
      changed.push({
        memberId,
        oldAllocated: oldPlan.allocatedMinutes,
        newAllocated: newPlan.allocatedMinutes,
        oldTasks: oldPlan.tasks.length,
        newTasks: newPlan.tasks.length,
      });
    }
  }

  // Find removed
  for (const [memberId, oldPlan] of oldMap.entries()) {
    if (!newMap.has(memberId)) {
      removed.push(oldPlan);
    }
  }

  return { added, removed, changed };
}

