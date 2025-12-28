/**
 * Questboard store using @sb/storage abstraction
 */

import { storage, ConflictError } from "@sb/storage";
import { publish } from "@sb/events";
import type { Goal, Questline, Quest, UnlockCondition, Member, Task, Org, Template, TemplateQuestline } from "@sb/schemas";
import { assignTaskWithExplanation, assignTasks } from "@sb/assignment";

const GOAL_KIND = "goals";
const QUESTLINE_KIND = "questlines";
const QUEST_KIND = "quests";
const TASK_KIND = "tasks";
const MEMBER_KIND = "members";
const ORG_KIND = "orgs";
const TEMPLATE_KIND = "templates";
const TEMPLATE_QUESTLINE_KIND = "template_questlines";

export async function getAllGoals(): Promise<Goal[]> {
  return storage.list<Goal>(GOAL_KIND);
}

export async function getGoalById(id: string): Promise<Goal | undefined> {
  const goal = await storage.get<Goal>(GOAL_KIND, id);
  return goal || undefined;
}

export async function createGoal(title: string, orgId: string = "default-org"): Promise<Goal> {
  const goal: Goal = {
    id: `goal-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    title,
    createdAt: new Date().toISOString(),
    status: "draft",
    orgId, // Add orgId for Supabase compatibility
  };
  
  await storage.upsert(GOAL_KIND, goal);

  // Publish event
  await publish("quest.goal.created", {
    goalId: goal.id,
    title: goal.title,
  }, {
    sourceApp: "questboard",
  });

  return goal;
}

export async function updateGoal(id: string, updates: Partial<Goal>): Promise<Goal | null> {
  const existing = await storage.get<Goal>(GOAL_KIND, id);
  if (!existing) {
    return null;
  }
  
  const updated = { ...existing, ...updates };
  await storage.upsert(GOAL_KIND, updated);
  return updated;
}

// Questline storage functions
export async function getQuestlineById(id: string): Promise<Questline | null> {
  return storage.get<Questline>(QUESTLINE_KIND, id);
}

export async function getQuestlinesByGoalId(goalId: string): Promise<Questline[]> {
  return storage.list<Questline>(QUESTLINE_KIND, (q) => q.goalId === goalId);
}

export async function createQuestline(
  orgId: string,
  goalId: string,
  title: string,
  epic?: string
): Promise<Questline> {
  const questline: Questline = {
    id: `questline-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    orgId,
    goalId,
    title,
    epic,
    questIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await storage.upsert(QUESTLINE_KIND, questline);
  return questline;
}

export async function updateQuestline(
  id: string,
  updates: Partial<Questline>
): Promise<Questline | null> {
  const existing = await storage.get<Questline>(QUESTLINE_KIND, id);
  if (!existing) {
    return null;
  }
  
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await storage.upsert(QUESTLINE_KIND, updated);
  return updated;
}

// Quest storage functions
export async function getQuestById(id: string): Promise<Quest | null> {
  return storage.get<Quest>(QUEST_KIND, id);
}

export async function getQuestsByQuestlineId(questlineId: string): Promise<Quest[]> {
  return storage.list<Quest>(QUEST_KIND, (q) => q.questlineId === questlineId);
}

export async function createQuest(
  orgId: string,
  questlineId: string,
  title: string,
  objective: string,
  unlockConditions: UnlockCondition[] = []
): Promise<Quest> {
  const quest: Quest = {
    id: `quest-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    orgId,
    questlineId,
    title,
    objective,
    unlockConditions,
    taskIds: [],
    state: unlockConditions.length > 0 ? "locked" : "unlocked",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  await storage.upsert(QUEST_KIND, quest);
  return quest;
}

export async function updateQuest(
  id: string,
  updates: Partial<Quest>,
  actor?: { id: string; email?: string },
  expectedUpdatedAt?: string
): Promise<Quest | null> {
  const existing = await storage.get<Quest>(QUEST_KIND, id);
  if (!existing) {
    return null;
  }
  
  // If expectedUpdatedAt is provided, use optimistic concurrency control
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  
  try {
    if (expectedUpdatedAt) {
      await storage.updateWithVersion(QUEST_KIND, updated, expectedUpdatedAt);
    } else {
      await storage.upsert(QUEST_KIND, updated);
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      // Re-throw conflict error with latest entity
      throw error;
    }
    throw error;
  }
  
  // Emit audit event
  const correlationId = `quest-update-${id}-${Date.now()}`;
  await publish("audit.quest.changed", {
    questId: id,
    actor: actor?.id || actor?.email || "system",
    actorEmail: actor?.email,
    before: {
      state: existing.state,
      title: existing.title,
      taskIds: existing.taskIds,
    },
    after: {
      state: updated.state,
      title: updated.title,
      taskIds: updated.taskIds,
    },
    changes: Object.keys(updates),
  }, {
    orgId: existing.orgId,
    sourceApp: "questboard",
    correlationId,
  });
  
  return updated;
}

// Task storage functions
export async function getTaskById(id: string): Promise<Task | null> {
  return storage.get<Task>(TASK_KIND, id);
}

export async function getTasksByQuestId(questId: string): Promise<Task[]> {
  const quest = await getQuestById(questId);
  if (!quest) {
    return [];
  }
  
  const tasks = await Promise.all(
    quest.taskIds.map((taskId) => storage.get<Task>(TASK_KIND, taskId))
  );
  
  return tasks.filter((t): t is Task => t !== null);
}

export async function createTask(
  orgId: string,
  questId: string,
  title: string,
  description?: string,
  autoAssign: boolean = true
): Promise<Task> {
  const task: Task = {
    id: `task-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    orgId,
    title,
    description,
    status: "todo",
    priority: "medium",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  // Auto-assign if enabled
  if (autoAssign) {
    await autoAssignTask(task, orgId);
  }
  
  await storage.upsert(TASK_KIND, task);
  
  // Add task to quest
  const quest = await getQuestById(questId);
  if (quest) {
    await updateQuest(questId, {
      taskIds: [...quest.taskIds, task.id],
    });
  }
  
  await publish("task.created", {
    taskId: task.id,
    questId,
    title: task.title,
  }, {
    sourceApp: "questboard",
  });
  
  return task;
}

/**
 * Auto-assign a task based on Working Genius profiles
 */
async function autoAssignTask(task: Task, orgId: string): Promise<void> {
  // Get all members in the org
  const members = await storage.list<Member>(MEMBER_KIND, (m) => m.orgId === orgId);
  
  // Filter to members with profiles
  const candidates = members
    .filter((m) => m.workingGeniusProfile && m.dailyCapacityMinutes)
    .map((m) => {
      return {
        userId: m.id,
        profile: m.workingGeniusProfile!,
        currentWorkload: 0, // Will be calculated
        dailyCapacity: m.dailyCapacityMinutes || 480,
      };
    });
  
  if (candidates.length === 0) {
    return; // No candidates, leave unassigned
  }
  
  // Calculate current workload for each candidate
  const allTasks = await storage.list<Task>(TASK_KIND, (t) => t.orgId === orgId && t.status !== "done");
  for (const candidate of candidates) {
    candidate.currentWorkload = allTasks.filter((t) => t.owner === candidate.userId).length;
  }
  
  // Assign task
  const explanation = assignTaskWithExplanation(task, candidates);
  task.owner = explanation.assignedUserId;
}

/**
 * Re-assign all unassigned tasks in an org
 */
export async function reassignTasks(orgId: string): Promise<void> {
  const unassignedTasks = await storage.list<Task>(TASK_KIND, (t) => t.orgId === orgId && !t.owner && t.status !== "done");
  
  if (unassignedTasks.length === 0) {
    return;
  }
  
  // Get all members with profiles
  const members = await storage.list<Member>(MEMBER_KIND, (m) => m.orgId === orgId);
  const candidates = members
    .filter((m) => m.workingGeniusProfile && m.dailyCapacityMinutes)
    .map((m) => ({
      userId: m.id,
      profile: m.workingGeniusProfile!,
      currentWorkload: 0, // Will be calculated
      dailyCapacity: m.dailyCapacityMinutes || 480,
    }));
  
  if (candidates.length === 0) {
    return;
  }
  
  // Calculate workloads
  const allTasks = await storage.list<Task>(TASK_KIND, (t) => t.orgId === orgId && t.status !== "done");
  for (const candidate of candidates) {
    candidate.currentWorkload = allTasks.filter((t) => t.owner === candidate.userId).length;
  }
  
  // Assign all tasks
  const assignments = assignTasks(unassignedTasks, candidates);
  
  // Update tasks with assignments
  for (const [taskId, explanation] of assignments.entries()) {
    const task = await getTaskById(taskId);
    if (task) {
      const oldOwner = task.owner;
      await updateTask(taskId, { owner: explanation.assignedUserId });
      
      // Emit assignment change event with explanation
      if (oldOwner !== explanation.assignedUserId) {
        const correlationId = `assignment-${taskId}-${Date.now()}`;
        await publish("audit.assignment.changed", {
          taskId: taskId,
          taskTitle: task.title,
          actor: "system",
          before: { owner: oldOwner },
          after: { owner: explanation.assignedUserId },
          reason: explanation.scoreBreakdown.length > 0
            ? `Assigned to ${explanation.assignedUserId} (score: ${explanation.scoreBreakdown[0]?.score || 0})`
            : "Auto-assigned",
          explanation: explanation.scoreBreakdown.find(s => s.userId === explanation.assignedUserId),
          alternatives: explanation.alternatives,
        }, {
          orgId: orgId,
          sourceApp: "questboard",
          correlationId,
        });
      }
    }
  }
}

/**
 * Get assignment explanation for a task
 */
export async function getTaskAssignmentExplanation(taskId: string, orgId: string): Promise<any> {
  const task = await getTaskById(taskId);
  if (!task) {
    return null;
  }
  
  const members = await storage.list<Member>(MEMBER_KIND, (m) => m.orgId === orgId);
  const candidates = members
    .filter((m) => m.workingGeniusProfile && m.dailyCapacityMinutes)
    .map((m) => {
      return {
        userId: m.id,
        profile: m.workingGeniusProfile!,
        currentWorkload: 0,
        dailyCapacity: m.dailyCapacityMinutes || 480,
      };
    });
  
  if (candidates.length === 0) {
    return null;
  }
  
  // Calculate workloads
  const allTasks = await storage.list<Task>(TASK_KIND, (t) => t.orgId === orgId && t.status !== "done");
  for (const candidate of candidates) {
    candidate.currentWorkload = allTasks.filter((t) => t.owner === candidate.userId).length;
  }
  
  return assignTaskWithExplanation(task, candidates);
}

/**
 * Member management functions
 */
export async function getMembersByOrgId(orgId: string): Promise<Member[]> {
  return storage.list<Member>(MEMBER_KIND, (m) => m.orgId === orgId);
}

export async function getMemberById(id: string): Promise<Member | null> {
  return storage.get<Member>(MEMBER_KIND, id);
}

export async function updateMember(id: string, updates: Partial<Member>): Promise<Member | null> {
  const existing = await storage.get<Member>(MEMBER_KIND, id);
  if (!existing) {
    return null;
  }
  
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await storage.upsert(MEMBER_KIND, updated);
  return updated;
}

export async function updateTask(
  id: string,
  updates: Partial<Task>,
  actor?: { id: string; email?: string },
  expectedUpdatedAt?: string
): Promise<Task | null> {
  const existing = await storage.get<Task>(TASK_KIND, id);
  if (!existing) {
    return null;
  }
  
  // If expectedUpdatedAt is provided, use optimistic concurrency control
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  
  try {
    if (expectedUpdatedAt) {
      await storage.updateWithVersion(TASK_KIND, updated, expectedUpdatedAt);
    } else {
      await storage.upsert(TASK_KIND, updated);
    }
  } catch (error) {
    if (error instanceof ConflictError) {
      // Re-throw conflict error with latest entity
      throw error;
    }
    throw error;
  }
  
  // Emit audit event
  const correlationId = `task-update-${id}-${Date.now()}`;
  await publish("audit.task.changed", {
    taskId: id,
    actor: actor?.id || actor?.email || "system",
    actorEmail: actor?.email,
    before: {
      status: existing.status,
      owner: existing.owner,
      title: existing.title,
      priority: existing.priority,
    },
    after: {
      status: updated.status,
      owner: updated.owner,
      title: updated.title,
      priority: updated.priority,
    },
    changes: Object.keys(updates),
  }, {
    orgId: existing.orgId,
    sourceApp: "questboard",
    correlationId,
  });
  
  return updated;
}

export async function completeTask(id: string): Promise<Task | null> {
  const task = await getTaskById(id);
  if (!task) {
    return null;
  }
  
  if (task.status === "done") {
    return task; // Already completed
  }
  
  const updated = await updateTask(id, { status: "done" });
  if (!updated) {
    return null;
  }
  
  // Publish task.completed event
  await publish("task.completed", {
    taskId: updated.id,
    title: updated.title,
    requiresApproval: updated.requiresApproval || false,
  }, {
    sourceApp: "questboard",
  });
  
  // If task doesn't require approval, check unlocks immediately
  // Otherwise, wait for approval
  if (!updated.requiresApproval) {
    // Trigger unlocking evaluation
    await evaluateUnlocks(updated.id);
    
    // Check if quest should be completed (all tasks done)
    await checkQuestCompletion(updated.id);
  }
  
  return updated;
}

/**
 * Check if a quest should be marked as completed
 * Quest is completed when all its tasks are done
 */
/**
 * Check if a task is truly complete (done + approved if required)
 */
function isTaskTrulyComplete(task: Task): boolean {
  if (task.status !== "done") {
    return false;
  }
  // If task requires approval, it must be approved
  if (task.requiresApproval) {
    return !!task.approvedAt && !!task.approvedBy;
  }
  return true;
}

export async function checkQuestCompletion(completedTaskId: string): Promise<void> {
  // Find all quests that contain this task
  const allQuests = await storage.list<Quest>(QUEST_KIND);
  
  for (const quest of allQuests) {
    if (quest.taskIds.includes(completedTaskId) && quest.state !== "completed") {
      // Check if all tasks in this quest are truly complete (done + approved if required)
      const tasks = await Promise.all(
        quest.taskIds.map((taskId) => getTaskById(taskId))
      );
      
      const allTasksDone = tasks.every(
        (t) => t !== null && isTaskTrulyComplete(t)
      );
      
      if (allTasksDone) {
        await updateQuest(quest.id, {
          state: "completed",
          completedAt: new Date().toISOString(),
        });
        
        // Recursively check if completing this quest unlocks others
        await evaluateUnlocks(undefined, quest.id);
      } else {
        // Mark quest as in-progress if it has at least one task and isn't locked
        if (quest.state === "unlocked") {
          await updateQuest(quest.id, {
            state: "in-progress",
          });
        }
      }
    }
  }
}

/**
 * Approve a checkpoint task
 */
export async function approveTask(id: string, approvedBy: string): Promise<Task | null> {
  const task = await getTaskById(id);
  if (!task) {
    return null;
  }
  
  if (!task.requiresApproval) {
    throw new Error("Task does not require approval");
  }
  
  if (task.status !== "done") {
    throw new Error("Task must be completed before approval");
  }
  
  if (task.approvedAt) {
    return task; // Already approved
  }
  
  const updated = await updateTask(id, {
    approvedAt: new Date().toISOString(),
    approvedBy: approvedBy,
  });
  
  if (!updated) {
    return null;
  }
  
  await publish("task.approved", {
    taskId: id,
    title: task.title,
    approvedBy: approvedBy,
  }, {
    sourceApp: "questboard",
  });
  
  // Check if approving this task unlocks any quests (checkpoint passed)
  await evaluateUnlocks(id);
  
  // Check if approving this task completes a quest
  await checkQuestCompletion(id);
  
  // Check if this was a checkpoint that unlocked the next quest
  const quests = await storage.list<Quest>(QUEST_KIND, (q) => 
    q.taskIds.includes(id)
  );
  for (const quest of quests) {
    // Check if this quest's completion unlocks other quests
    const dependentQuests = await storage.list<Quest>(QUEST_KIND, (q) =>
      q.unlockConditions.some(
        (cond) => cond.type === "questCompleted" && cond.questId === quest.id
      )
    );
    
    for (const dependentQuest of dependentQuests) {
      const shouldUnlock = await checkUnlockConditions(dependentQuest);
      if (shouldUnlock && dependentQuest.state === "locked") {
        await publish("quest.checkpoint.passed", {
          questId: dependentQuest.id,
          questlineId: dependentQuest.questlineId,
          title: dependentQuest.title,
          checkpointTaskId: id,
          checkpointTaskTitle: task.title,
        }, {
          sourceApp: "questboard",
        });
      }
    }
  }
  
  return updated;
}

/**
 * Unlocking engine - evaluates unlock conditions and unlocks quests
 */
export async function evaluateUnlocks(completedTaskId?: string, completedQuestId?: string): Promise<void> {
  // Find all quests that might be affected
  const allQuests = await storage.list<Quest>(QUEST_KIND);
  
  for (const quest of allQuests) {
    if (quest.state === "locked") {
      const shouldUnlock = await checkUnlockConditions(quest, completedTaskId, completedQuestId);
      
      if (shouldUnlock) {
        await updateQuest(quest.id, {
          state: "unlocked",
          unlockedAt: new Date().toISOString(),
        });
        
        await publish("quest.unlocked", {
          questId: quest.id,
          questlineId: quest.questlineId,
          title: quest.title,
        }, {
          sourceApp: "questboard",
        });
        
        // Recursively check if unlocking this quest unlocks others
        await evaluateUnlocks(undefined, quest.id);
      }
    }
  }
}

/**
 * Check if unlock conditions are met for a quest
 * All conditions must be satisfied (AND logic)
 */
async function checkUnlockConditions(
  quest: Quest,
  completedTaskId?: string,
  completedQuestId?: string
): Promise<boolean> {
  if (quest.unlockConditions.length === 0) {
    return true; // No conditions = always unlocked
  }
  
  // All conditions must be met (AND logic)
  for (const condition of quest.unlockConditions) {
    let conditionMet = false;
    
    switch (condition.type) {
      case "taskCompleted":
        if (condition.taskId === completedTaskId) {
          // Check if task requires approval and is approved
          const task = await getTaskById(condition.taskId);
          conditionMet = task !== null && isTaskTrulyComplete(task);
        } else {
          // Check if task is completed and approved (if required)
          const task = await getTaskById(condition.taskId);
          conditionMet = task !== null && isTaskTrulyComplete(task);
        }
        break;
        
      case "questCompleted":
        if (condition.questId === completedQuestId) {
          conditionMet = true;
        } else {
          const prereqQuest = await getQuestById(condition.questId);
          conditionMet = prereqQuest !== null && prereqQuest.state === "completed";
        }
        break;
        
      case "allTasksCompleted":
        const allTasks = await Promise.all(
          condition.taskIds.map((id) => getTaskById(id))
        );
        conditionMet = allTasks.every(
          (t) => t !== null && isTaskTrulyComplete(t)
        );
        break;
        
      case "anyTaskCompleted":
        const anyTasks = await Promise.all(
          condition.taskIds.map((id) => getTaskById(id))
        );
        conditionMet = anyTasks.some(
          (t) => t !== null && isTaskTrulyComplete(t)
        );
        break;
    }
    
    // If any condition is not met, quest remains locked
    if (!conditionMet) {
      return false;
    }
  }
  
  // All conditions met
  return true;
}

/**
 * Get quests for a user (all quests in user's org, filtered by ownership if needed)
 */
export async function getQuestsForUser(userId: string, orgId?: string): Promise<Quest[]> {
  // For now, get all quests - in future, filter by user assignments
  const allQuests = await storage.list<Quest>(QUEST_KIND);
  
  if (orgId) {
    return allQuests.filter((q) => q.orgId === orgId);
  }
  
  return allQuests;
}

/**
 * Get blocked quests - quests that are locked but close to unlocking
 */
export async function getBlockedQuests(orgId?: string): Promise<Quest[]> {
  const allQuests = await storage.list<Quest>(QUEST_KIND);
  
  const blocked = allQuests.filter((q) => {
    if (q.state !== "locked") return false;
    if (orgId && q.orgId !== orgId) return false;
    
    // A quest is "blocked" if it has unlock conditions but isn't unlocked yet
    return q.unlockConditions.length > 0;
  });
  
  return blocked;
}

/**
 * Get quests ready to unlock - quests where most prerequisites are met
 */
export async function getReadyToUnlockQuests(orgId?: string): Promise<Quest[]> {
  const blocked = await getBlockedQuests(orgId);
  const ready: Quest[] = [];
  
  for (const quest of blocked) {
    // Check how many conditions are met
    let metCount = 0;
    for (const condition of quest.unlockConditions) {
      let conditionMet = false;
      
      switch (condition.type) {
        case "taskCompleted":
          const task = await getTaskById(condition.taskId);
          conditionMet = task !== null && task.status === "done";
          break;
        case "questCompleted":
          const prereqQuest = await getQuestById(condition.questId);
          conditionMet = prereqQuest !== null && prereqQuest.state === "completed";
          break;
        case "allTasksCompleted":
          const allTasks = await Promise.all(
            condition.taskIds.map((id) => getTaskById(id))
          );
          conditionMet = allTasks.every((t) => t !== null && t.status === "done");
          break;
        case "anyTaskCompleted":
          const anyTasks = await Promise.all(
            condition.taskIds.map((id) => getTaskById(id))
          );
          conditionMet = anyTasks.some((t) => t !== null && t.status === "done");
          break;
      }
      
      if (conditionMet) metCount++;
    }
    
    // If at least 50% of conditions are met, consider it "ready to unlock"
    if (metCount > 0 && metCount / quest.unlockConditions.length >= 0.5) {
      ready.push(quest);
    }
  }
  
  return ready;
}

/**
 * Org management functions
 */
export async function getOrgById(id: string): Promise<Org | null> {
  return storage.get<Org>(ORG_KIND, id);
}

export async function updateOrg(id: string, updates: Partial<Org>): Promise<Org | null> {
  const existing = await storage.get<Org>(ORG_KIND, id);
  if (!existing) {
    return null;
  }
  
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  await storage.upsert(ORG_KIND, updated);
  return updated;
}

/**
 * Get blocked tasks for a specific user
 */
export async function getBlockedTasksForUser(userId: string, orgId: string): Promise<Task[]> {
  const tasks = await storage.list<Task>(TASK_KIND, (t) => 
    t.orgId === orgId && 
    t.owner === userId && 
    t.status !== "done" &&
    t.blockers && 
    t.blockers.length > 0
  );
  return tasks;
}

/**
 * Get standup summary for a user (completed yesterday, doing today, blocked)
 */
export async function getStandupSummary(userId: string, orgId: string): Promise<{
  completedYesterday: Task[];
  doingToday: Task[];
  blocked: Task[];
}> {
  const { readEvents } = await import("@sb/events");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Get all tasks for this user
  const allTasks = await storage.list<Task>(TASK_KIND, (t) => 
    t.orgId === orgId && t.owner === userId
  );
  
  // Get completion events from yesterday
  const allEvents = readEvents();
  const yesterdayCompletionEvents = allEvents.filter(e => {
    if (e.type !== "task.completed") return false;
    const eventDate = new Date(e.createdAt);
    return eventDate >= yesterday && eventDate < today;
  });
  
  // Get task IDs completed yesterday from events
  const completedYesterdayTaskIds = new Set(
    yesterdayCompletionEvents
      .map(e => (e.payload as any).taskId)
      .filter(Boolean)
  );
  
  // Completed yesterday - tasks that were completed yesterday (from events)
  const completedYesterday = allTasks.filter(t => 
    completedYesterdayTaskIds.has(t.id)
  );
  
  // Doing today - tasks that are in-progress or todo (excluding done/blocked status)
  // Prioritize in-progress tasks, then todo tasks without blockers
  const doingToday = allTasks.filter(t => 
    t.status !== "done" &&
    (!t.blockers || t.blockers.length === 0) &&
    (t.status === "in-progress" || t.status === "todo")
  );
  
  // Blocked - tasks with blockers (not done)
  const blocked = allTasks.filter(t => 
    t.status !== "done" &&
    t.blockers && 
    t.blockers.length > 0
  );
  
  return { completedYesterday, doingToday, blocked };
}

/**
 * Get team pulse - capacity, blockers, and active quest for each member
 */
export async function getTeamPulse(orgId: string): Promise<Array<{
  memberId: string;
  memberEmail: string;
  capacityUsed: number; // Minutes used today (estimated from tasks)
  capacityTotal: number; // Total daily capacity
  blockersCount: number;
  activeQuestTitle?: string;
}>> {
  const members = await getMembersByOrgId(orgId);
  const allTasks = await storage.list<Task>(TASK_KIND, (t) => 
    t.orgId === orgId && t.status !== "done"
  );
  const allQuests = await storage.list<Quest>(QUEST_KIND, (q) => 
    q.orgId === orgId && (q.state === "unlocked" || q.state === "in-progress")
  );
  
  const pulse = members.map(member => {
    const memberTasks = allTasks.filter(t => t.owner === member.id);
    
    // Estimate capacity used (rough: 1 task = 60 minutes)
    const capacityUsed = memberTasks.length * 60;
    const capacityTotal = member.dailyCapacityMinutes || 480;
    
    // Count blockers
    const blockersCount = memberTasks.filter(t => 
      t.blockers && t.blockers.length > 0
    ).length;
    
    // Find active quest (first unlocked/in-progress quest with tasks for this member)
    let activeQuestTitle: string | undefined;
    for (const quest of allQuests) {
      const questTasks = memberTasks.filter(t => quest.taskIds.includes(t.id));
      if (questTasks.length > 0) {
        activeQuestTitle = quest.title;
        break;
      }
    }
    
    return {
      memberId: member.id,
      memberEmail: member.email,
      capacityUsed,
      capacityTotal,
      blockersCount,
      activeQuestTitle,
    };
  });
  
  return pulse;
}

/**
 * Get last questmaster run time from events
 */
export async function getLastQuestmasterRun(orgId: string): Promise<string | null> {
  const { readEvents } = await import("@sb/events");
  const events = readEvents(1000); // Get last 1000 events
  
  // Find last questmaster.dryrun.completed or quest.deck.generated event
  const questmasterEvents = events
    .filter(e => 
      (e.type === "questmaster.dryrun.completed" || e.type === "quest.deck.generated") &&
      (!e.orgId || e.orgId === orgId)
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  if (questmasterEvents.length > 0) {
    return questmasterEvents[0].createdAt;
  }
  
  return null;
}

/**
 * Template storage functions
 */
export async function getAllTemplates(orgId: string): Promise<Template[]> {
  return storage.list<Template>(TEMPLATE_KIND, (t) => t.orgId === orgId);
}

export async function getTemplateById(id: string): Promise<Template | null> {
  return storage.get<Template>(TEMPLATE_KIND, id);
}

export async function searchTemplates(orgId: string, searchQuery?: string, tags?: string[]): Promise<Template[]> {
  let templates = await getAllTemplates(orgId);
  
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    templates = templates.filter(t => 
      t.title.toLowerCase().includes(query) ||
      (t.description && t.description.toLowerCase().includes(query))
    );
  }
  
  if (tags && tags.length > 0) {
    templates = templates.filter(t => 
      tags.some(tag => t.tags.includes(tag))
    );
  }
  
  return templates;
}

export async function getTemplateQuestline(templateId: string): Promise<TemplateQuestline | null> {
  return storage.get<TemplateQuestline>(TEMPLATE_QUESTLINE_KIND, templateId);
}

export async function saveTemplate(
  orgId: string,
  questlineId: string,
  title: string,
  description: string | undefined,
  tags: string[],
  createdBy: string
): Promise<{ template: Template; templateQuestline: TemplateQuestline }> {
  // Get the questline and its quests/tasks
  const questline = await getQuestlineById(questlineId);
  if (!questline) {
    throw new Error("Questline not found");
  }
  
  const quests = await getQuestsByQuestlineId(questlineId);
  
  // Get all tasks for all quests first to build a lookup map
  const questTasksMap = new Map<string, Task[]>();
  for (const quest of quests) {
    const tasks = await getTasksByQuestId(quest.id);
    questTasksMap.set(quest.id, tasks);
  }
  
  const questDefinitions = await Promise.all(quests.map(async (quest) => {
    const tasks = questTasksMap.get(quest.id) || [];
    const questIndex = quests.indexOf(quest);
    
    return {
      title: quest.title,
      objective: quest.objective,
      unlockConditions: quest.unlockConditions.map(cond => {
        // Convert unlock conditions to use indices
        if (cond.type === "questCompleted") {
          const sourceQuestIndex = quests.findIndex(q => q.id === cond.questId);
          return {
            type: "questCompleted" as const,
            questIndex: sourceQuestIndex >= 0 ? sourceQuestIndex : undefined,
          };
        } else if (cond.type === "taskCompleted") {
          // Find which quest this task belongs to and its index
          for (let i = 0; i < quests.length; i++) {
            const sourceQuestTasks = questTasksMap.get(quests[i].id) || [];
            const taskIndex = sourceQuestTasks.findIndex(t => t.id === cond.taskId);
            if (taskIndex >= 0) {
              return {
                type: "taskCompleted" as const,
                questIndex: i,
                taskIndex,
              };
            }
          }
          return {
            type: "taskCompleted" as const,
          };
        } else if (cond.type === "allTasksCompleted" || cond.type === "anyTaskCompleted") {
          // Find which quest these tasks belong to (they should all be in the same quest)
          let sourceQuestIndex = -1;
          const taskIndices: number[] = [];
          
          for (const taskId of cond.taskIds) {
            let found = false;
            for (let i = 0; i < quests.length; i++) {
              const sourceQuestTasks = questTasksMap.get(quests[i].id) || [];
              const taskIndex = sourceQuestTasks.findIndex(t => t.id === taskId);
              if (taskIndex >= 0) {
                if (sourceQuestIndex === -1) {
                  sourceQuestIndex = i;
                }
                taskIndices.push(taskIndex);
                found = true;
                break;
              }
            }
            if (!found) {
              // Task not found, skip it
              console.warn(`Task ${taskId} not found when saving template`);
            }
          }
          
          return {
            type: cond.type,
            questIndex: sourceQuestIndex >= 0 ? sourceQuestIndex : undefined,
            taskIndices,
          };
        }
        return cond;
      }),
      tasks: tasks.map(task => ({
        title: task.title,
        description: task.description,
        requiresApproval: task.requiresApproval,
        priority: task.priority,
      })),
    };
  }));
  
  // Create template
  const template: Template = {
    id: `template-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    orgId,
    title,
    description,
    tags: tags || [],
    createdBy,
    createdAt: new Date().toISOString(),
  };
  
  await storage.upsert(TEMPLATE_KIND, template);
  
  // Create template questline
  const templateQuestline: TemplateQuestline = {
    id: template.id, // Use template.id as the storage key
    templateId: template.id,
    questlineDefinition: {
      title: questline.title,
      description: questline.description,
      epic: questline.epic,
      quests: questDefinitions,
    },
  };
  
  await storage.upsert(TEMPLATE_QUESTLINE_KIND, templateQuestline);
  
  // Publish event
  await publish("template.saved", {
    templateId: template.id,
    title: template.title,
    questlineId,
    createdBy,
  }, {
    sourceApp: "questboard",
    orgId,
  });
  
  return { template, templateQuestline };
}

export async function spawnGoalFromTemplate(
  templateId: string,
  goalTitle: string,
  orgId: string,
  adaptedQuestlineDefinition?: TemplateQuestline["questlineDefinition"]
): Promise<Goal> {
  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error("Template not found");
  }
  
  const templateQuestline = await getTemplateQuestline(templateId);
  if (!templateQuestline) {
    throw new Error("Template questline not found");
  }
  
  // Use adapted definition if provided, otherwise use original
  const questlineDefinition = adaptedQuestlineDefinition || templateQuestline.questlineDefinition;
  
  // Create goal
  const goal = await createGoal(goalTitle, orgId);
  
  // Create questline from template
  const questline = await createQuestline(
    orgId,
    goal.id,
    questlineDefinition.title,
    questlineDefinition.epic
  );
  
  // Create quests first (without task-based unlock conditions)
  const createdQuestIds: string[] = [];
  const questTaskMaps: Map<number, string[]> = new Map(); // questIndex -> taskIds[]
  
  for (let questIndex = 0; questIndex < questlineDefinition.quests.length; questIndex++) {
    const questDef = questlineDefinition.quests[questIndex];
    
    // Only include questCompleted unlock conditions for now
    const questUnlockConditions: UnlockCondition[] = questDef.unlockConditions
      .filter(cond => cond.type === "questCompleted" && cond.questIndex !== undefined)
      .map(cond => ({
        type: "questCompleted" as const,
        questId: createdQuestIds[cond.questIndex!],
      }));
    
    const quest = await createQuest(
      orgId,
      questline.id,
      questDef.title,
      questDef.objective,
      questUnlockConditions
    );
    
    createdQuestIds.push(quest.id);
    
    // Create tasks for this quest
    const createdTaskIds: string[] = [];
    for (const taskDef of questDef.tasks) {
      const task = await createTask(
        orgId,
        quest.id,
        taskDef.title,
        taskDef.description,
        false // Don't auto-assign during template spawn
      );
      
      if (taskDef.requiresApproval) {
        await updateTask(task.id, { requiresApproval: true });
      }
      if (taskDef.priority) {
        await updateTask(task.id, { priority: taskDef.priority as any });
      }
      
      createdTaskIds.push(task.id);
    }
    
    questTaskMaps.set(questIndex, createdTaskIds);
  }
  
  // Now update unlock conditions that reference tasks
  for (let questIndex = 0; questIndex < questlineDefinition.quests.length; questIndex++) {
    const questDef = questlineDefinition.quests[questIndex];
    const quest = await getQuestById(createdQuestIds[questIndex]);
    if (!quest) continue;
    
    const taskBasedConditions: UnlockCondition[] = [];
    
    for (const cond of questDef.unlockConditions) {
      if (cond.type === "taskCompleted" && cond.questIndex !== undefined && cond.taskIndex !== undefined) {
        const sourceQuestTasks = questTaskMaps.get(cond.questIndex);
        if (sourceQuestTasks && sourceQuestTasks[cond.taskIndex]) {
          taskBasedConditions.push({
            type: "taskCompleted",
            taskId: sourceQuestTasks[cond.taskIndex],
          });
        }
      } else if ((cond.type === "allTasksCompleted" || cond.type === "anyTaskCompleted") && 
                 cond.questIndex !== undefined && cond.taskIndices) {
        const sourceQuestTasks = questTaskMaps.get(cond.questIndex);
        if (sourceQuestTasks) {
          const taskIds = cond.taskIndices
            .filter(idx => idx < sourceQuestTasks.length)
            .map(idx => sourceQuestTasks[idx]);
          
          if (taskIds.length > 0) {
            taskBasedConditions.push({
              type: cond.type,
              taskIds,
            } as UnlockCondition);
          }
        }
      }
    }
    
    // Update quest with task-based unlock conditions
    if (taskBasedConditions.length > 0) {
      await updateQuest(quest.id, {
        unlockConditions: [...quest.unlockConditions, ...taskBasedConditions],
      });
    }
  }
  
  // Update questline with quest IDs
  await updateQuestline(questline.id, {
    questIds: createdQuestIds,
  });
  
  return goal;
}

