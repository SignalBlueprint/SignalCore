/**
 * Questboard MVP0 Server
 */

// Load environment variables from root .env file
// This is done automatically via @sb/config, but we import it here to ensure it loads
import "@sb/config";

import express from "express";
import * as path from "path";
import * as fs from "fs";
import {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  createQuestline,
  getQuestlinesByGoalId,
  getQuestlinesByOrgId,
  updateQuestline,
  createQuest,
  getQuestsByQuestlineId,
  getQuestById,
  createTask,
  getTasksByQuestId,
  completeTask,
  approveTask,
  getQuestsForUser,
  getBlockedQuests,
  getReadyToUnlockQuests,
  reassignTasks,
  getTaskAssignmentExplanation,
  getMembersByOrgId,
  getMemberById,
  createMember,
  updateMember,
  getOrgById,
  updateOrg,
  getTaskById,
  updateTask,
  evaluateUnlocks,
  checkQuestCompletion,
  getBlockedTasksForUser,
  getStandupSummary,
  getTeamPulse,
  getLastQuestmasterRun,
  getEntityCounts,
  getJobRunSummaries,
  getAllGoals,
  getReadyTasks,
  listOrgs,
  getMemberProfilesByOrgId,
  getMemberProfile,
  saveMemberProfile,
  getOrgSettings,
  updateOrgSettings,
  buildTeamSnapshot,
} from "./store";
import { getUserQuestDeck, assignTaskWithExplanation, assignTasks } from "@sb/assignment";
import { publish, queryEventsByEntity, readEvents } from "@sb/events";
import { getStorageInfo } from "@sb/storage";
import { runClarifyGoal, runDecomposeGoal, runExpandTask } from "@sb/ai";
import { runQuestmaster } from "./questmaster";
import {
  generateSprintPlan,
  getSprintPlan,
  getSprintPlans,
  approveSprintPlan,
  compareSprintPlans,
} from "./sprintplanner";
import { storage, ConflictError } from "@sb/storage";
import type { Org, Goal, Task, Quest } from "@sb/schemas";
import {
  getAllTemplates,
  getTemplateById,
  searchTemplates,
  getTemplateQuestline,
  saveTemplate,
  spawnGoalFromTemplate,
} from "./store";
import { adaptTemplate } from "@sb/ai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Wrap res.send
  res.send = function(body) {
    const duration = Date.now() - startTime;
    const status = res.statusCode || 200;
    console.log(`${req.method} ${req.path} ${status} ${duration}ms`);
    return originalSend.call(this, body);
  };
  
  // Also wrap res.json to ensure logging works
  res.json = function(body) {
    const duration = Date.now() - startTime;
    const status = res.statusCode || 200;
    console.log(`${req.method} ${req.path} ${status} ${duration}ms`);
    return originalJson.call(this, body);
  };
  
  next();
});

// Health check endpoint (before other routes)
app.get("/health", (req, res) => {
  res.status(200).type("text/plain").send("ok");
});

// Status endpoint
app.get("/api/status", async (req, res) => {
  try {
    const storageInfo = getStorageInfo();
    const orgId = (req.query.orgId as string) || "default-org";
    
    // Get counts (with error handling)
    let orgCount = 0;
    let goalCount = 0;
    let lastJobRuns: Array<{ jobId: string; status: string; finishedAt: string }> = [];
    
    try {
      const orgs = await listOrgs();
      orgCount = orgs.length;
      
      const goals = await getAllGoals();
      goalCount = goals.filter(g => g.orgId === orgId).length;
      
      const summaries = await getJobRunSummaries(orgId, 5);
      lastJobRuns = summaries.map(s => ({
        jobId: s.jobId,
        status: s.status,
        finishedAt: s.finishedAt,
      }));
    } catch (error) {
      // If we can't get counts, just use 0
      console.warn("Failed to get status counts:", error);
    }
    
    res.json({
      ok: true,
      path: req.path,
      method: req.method,
      storageMode: storageInfo.mode.toLowerCase(),
      orgCount,
      goalCount,
      lastJobRuns,
    });
  } catch (error) {
    console.error("Status endpoint error:", error);
    res.status(500).json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// API Routes

// Get all goals
app.get("/api/goals", async (req, res) => {
  const goals = await getAllGoals();
  res.json(goals);
});

// Get goal by ID
app.get("/api/goals/:id", async (req, res) => {
  const goal = await getGoalById(req.params.id);
  if (!goal) {
    return res.status(404).json({ error: "Goal not found" });
  }
  res.json(goal);
});

// Create new goal
app.post("/api/goals", async (req, res) => {
  const { title, orgId } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  const goal = await createGoal(title, orgId || "default-org");
  res.json(goal);
});

// Clarify goal
app.post("/api/goals/:id/clarify", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured",
        details: "Please set OPENAI_API_KEY environment variable"
      });
    }

    const clarifyOutput = await runClarifyGoal(goal.title);
    
    // Re-clarify invalidates prior approval - clear approval fields
    const updates: Partial<Goal> = {
      clarifyOutput,
      status: "clarified_pending_approval",
      approvedAt: undefined,
      deniedAt: undefined,
      denialReason: undefined,
    };
    
    const updated = await updateGoal(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Publish event
    await publish("quest.goal.clarified", {
      goalId: updated.id,
      title: updated.title,
    }, {
      sourceApp: "questboard",
    });

    res.json(updated);
  } catch (error) {
    console.error("Clarify error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: "Failed to clarify goal",
      details: errorMessage,
      // Include helpful hints for common errors
      hint: errorMessage.includes("API key") 
        ? "Check that OPENAI_API_KEY is set in your environment"
        : errorMessage.includes("rate limit")
        ? "OpenAI API rate limit exceeded. Please try again later."
        : undefined
    });
  }
});

// Approve clarified goal
app.post("/api/goals/:id/approve", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }
    if (!goal.clarifyOutput) {
      return res.status(400).json({ error: "Goal must be clarified first" });
    }
    if (goal.status !== "clarified_pending_approval") {
      return res.status(400).json({ error: "Goal must be in clarified_pending_approval state" });
    }

    const updated = await updateGoal(req.params.id, {
      status: "approved",
      approvedAt: new Date().toISOString(),
      deniedAt: undefined,
      denialReason: undefined,
    });
    if (!updated) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Publish event
    await publish("quest.goal.approved", {
      goalId: updated.id,
      title: updated.title,
    }, {
      sourceApp: "questboard",
    });

    res.json(updated);
  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({ error: "Failed to approve goal" });
  }
});

// Deny clarified goal
app.post("/api/goals/:id/deny", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }
    if (!goal.clarifyOutput) {
      return res.status(400).json({ error: "Goal must be clarified first" });
    }
    if (goal.status !== "clarified_pending_approval") {
      return res.status(400).json({ error: "Goal must be in clarified_pending_approval state" });
    }

    const { reason } = req.body;
    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({ error: "Denial reason is required" });
    }

    const updated = await updateGoal(req.params.id, {
      status: "denied",
      deniedAt: new Date().toISOString(),
      denialReason: reason.trim(),
      approvedAt: undefined,
    });
    if (!updated) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Publish event
    await publish("quest.goal.denied", {
      goalId: updated.id,
      title: updated.title,
      reason: updated.denialReason,
    }, {
      sourceApp: "questboard",
    });

    res.json(updated);
  } catch (error) {
    console.error("Deny error:", error);
    res.status(500).json({ error: "Failed to deny goal" });
  }
});

// Decompose goal - creates stored questlines, quests, and tasks with auto-assignment
app.post("/api/goals/:id/decompose", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }
    if (!goal.clarifyOutput) {
      return res.status(400).json({ error: "Goal must be clarified first" });
    }
    if (goal.status !== "approved") {
      return res.status(400).json({ 
        error: "Goal must be approved before decomposition",
        currentStatus: goal.status 
      });
    }

    const orgId = goal.orgId || "default-org";
    
    // Fetch team snapshot for AI decomposition
    const teamSnapshot = await buildTeamSnapshot(orgId);
    
    // Run decomposition with team snapshot
    const decomposeOutput = await runDecomposeGoal(goal.id, goal.clarifyOutput, teamSnapshot);
    
    // Get all members with profiles for assignment
    const members = await getMembersByOrgId(orgId);
    const memberProfiles = await getMemberProfilesByOrgId(orgId);
    const profileMap = new Map(memberProfiles.map(p => [p.memberId, p]));
    
    // Get existing tasks to calculate current workload
    const existingTasks = await storage.list<Task>("tasks", (t) => t.orgId === orgId && t.status !== "done" && t.owner);
    const workloadByMember: Record<string, number> = {};
    members.forEach(m => {
      const memberTasks = existingTasks.filter(t => t.owner === m.id);
      workloadByMember[m.id] = memberTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0);
    });
    
    // Create stored entities from decompose output
    const createdQuestlines = [];
    const allCreatedTasks: Task[] = [];
    const questIdMap = new Map<string, string>(); // Map AI quest IDs to real quest IDs
    
    // First pass: create questlines and quests
    for (const ql of decomposeOutput.questlines) {
      // Create questline
      const questline = await createQuestline(
        orgId,
        goal.id,
        ql.title,
        ql.description
      );
      
      const questIds: string[] = [];
      
      // Create quests for this questline (if AI provided them)
      if (ql.quests && ql.quests.length > 0) {
        for (const aiQuest of ql.quests) {
          // Map prerequisite IDs from AI quest IDs to real quest IDs
          const unlockConditions = aiQuest.tasks
            ?.filter(t => t.id && questIdMap.has(t.id))
            .map(t => ({
              type: "taskCompleted" as const,
              taskId: questIdMap.get(t.id)!,
            })) || [];
          
          const quest = await createQuest(
            orgId,
            questline.id,
            aiQuest.title,
            aiQuest.objective,
            unlockConditions
          );
          
          questIdMap.set(aiQuest.id, quest.id);
          questIds.push(quest.id);
          
          // Create tasks for this quest
          if (aiQuest.tasks && aiQuest.tasks.length > 0) {
            for (const aiTask of aiQuest.tasks) {
              const task = await createTask(
                orgId,
                quest.id,
                aiTask.title,
                aiTask.description,
                false // Don't auto-assign yet, we'll do it in batch
              );
              
              // Update task with phase, estimated minutes, priority, and requiresApproval
              const taskUpdates: Partial<Task> = {
                phase: aiTask.phase,
                estimatedMinutes: aiTask.estimatedMinutes,
                priority: (aiTask.priority || "medium") as any,
                requiresApproval: aiTask.requiresApproval || false,
                acceptanceCriteria: aiTask.acceptanceCriteria,
                expandState: decomposeOutput.expansionCandidates?.includes(aiTask.id) ? "ready" : undefined,
                expansionDepth: 0,
                assignmentReason: aiTask.suggestedOwnerEmail ? {
                  aiSuggestedOwner: aiTask.suggestedOwnerEmail,
                } : undefined,
              };
              
              // Set DoD from acceptance criteria if available
              if (aiTask.acceptanceCriteria && aiTask.acceptanceCriteria.length > 0) {
                taskUpdates.dod = aiTask.acceptanceCriteria.join("\n");
              }
              
              const updatedTask = await updateTask(task.id, taskUpdates);
              if (updatedTask) {
                allCreatedTasks.push(updatedTask);
              }
            }
          }
        }
      } else {
        // Fallback: create a single quest if AI didn't provide quests
        const quest = await createQuest(
          orgId,
          questline.id,
          ql.title,
          ql.description,
          ql.prerequisiteIds?.map((prereqId) => ({
            type: "questCompleted" as const,
            questId: prereqId,
          })) || []
        );
        questIds.push(quest.id);
      }
      
      await updateQuestline(questline.id, {
        questIds,
      });
      
      createdQuestlines.push(questline);
    }
    
    // Second pass: Auto-assign all created tasks
    if (allCreatedTasks.length > 0 && memberProfiles.length > 0) {
      // Build candidates array for assignment
      const candidates = members
        .filter(m => profileMap.has(m.id))
        .map(m => {
          const profile = profileMap.get(m.id)!;
          return {
            userId: m.id,
            email: m.email,
            profile: {
              top2: [profile.top2[0] as any, profile.top2[1] as any],
              competency2: [profile.competency2[0] as any, profile.competency2[1] as any],
              frustration2: [profile.frustration2[0] as any, profile.frustration2[1] as any],
            },
            currentWorkloadMinutes: workloadByMember[m.id] || 0,
            dailyCapacity: profile.dailyCapacityMinutes || 480,
          };
        });
      
      // Assign tasks
      const assignments = assignTasks(allCreatedTasks, candidates);

      // Update tasks with assignments and assignment reasons
      for (const task of allCreatedTasks) {
        const explanation = assignments.get(task.id);
        if (explanation) {
          const assignedScore = explanation.scores.find(s => s.userId === explanation.assignedUserId);
          await updateTask(task.id, {
            owner: explanation.assignedUserId,
            assignmentReason: {
              scoreBreakdown: assignedScore?.breakdown,
              alternatives: explanation.topAlternatives,
              aiSuggestedOwner: task.assignmentReason?.aiSuggestedOwner,
            },
          });
        }
      }

      // Auto-assign questline owners based on majority task ownership and Working Genius fit
      for (const questline of createdQuestlines) {
        const questlineTasks = allCreatedTasks.filter(t => t.questlineId === questline.id);
        if (questlineTasks.length === 0) continue;

        // Count tasks by owner
        const tasksByOwner = new Map<string, number>();
        questlineTasks.forEach(task => {
          if (task.owner) {
            tasksByOwner.set(task.owner, (tasksByOwner.get(task.owner) || 0) + 1);
          }
        });

        // Find owner with most tasks in this questline
        let primaryOwner: string | undefined;
        let maxTasks = 0;
        for (const [ownerId, taskCount] of tasksByOwner.entries()) {
          if (taskCount > maxTasks) {
            maxTasks = taskCount;
            primaryOwner = ownerId;
          }
        }

        if (primaryOwner) {
          const ownerMember = members.find(m => m.id === primaryOwner);
          const ownerProfile = ownerMember ? profileMap.get(primaryOwner) : undefined;

          await updateQuestline(questline.id, {
            owner: ownerMember?.email,
            assignmentReason: ownerProfile
              ? `Primary owner of ${maxTasks}/${questlineTasks.length} tasks. Working Genius: ${ownerProfile.top2.join(', ')}`
              : `Primary owner of ${maxTasks}/${questlineTasks.length} tasks`,
          });
        }
      }
    }

    const updated = await updateGoal(req.params.id, {
      decomposeOutput,
      status: "decomposed",
      decomposedAt: new Date().toISOString(),
    });
    if (!updated) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Publish event
    await publish("quest.goal.decomposed", {
      goalId: updated.id,
      title: updated.title,
      questlineCount: decomposeOutput.questlines.length,
      taskCount: allCreatedTasks.length,
    }, {
      sourceApp: "questboard",
    });

    res.json({ 
      ...updated, 
      createdQuestlines,
      createdTasks: allCreatedTasks.length,
      assignedTasks: allCreatedTasks.length,
    });
  } catch (error) {
    console.error("Decompose error:", error);
    res.status(500).json({ error: "Failed to decompose goal" });
  }
});

// Get questlines for a goal
app.get("/api/goals/:id/questlines", async (req, res) => {
  const questlines = await getQuestlinesByGoalId(req.params.id);
  res.json(questlines);
});

// Get assignment review for a goal (after decomposition)
app.get("/api/goals/:id/assignment-review", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }
    if (goal.status !== "decomposed") {
      return res.status(400).json({ error: "Goal must be decomposed first" });
    }

    const orgId = goal.orgId || "default-org";
    
    // Get all questlines and their quests
    const questlines = await getQuestlinesByGoalId(goal.id);
    const allQuests: Quest[] = [];
    for (const ql of questlines) {
      const quests = await getQuestsByQuestlineId(ql.id);
      allQuests.push(...quests);
    }
    
    // Get all tasks from all quests
    const allTasks: Task[] = [];
    for (const quest of allQuests) {
      const tasks = await getTasksByQuestId(quest.id);
      allTasks.push(...tasks);
    }
    
    // Get members with profiles
    const members = await getMembersByOrgId(orgId);
    const memberProfiles = await getMemberProfilesByOrgId(orgId);
    const profileMap = new Map(memberProfiles.map(p => [p.memberId, p]));
    
    // Build a map of taskId -> quest for quick lookup
    const taskToQuestMap = new Map<string, Quest>();
    for (const quest of allQuests) {
      for (const taskId of quest.taskIds) {
        taskToQuestMap.set(taskId, quest);
      }
    }
    
    // Build a map of questId -> questline for quick lookup
    const questToQuestlineMap = new Map<string, string>();
    for (const ql of questlines) {
      for (const questId of ql.questIds) {
        questToQuestlineMap.set(questId, ql.id);
      }
    }
    
    // Build assignment review by member
    const reviewByMember = members
      .filter(m => profileMap.has(m.id))
      .map(m => {
        const profile = profileMap.get(m.id)!;
        const memberTasks = allTasks.filter(t => t.owner === m.id);
        const totalMinutes = memberTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0);
        const capacity = profile.dailyCapacityMinutes || 480;
        const isOverloaded = totalMinutes > capacity;
        
        return {
          memberId: m.id,
          memberEmail: m.email,
          memberRole: m.role,
          capacityMinutes: capacity,
          allocatedMinutes: totalMinutes,
          utilizationPercent: capacity > 0 ? Math.round((totalMinutes / capacity) * 100) : 0,
          isOverloaded,
          tasks: memberTasks.map(t => {
            const quest = taskToQuestMap.get(t.id);
            const questlineId = quest ? questToQuestlineMap.get(quest.id) : undefined;
            return {
              taskId: t.id,
              title: t.title,
              questlineId,
              questId: quest?.id,
              estimatedMinutes: t.estimatedMinutes || 60,
              phase: t.phase,
              priority: t.priority,
              assignmentReason: t.assignmentReason,
            };
          }),
        };
      });
    
    // Also include unassigned tasks
    const unassignedTasks = allTasks.filter(t => !t.owner);
    
    res.json({
      goalId: goal.id,
      goalTitle: goal.title,
      orgId,
      members: reviewByMember,
      unassignedTasks: unassignedTasks.map(t => ({
        taskId: t.id,
        title: t.title,
        estimatedMinutes: t.estimatedMinutes || 60,
        phase: t.phase,
        priority: t.priority,
      })),
      totalTasks: allTasks.length,
      assignedTasks: allTasks.filter(t => t.owner).length,
      totalEstimatedMinutes: allTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0),
    });
  } catch (error) {
    console.error("Assignment review error:", error);
    res.status(500).json({ error: "Failed to get assignment review" });
  }
});

// Expand a task into subtasks
app.post("/api/tasks/:id/expand", async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Check expansion state
    if (task.expandState === "locked") {
      return res.status(400).json({ error: "Task is locked and cannot be expanded" });
    }
    if (task.expandState === "expanded") {
      return res.status(400).json({ error: "Task has already been expanded" });
    }
    if (task.expansionDepth && task.expansionDepth >= 2) {
      return res.status(400).json({ error: "Maximum expansion depth (2) reached" });
    }

    const orgId = task.orgId;
    
    // Fetch team snapshot for expansion
    const teamSnapshot = await buildTeamSnapshot(orgId);
    
    // Run expansion
    const expansion = await runExpandTask({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        phase: task.phase,
        acceptance: task.acceptanceCriteria || (task.dod ? [task.dod] : []),
      },
      teamSnapshot,
    });

    // Get quest that contains this task
    const allQuests = await storage.list<Quest>("quests", (q) => q.orgId === orgId);
    const parentQuest = allQuests.find(q => q.taskIds.includes(task.id));
    
    if (!parentQuest) {
      return res.status(400).json({ error: "Task is not part of any quest" });
    }

    // Get members with profiles for assignment
    const members = await getMembersByOrgId(orgId);
    const memberProfiles = await getMemberProfilesByOrgId(orgId);
    const profileMap = new Map(memberProfiles.map(p => [p.memberId, p]));
    
    // Get existing tasks to calculate current workload
    const existingTasks = await storage.list<Task>("tasks", (t) => t.orgId === orgId && t.status !== "done" && t.owner);
    const workloadByMember: Record<string, number> = {};
    members.forEach(m => {
      const memberTasks = existingTasks.filter(t => t.owner === m.id);
      workloadByMember[m.id] = memberTasks.reduce((sum, t) => sum + (t.estimatedMinutes || 60), 0);
    });

    // Create subtasks
    const createdSubtasks: Task[] = [];
    for (const subtask of expansion.subtasks) {
      const newTask = await createTask(
        orgId,
        parentQuest.id,
        subtask.title,
        subtask.description,
        false // Don't auto-assign yet
      );

      // Update subtask with all fields
      const taskUpdates: Partial<Task> = {
        phase: subtask.phase as any,
        estimatedMinutes: subtask.estimatedMinutes,
        priority: (subtask.priority || "medium") as any,
        acceptanceCriteria: subtask.acceptanceCriteria,
        parentTaskId: task.id,
        expandState: "ready",
        expansionDepth: (task.expansionDepth || 0) + 1,
        assignmentReason: subtask.ownerHintEmail ? {
          aiSuggestedOwner: subtask.ownerHintEmail,
        } : undefined,
      };

      if (subtask.acceptanceCriteria && subtask.acceptanceCriteria.length > 0) {
        taskUpdates.dod = subtask.acceptanceCriteria.join("\n");
      }

      const updatedSubtask = await updateTask(newTask.id, taskUpdates);
      if (updatedSubtask) {
        createdSubtasks.push(updatedSubtask);
      }
    }

    // Auto-assign subtasks
    if (createdSubtasks.length > 0 && memberProfiles.length > 0) {
      const candidates = members
        .filter(m => profileMap.has(m.id))
        .map(m => {
          const profile = profileMap.get(m.id)!;
          return {
            userId: m.id,
            email: m.email,
            profile: {
              top2: [profile.top2[0] as any, profile.top2[1] as any],
              competency2: [profile.competency2[0] as any, profile.competency2[1] as any],
              frustration2: [profile.frustration2[0] as any, profile.frustration2[1] as any],
            },
            currentWorkloadMinutes: workloadByMember[m.id] || 0,
            dailyCapacity: profile.dailyCapacityMinutes || 480,
          };
        });

      const assignments = assignTasks(createdSubtasks, candidates);

      for (const subtask of createdSubtasks) {
        const explanation = assignments.get(subtask.id);
        if (explanation) {
          const assignedScore = explanation.scores.find(s => s.userId === explanation.assignedUserId);
          await updateTask(subtask.id, {
            owner: explanation.assignedUserId,
            assignmentReason: {
              scoreBreakdown: assignedScore?.breakdown,
              alternatives: explanation.topAlternatives,
              aiSuggestedOwner: subtask.assignmentReason?.aiSuggestedOwner,
            },
          });
        }
      }
    }

    // Update parent task: mark as expanded and update acceptance criteria
    await updateTask(task.id, {
      expandState: "expanded",
      expansionDepth: (task.expansionDepth || 0) + 1,
      acceptanceCriteria: expansion.updatedAcceptanceCriteria,
      dod: expansion.updatedAcceptanceCriteria.join("\n"),
    });

    // Update quest to include new subtasks
    await updateQuest(parentQuest.id, {
      taskIds: [...parentQuest.taskIds, ...createdSubtasks.map(t => t.id)],
    });

    res.json({
      taskId: task.id,
      subtasks: createdSubtasks,
      updatedAcceptanceCriteria: expansion.updatedAcceptanceCriteria,
    });
  } catch (error) {
    console.error("Expand task error:", error);
    res.status(500).json({ error: "Failed to expand task" });
  }
});

// Lock a task (prevent expansion)
app.post("/api/tasks/:id/lock", async (req, res) => {
  try {
    const task = await updateTask(req.params.id, { expandState: "locked" });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    console.error("Lock task error:", error);
    res.status(500).json({ error: "Failed to lock task" });
  }
});

// Skip a task (mark as manually handled, prevent expansion)
app.post("/api/tasks/:id/skip", async (req, res) => {
  try {
    const task = await updateTask(req.params.id, { expandState: "locked" });
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    console.error("Skip task error:", error);
    res.status(500).json({ error: "Failed to skip task" });
  }
});

// Get all questlines for an organization
app.get("/api/questlines", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const questlines = await getQuestlinesByOrgId(orgId);
    res.json(questlines);
  } catch (error) {
    console.error("Get questlines error:", error);
    res.status(500).json({ error: "Failed to get questlines" });
  }
});

// Get quests for a questline
app.get("/api/questlines/:id/quests", async (req, res) => {
  const quests = await getQuestsByQuestlineId(req.params.id);
  res.json(quests);
});

// Get quest by ID
app.get("/api/quests/:id", async (req, res) => {
  const quest = await getQuestById(req.params.id);
  if (!quest) {
    return res.status(404).json({ error: "Quest not found" });
  }
  res.json(quest);
});

// Get tasks for a quest
app.get("/api/quests/:id/tasks", async (req, res) => {
  const tasks = await getTasksByQuestId(req.params.id);
  res.json(tasks);
});

// Create task in a quest
app.post("/api/quests/:id/tasks", async (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: "Title is required" });
  }
  
  const orgId = "default-org"; // TODO: Get from auth context
  const task = await createTask(orgId, req.params.id, title, description);
  res.json(task);
});

// Update task endpoint with optimistic concurrency
app.put("/api/tasks/:id", async (req, res) => {
  try {
    const { updates, expectedUpdatedAt } = req.body;
    const task = await updateTask(req.params.id, updates, undefined, expectedUpdatedAt);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: "Conflict",
        message: "Task was modified by another user. Please refresh and try again.",
        conflict: {
          expectedUpdatedAt: error.expectedUpdatedAt,
          actualUpdatedAt: error.actualUpdatedAt,
          latestEntity: error.latestEntity,
        },
      });
    }
    console.error("Update task error:", error);
    res.status(500).json({ error: "Failed to update task" });
  }
});

// Toggle GitHub sync for a task
app.post("/api/tasks/:id/github-sync", async (req, res) => {
  try {
    const { syncToGithub, repo } = req.body;
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const updates: any = {
      syncToGithub: syncToGithub === true,
    };

    // If enabling sync and repo is provided, store it in github.repo
    if (syncToGithub === true && repo) {
      if (!task.github) {
        updates.github = { repo, issueNumber: 0, url: "" };
      } else {
        updates.github = { ...task.github, repo };
      }
    }

    // If disabling sync, clear GitHub metadata
    if (syncToGithub === false) {
      updates.github = undefined;
    }

    const updated = await updateTask(req.params.id, updates);
    res.json(updated);
  } catch (error) {
    console.error("Toggle GitHub sync error:", error);
    res.status(500).json({ error: "Failed to toggle GitHub sync" });
  }
});

// Complete a task
app.post("/api/tasks/:id/complete", async (req, res) => {
  try {
    const { expectedUpdatedAt } = req.body;
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Use optimistic concurrency if expectedUpdatedAt is provided
    const updated = await updateTask(
      req.params.id,
      { status: "done" },
      undefined,
      expectedUpdatedAt || task.updatedAt
    );
    
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Publish completion event
    await publish("task.completed", {
      taskId: updated.id,
      title: updated.title,
      requiresApproval: updated.requiresApproval || false,
    }, {
      sourceApp: "questboard",
    });
    
    // If task doesn't require approval, check unlocks immediately
    if (!updated.requiresApproval) {
      await evaluateUnlocks(updated.id);
      await checkQuestCompletion(updated.id);
    }
    
    res.json(updated);
  } catch (error) {
    if (error instanceof ConflictError) {
      return res.status(409).json({
        error: "Conflict",
        message: "Task was modified by another user. Please refresh and try again.",
        conflict: {
          expectedUpdatedAt: error.expectedUpdatedAt,
          actualUpdatedAt: error.actualUpdatedAt,
          latestEntity: error.latestEntity,
        },
      });
    }
    console.error("Complete task error:", error);
    res.status(500).json({ error: "Failed to complete task" });
  }
});

// Approve checkpoint task
app.post("/api/tasks/:id/approve", async (req, res) => {
  try {
    const { approvedBy } = req.body;
    if (!approvedBy) {
      return res.status(400).json({ error: "approvedBy is required" });
    }
    const task = await approveTask(req.params.id, approvedBy);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    res.json(task);
  } catch (error) {
    console.error("Approve task error:", error);
    const message = error instanceof Error ? error.message : "Failed to approve task";
    res.status(400).json({ error: message });
  }
});

// Member management endpoints
app.get("/api/members", async (req, res) => {
  const orgId = req.query.orgId as string || "default-org";
  const members = await getMembersByOrgId(orgId);
  res.json(members);
});

app.post("/api/members", async (req, res) => {
  try {
    const { email, role, orgId: targetOrgId } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const orgId = targetOrgId || (req.query.orgId as string) || "default-org";
    
    const member = await createMember(orgId, email, role || "member");
    res.status(201).json(member);
  } catch (error) {
    console.error("Create member error:", error);
    const message = error instanceof Error ? error.message : "Failed to create member";
    res.status(400).json({ error: message });
  }
});

app.get("/api/members/:id", async (req, res) => {
  const member = await getMemberById(req.params.id);
  if (!member) {
    return res.status(404).json({ error: "Member not found" });
  }
  res.json(member);
});

app.put("/api/members/:id", async (req, res) => {
  try {
    const updates = req.body;
    const updated = await updateMember(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Member not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Update member error:", error);
    res.status(500).json({ error: "Failed to update member" });
  }
});

// Team management endpoints
app.get("/api/team", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const snapshot = await buildTeamSnapshot(orgId);
    res.json(snapshot);
  } catch (error) {
    console.error("Get team snapshot error:", error);
    res.status(500).json({ error: "Failed to get team snapshot" });
  }
});

app.get("/api/team/profiles", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const profiles = await getMemberProfilesByOrgId(orgId);
    res.json(profiles);
  } catch (error) {
    console.error("Get member profiles error:", error);
    res.status(500).json({ error: "Failed to get member profiles" });
  }
});

app.get("/api/team/profiles/:memberId", async (req, res) => {
  try {
    const profile = await getMemberProfile(req.params.memberId);
    if (!profile) {
      return res.status(404).json({ error: "Member profile not found" });
    }
    res.json(profile);
  } catch (error) {
    console.error("Get member profile error:", error);
    res.status(500).json({ error: "Failed to get member profile" });
  }
});

app.put("/api/team/profiles/:memberId", async (req, res) => {
  try {
    const profile = await getMemberProfile(req.params.memberId);
    if (!profile) {
      // Create new profile if it doesn't exist
      const orgId = (req.body.orgId as string) || (req.query.orgId as string) || "default-org";
      const member = await getMemberById(req.params.memberId);
      if (!member) {
        return res.status(404).json({ error: "Member not found" });
      }
      
      const newProfile: MemberProfile = {
        memberId: req.params.memberId,
        orgId,
        top2: req.body.top2 || ["W", "I"],
        competency2: req.body.competency2 || ["D", "G"],
        frustration2: req.body.frustration2 || ["E", "T"],
        dailyCapacityMinutes: req.body.dailyCapacityMinutes || 480,
        timezone: req.body.timezone,
        role: req.body.role || member.role,
        strengths: req.body.strengths,
        weaknesses: req.body.weaknesses,
        notes: req.body.notes,
        updatedAt: new Date().toISOString(),
      };
      const saved = await saveMemberProfile(newProfile);
      return res.json(saved);
    }
    
    // Update existing profile
    const updated: MemberProfile = {
      ...profile,
      ...req.body,
      memberId: profile.memberId, // Don't allow changing memberId
      orgId: profile.orgId, // Don't allow changing orgId
      updatedAt: new Date().toISOString(),
    };
    const saved = await saveMemberProfile(updated);
    res.json(saved);
  } catch (error) {
    console.error("Save member profile error:", error);
    const message = error instanceof Error ? error.message : "Failed to save member profile";
    res.status(500).json({ error: message });
  }
});

app.get("/api/team/settings", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const settings = await getOrgSettings(orgId);
    res.json(settings || { id: orgId, orgId, teamNotes: undefined, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Get org settings error:", error);
    res.status(500).json({ error: "Failed to get org settings" });
  }
});

app.put("/api/team/settings", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || (req.body.orgId as string) || "default-org";
    const { teamNotes } = req.body;
    const updated = await updateOrgSettings(orgId, { teamNotes });
    res.json(updated);
  } catch (error) {
    console.error("Update org settings error:", error);
    res.status(500).json({ error: "Failed to update org settings" });
  }
});

// Assignment explanation endpoint
app.get("/api/tasks/:id/assignment", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || "default-org";
    const explanation = await getTaskAssignmentExplanation(req.params.id, orgId);
    if (!explanation) {
      return res.status(404).json({ error: "Task not found or no candidates available" });
    }
    res.json(explanation);
  } catch (error) {
    console.error("Assignment explanation error:", error);
    res.status(500).json({ error: "Failed to get assignment explanation" });
  }
});

// Re-run assignment endpoint
app.post("/api/assignments/reassign", async (req, res) => {
  try {
    const { orgId } = req.body;
    const targetOrgId = orgId || "default-org";
    await reassignTasks(targetOrgId);
    res.json({ success: true, message: "Tasks reassigned" });
  } catch (error) {
    console.error("Reassign error:", error);
    res.status(500).json({ error: "Failed to reassign tasks" });
  }
});

// Run Questmaster endpoint
app.post("/api/questmaster/run", async (req, res) => {
  try {
    const { orgId } = req.body;
    const targetOrgId = orgId || "default-org";
    await runQuestmaster(targetOrgId);
    res.json({ success: true, message: "Questmaster completed successfully" });
  } catch (error) {
    console.error("Questmaster error:", error);
    res.status(500).json({ error: "Failed to run Questmaster" });
  }
});

// Events/History endpoints
app.get("/api/events/:entityType/:entityId", async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
    
    const events = queryEventsByEntity(
      entityId,
      entityType as "task" | "quest" | "goal",
      limit
    );
    
    res.json(events);
  } catch (error) {
    console.error("Query events error:", error);
    res.status(500).json({ error: "Failed to query events" });
  }
});

// Org settings endpoints
app.get("/api/orgs/:id", async (req, res) => {
  let org = await getOrgById(req.params.id);
  // Create default org if it doesn't exist
  if (!org && req.params.id === "default-org") {
    const defaultOrg: Org = {
      id: "default-org",
      name: "Default Organization",
      createdAt: new Date().toISOString(),
      notificationSettings: {
        slackEnabled: false,
        emailEnabled: false,
      },
    };
    await storage.upsert("orgs", defaultOrg);
    org = defaultOrg;
  }
  if (!org) {
    return res.status(404).json({ error: "Org not found" });
  }
  res.json(org);
});

app.put("/api/orgs/:id", async (req, res) => {
  try {
    const updates = req.body;
    const updated = await updateOrg(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Org not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Update org error:", error);
    res.status(500).json({ error: "Failed to update org" });
  }
});

// Sprint Planning endpoints
app.post("/api/sprint/plan", async (req, res) => {
  try {
    const { orgId, weekStart } = req.body;
    const targetOrgId = orgId || "default-org";
    
    // Check if plan already exists
    let existingPlan = null;
    if (weekStart) {
      existingPlan = await getSprintPlan(targetOrgId, weekStart);
    }
    
    // Generate new plan
    const weekStartDate = weekStart ? new Date(weekStart) : undefined;
    const plan = await generateSprintPlan(targetOrgId, weekStartDate);
    
    // If existing plan exists, include diff
    let diff = null;
    if (existingPlan && existingPlan.status !== "draft") {
      diff = compareSprintPlans(existingPlan, plan);
    }
    
    // Publish event
    await publish("sprint.plan.generated", {
      planId: plan.id,
      orgId: plan.orgId,
      weekStart: plan.weekStart,
      weekEnd: plan.weekEnd,
      memberCount: plan.memberPlans.length,
    }, {
      sourceApp: "questboard",
    });
    
    res.json({ plan, diff, existingPlan: existingPlan ? { id: existingPlan.id, status: existingPlan.status } : null });
  } catch (error) {
    console.error("Generate sprint plan error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate sprint plan";
    res.status(500).json({ error: message });
  }
});

app.get("/api/sprint/plans", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const plans = await getSprintPlans(orgId);
    res.json(plans);
  } catch (error) {
    console.error("Get sprint plans error:", error);
    res.status(500).json({ error: "Failed to get sprint plans" });
  }
});

app.get("/api/sprint/plan/:weekStart", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const plan = await getSprintPlan(orgId, req.params.weekStart);
    if (!plan) {
      return res.status(404).json({ error: "Sprint plan not found" });
    }
    res.json(plan);
  } catch (error) {
    console.error("Get sprint plan error:", error);
    res.status(500).json({ error: "Failed to get sprint plan" });
  }
});

app.post("/api/sprint/plan/:planId/approve", async (req, res) => {
  try {
    const { approvedBy } = req.body;
    if (!approvedBy) {
      return res.status(400).json({ error: "approvedBy is required" });
    }
    
    const plan = await approveSprintPlan(req.params.planId, approvedBy);
    if (!plan) {
      return res.status(404).json({ error: "Sprint plan not found" });
    }
    
    // Publish event
    await publish("sprint.plan.approved", {
      planId: plan.id,
      orgId: plan.orgId,
      weekStart: plan.weekStart,
      approvedBy,
    }, {
      sourceApp: "questboard",
    });
    
    res.json(plan);
  } catch (error) {
    console.error("Approve sprint plan error:", error);
    res.status(500).json({ error: "Failed to approve sprint plan" });
  }
});

// Template endpoints

// Get all templates for an org
app.get("/api/templates", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const search = req.query.search as string;
    const tags = req.query.tags ? (req.query.tags as string).split(",").filter(Boolean) : undefined;
    
    const templates = search || tags
      ? await searchTemplates(orgId, search, tags)
      : await getAllTemplates(orgId);
    
    res.json(templates);
  } catch (error) {
    console.error("Get templates error:", error);
    res.status(500).json({ error: "Failed to get templates" });
  }
});

// Get template by ID
app.get("/api/templates/:id", async (req, res) => {
  try {
    const template = await getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const templateQuestline = await getTemplateQuestline(req.params.id);
    res.json({ template, templateQuestline });
  } catch (error) {
    console.error("Get template error:", error);
    res.status(500).json({ error: "Failed to get template" });
  }
});

// Save questline as template
app.post("/api/questlines/:id/save-as-template", async (req, res) => {
  try {
    const { title, description, tags, createdBy } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    
    const orgId = req.body.orgId || "default-org";
    const creator = createdBy || "system";
    
    const result = await saveTemplate(
      orgId,
      req.params.id,
      title,
      description,
      tags || [],
      creator
    );
    
    // Publish event
    await publish("template.saved", {
      templateId: result.template.id,
      title: result.template.title,
      questlineId: req.params.id,
      createdBy: creator,
    }, {
      sourceApp: "questboard",
      orgId,
    });
    
    res.json(result);
  } catch (error) {
    console.error("Save template error:", error);
    const message = error instanceof Error ? error.message : "Failed to save template";
    res.status(500).json({ error: message });
  }
});

// Spawn goal from template
app.post("/api/templates/:id/spawn", async (req, res) => {
  try {
    const { goalTitle, orgId: targetOrgId, goalContext, adaptWithAI } = req.body;
    if (!goalTitle) {
      return res.status(400).json({ error: "Goal title is required" });
    }
    
    const orgId = targetOrgId || "default-org";
    
    // Get template
    const template = await getTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ error: "Template not found" });
    }
    
    const templateQuestline = await getTemplateQuestline(req.params.id);
    if (!templateQuestline) {
      return res.status(404).json({ error: "Template questline not found" });
    }
    
    // Adapt template with AI if requested
    let adaptedDefinition = undefined;
    if (adaptWithAI) {
      try {
        const newGoalContext = goalContext ? `${goalTitle}: ${goalContext}` : goalTitle;
        adaptedDefinition = await adaptTemplate(templateQuestline.questlineDefinition, newGoalContext);
      } catch (error) {
        console.error("Template adaptation error:", error);
        // Continue with original template if adaptation fails
      }
    }
    
    // Spawn goal from template
    const goal = await spawnGoalFromTemplate(
      req.params.id,
      goalTitle,
      orgId,
      adaptedDefinition
    );
    
    // Publish event
    await publish("template.spawned", {
      templateId: req.params.id,
      templateTitle: template.title,
      goalId: goal.id,
      goalTitle: goal.title,
      adapted: !!adaptedDefinition,
    }, {
      sourceApp: "questboard",
      orgId,
    });
    
    res.json(goal);
  } catch (error) {
    console.error("Spawn goal from template error:", error);
    const message = error instanceof Error ? error.message : "Failed to spawn goal from template";
    res.status(500).json({ error: message });
  }
});

// Today screen endpoints

// Get Today screen data for a user
app.get("/api/today", async (req, res) => {
  try {
    const userId = (req.query.userId as string) || "user1"; // TODO: Get from auth
    const orgId = (req.query.orgId as string) || "default-org";
    
    // Get metadata
    const storageInfo = getStorageInfo();
    const counts = await getEntityCounts(orgId);
    const goals = await getAllGoals();
    const orgGoals = goals.filter(g => g.orgId === orgId);
    
    // Get user's quest deck
    const deck = await getUserQuestDeck(
      userId,
      async (uid) => getQuestsForUser(uid, orgId),
      async (questId) => getTasksByQuestId(questId)
    );
    
    // Get blocked tasks
    const blockedTasks = await getBlockedTasksForUser(userId, orgId);
    
    // Get ready to unlock quests
    const readyToUnlock = await getReadyToUnlockQuests(orgId);
    
    // Get standup summary
    const standup = await getStandupSummary(userId, orgId);
    
    // Get team pulse
    const teamPulse = await getTeamPulse(orgId);
    
    // Get last questmaster run (from job summaries)
    const lastQuestmasterRun = await getLastQuestmasterRun(orgId);
    
    // Get ready tasks (unblocked, unlocked tasks) for empty deck state
    const readyTasks = await getReadyTasks(userId, orgId);
    
    res.json({
      deck,
      blockedTasks,
      readyToUnlock,
      standup,
      teamPulse,
      lastQuestmasterRun,
      storageInfo,
      orgId,
      counts,
      hasGoals: orgGoals.length > 0,
      hasQuestlines: counts.questlines > 0,
      readyTasks,
    });
  } catch (error) {
    console.error("Get today screen error:", error);
    res.status(500).json({ error: "Failed to get today screen data" });
  }
});

// Debug/status endpoint
app.get("/api/debug", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const currentUser = (req.query.userId as string) || "user-1"; // TODO: Get from auth

    const storageInfo = getStorageInfo();
    const counts = await getEntityCounts(orgId);
    const jobSummaries = await getJobRunSummaries(orgId, 10);
    const recentEvents = readEvents(50);

    res.json({
      storage: storageInfo,
      orgId,
      currentUser,
      counts,
      jobSummaries,
      recentEvents,
    });
  } catch (error) {
    console.error("Get debug info error:", error);
    res.status(500).json({ error: "Failed to get debug info" });
  }
});

// Run Questmaster Now endpoint
app.post("/api/debug/run-questmaster", async (req, res) => {
  try {
    const orgId = req.body.orgId as string;
    
    if (!orgId) {
      return res.status(400).json({
        success: false,
        error: "orgId is required",
      });
    }

    const now = new Date();

    // Validate that data exists for this org
    const counts = await getEntityCounts(orgId);
    if (counts.goals === 0 && counts.quests === 0 && counts.tasks === 0) {
      return res.status(400).json({
        success: false,
        error: `No data found for org "${orgId}". Run seed or check storage mode.`,
        counts,
      });
    }

    const stats = await runQuestmaster(orgId, now);

    res.json({
      success: true,
      orgId,
      stats,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("Run questmaster error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Serve static files from built React app in production
const webDistPath = path.join(__dirname, "..", "dist", "web");
if (process.env.NODE_ENV === "production" && fs.existsSync(webDistPath)) {
  app.use(express.static(webDistPath));
  
  // Serve index.html for SPA routes in production (after all API routes)
  app.get("*", (req, res) => {
    // Check if this looks like an API route that wasn't matched
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "Not found", path: req.path });
      return;
    }
    
    // Serve React app index.html for all other routes in production
    res.sendFile(path.join(webDistPath, "index.html"));
  });
} else {
  // In development, only handle API routes
  // The React app is served by Vite dev server on port 5173
  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ error: "Not found", path: req.path });
    } else {
      res.status(503).json({ 
        error: "Development mode: Please access the app via Vite dev server on http://localhost:5173",
        message: "Run 'pnpm --filter questboard dev:web' to start the Vite dev server"
      });
    }
  });
}

app.listen(PORT, () => {
  console.log(`[questboard] Server running on http://localhost:${PORT}`);
});

