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
  getReadyTasks,
  listOrgs,
  getMemberProfilesByOrgId,
  updateQuest,
  getMemberProfile,
  saveMemberProfile,
  getOrgSettings,
  updateOrgSettings,
  buildTeamSnapshot,
  createHierarchicalGoal,
  getGoalTree,
  getGoalChildren,
  getGoalPath,
  updateHierarchicalGoal,
  reorderGoals,
  getGoalRollup,
  getGoalRollups,
  createMilestone,
  getMilestonesByGoalId,
  updateMilestone,
  linkQuestToGoal,
  getQuestsForGoal,
  getActiveGoals,
} from "./store";
import { getUserQuestDeck, assignTaskWithExplanation, assignTasks } from "@sb/assignment";
import { publish, queryEventsByEntity, readEvents } from "@sb/events";
import { getStorageInfo } from "@sb/storage";
import { runClarifyGoal, runDecomposeGoal, runExpandTask, runLevelUpGoal, runImproveGoal } from "@sb/ai";
import { runQuestmaster } from "./questmaster";
import {
  generateSprintPlan,
  getSprintPlan,
  getSprintPlans,
  approveSprintPlan,
  compareSprintPlans,
} from "./sprintplanner";
import { storage, ConflictError } from "@sb/storage";
import type { Org, Goal, Task, Quest, DailyDeck } from "@sb/schemas";
import {
  getAllTemplates,
  getTemplateById,
  searchTemplates,
  getTemplateQuestline,
  saveTemplate,
  spawnGoalFromTemplate,
} from "./store";
import { adaptTemplate } from "@sb/ai";
import authRoutes from "./routes/auth";

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

// Mount auth routes
app.use("/api/auth", authRoutes);

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
  try {
    const { title, orgId, scope_level, owner_role_id, parent_goal_id } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }
    const goal = await createGoal(title, orgId || "default-org", {
      scope_level,
      owner_role_id,
      parent_goal_id,
    });
    res.json(goal);
  } catch (error) {
    console.error("Create goal error:", error);
    res.status(500).json({ 
      error: "Failed to create goal",
      details: error instanceof Error ? error.message : String(error)
    });
  }
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

    const clarifyOutput = await runClarifyGoal(goal.title, { 
      orgId: goal.orgId || undefined 
    });
    
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
    const decomposeOutput = await runDecomposeGoal(goal.id, goal.clarifyOutput, teamSnapshot, {
      orgId: goal.orgId || undefined,
    });
    
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

// ============================================================================
// Hierarchical Goals API
// ============================================================================

// Get goal tree for an org
app.get("/api/goals-tree", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || "default-org";
    // Try to get hierarchical goals, fallback to all goals if needed
    let goals = await getGoalTree(orgId);
    // If no goals found, try getting all goals (for backward compatibility)
    if (goals.length === 0) {
      const allGoals = await getAllGoals();
      // Filter by orgId if possible, otherwise return all
      goals = allGoals.filter(g => !g.orgId || g.orgId === orgId || orgId === "default-org");
    }
    res.json(goals);
  } catch (error) {
    console.error("Get goal tree error:", error);
    // Fallback to old endpoint
    try {
      const allGoals = await getAllGoals();
      res.json(allGoals);
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to get goal tree" });
    }
  }
});

// Get goal children
app.get("/api/goals/:id/children", async (req, res) => {
  try {
    const children = await getGoalChildren(req.params.id);
    res.json(children);
  } catch (error) {
    console.error("Get goal children error:", error);
    res.status(500).json({ error: "Failed to get goal children" });
  }
});

// Get goal path (breadcrumb)
app.get("/api/goals/:id/path", async (req, res) => {
  try {
    const path = await getGoalPath(req.params.id);
    res.json(path);
  } catch (error) {
    console.error("Get goal path error:", error);
    res.status(500).json({ error: "Failed to get goal path" });
  }
});

// Create hierarchical goal
app.post("/api/goals-tree", async (req, res) => {
  try {
    const { orgId, title, parentGoalId, level } = req.body;
    if (!title) {
      return res.status(400).json({ error: "Title is required", details: "The 'title' field is required to create a goal" });
    }
    const goal = await createHierarchicalGoal(
      orgId || "default-org",
      title,
      parentGoalId || null,
      level || 0
    );
    res.json(goal);
  } catch (error) {
    console.error("Create hierarchical goal error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: "Failed to create goal",
      details: errorMessage
    });
  }
});

// Update hierarchical goal
app.put("/api/goals-tree/:id", async (req, res) => {
  try {
    const updates = req.body;
    const updated = await updateHierarchicalGoal(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Goal not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Update hierarchical goal error:", error);
    res.status(500).json({ error: "Failed to update goal" });
  }
});

// Reorder goals
app.post("/api/goals-tree/reorder", async (req, res) => {
  try {
    const { goalIds, parentGoalId } = req.body;
    if (!Array.isArray(goalIds)) {
      return res.status(400).json({ error: "goalIds must be an array" });
    }
    await reorderGoals(goalIds, parentGoalId || null);
    res.json({ success: true });
  } catch (error) {
    console.error("Reorder goals error:", error);
    res.status(500).json({ error: "Failed to reorder goals" });
  }
});

// Get goal rollup
app.get("/api/goals/:id/rollup", async (req, res) => {
  try {
    const rollup = await getGoalRollup(req.params.id);
    if (!rollup) {
      return res.status(404).json({ error: "Rollup not found" });
    }
    res.json(rollup);
  } catch (error) {
    console.error("Get goal rollup error:", error);
    res.status(500).json({ error: "Failed to get goal rollup" });
  }
});

// Level Up goal
app.post("/api/goals/:id/level-up", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured",
        details: "Please set OPENAI_API_KEY environment variable"
      });
    }

    // Normalize goal to ensure all required fields exist
    const normalizedGoal: Goal = {
      ...goal,
      level: goal.level ?? 0,
      status: goal.status ?? "active",
      parentGoalId: goal.parentGoalId ?? null,
    };

    const levelUpResponse = await runLevelUpGoal(normalizedGoal, {
      orgId: normalizedGoal.orgId || undefined,
    });
    res.json(levelUpResponse);
  } catch (error) {
    console.error("Level up error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    res.status(500).json({ 
      error: "Failed to level up goal",
      details: errorMessage,
      ...(errorStack && process.env.NODE_ENV === "development" ? { stack: errorStack } : {})
    });
  }
});

// Improve goal structure
app.post("/api/goals/:id/improve", async (req, res) => {
  try {
    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "OpenAI API key not configured",
        details: "Please set OPENAI_API_KEY environment variable"
      });
    }

    const improved = await runImproveGoal(goal, {
      orgId: goal.orgId || undefined,
    });
    
    res.json(improved);
  } catch (error) {
    console.error("Improve goal error:", error);
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: "Failed to improve goal",
      details: errorMessage,
    });
  }
});

// Apply improved goal structure
app.post("/api/goals/:id/apply-improve", async (req, res) => {
  try {
    const { improved } = req.body;
    if (!improved) {
      return res.status(400).json({ error: "improved structure is required" });
    }

    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Update goal with improved structure
    const updates: Partial<Goal> = {
      title: improved.improved_title,
      problem: improved.improved_problem,
      outcome: improved.improved_outcome,
      scope_level: improved.scope_level,
      summary: improved.summary,
      spec_json: {
        ...(goal.spec_json || {}),
        title: improved.improved_title,
        problem: improved.improved_problem,
        outcome: improved.improved_outcome,
        scope_level: improved.scope_level,
        metrics: improved.metrics,
        milestones: improved.milestones,
        dependencies: improved.dependencies,
        risks: improved.risks,
      },
      metrics_json: improved.metrics,
      dependencies_json: improved.dependencies,
      risks_json: improved.risks,
    };

    const updated = await updateGoal(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Create milestones if provided
    let milestonesCreated = 0;
    if (improved.milestones && improved.milestones.length > 0) {
      for (let i = 0; i < improved.milestones.length; i++) {
        const m = improved.milestones[i];
        try {
          await createMilestone(req.params.id, m.title, m.due_date || null, i);
          milestonesCreated++;
        } catch (error) {
          console.warn(`Failed to create milestone ${m.title}:`, error);
        }
      }
    }

    res.json({
      success: true,
      goal: updated,
      milestonesCreated,
    });
  } catch (error) {
    console.error("Apply improve error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: "Failed to apply improved structure",
      details: errorMessage,
    });
  }
});

// Apply Level Up (create milestones, quests, update goal)
app.post("/api/goals/:id/apply-level-up", async (req, res) => {
  try {
    const { levelUpResponse } = req.body;
    if (!levelUpResponse) {
      return res.status(400).json({ error: "levelUpResponse is required" });
    }

    const goal = await getGoalById(req.params.id);
    if (!goal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    const orgId = goal.orgId || "default-org";
    const updates: Partial<Goal> = {
      level: levelUpResponse.next_level,
      ...(levelUpResponse.summary && levelUpResponse.summary.trim() && { summary: levelUpResponse.summary }),
      ...(levelUpResponse.goal_updates.outcome && levelUpResponse.goal_updates.outcome.trim() && { outcome: levelUpResponse.goal_updates.outcome }),
      ...(levelUpResponse.goal_updates.success_metric && levelUpResponse.goal_updates.success_metric.trim() && { successMetric: levelUpResponse.goal_updates.success_metric }),
      ...(levelUpResponse.goal_updates.target_value && levelUpResponse.goal_updates.target_value.trim() && { targetValue: levelUpResponse.goal_updates.target_value }),
      ...(levelUpResponse.goal_updates.plan_markdown && levelUpResponse.goal_updates.plan_markdown.trim() && { planMarkdown: levelUpResponse.goal_updates.plan_markdown }),
      ...(levelUpResponse.goal_updates.playbook_markdown && levelUpResponse.goal_updates.playbook_markdown.trim() && { playbookMarkdown: levelUpResponse.goal_updates.playbook_markdown }),
      ...(levelUpResponse.goal_updates.risks && levelUpResponse.goal_updates.risks.length > 0 && { risks: levelUpResponse.goal_updates.risks }),
      ...(levelUpResponse.goal_updates.dependencies && levelUpResponse.goal_updates.dependencies.length > 0 && { dependencies: levelUpResponse.goal_updates.dependencies }),
    };

    // Update goal
    const updatedGoal = await updateHierarchicalGoal(req.params.id, updates);
    if (!updatedGoal) {
      return res.status(404).json({ error: "Goal not found" });
    }

    // Create milestones
    const milestoneIds: string[] = [];
    if (levelUpResponse.milestones && levelUpResponse.milestones.length > 0) {
      for (let i = 0; i < levelUpResponse.milestones.length; i++) {
        const m = levelUpResponse.milestones[i];
        if (m.title && m.title.trim()) {
          const milestone = await createMilestone(
            req.params.id,
            m.title,
            (m.due_date && m.due_date.trim()) ? m.due_date : null,
            i
          );
          milestoneIds.push(milestone.id);
        }
      }
    }

    // Create quests (link to goal, optionally to first milestone)
    const questIds: string[] = [];
    if (levelUpResponse.quests && levelUpResponse.quests.length > 0) {
      // We need a questline to create quests - create a default one or use existing
      const questlines = await getQuestlinesByGoalId(req.params.id);
      let questline = questlines[0];
      if (!questline) {
        questline = await createQuestline(orgId, req.params.id, `${goal.title} - Level ${levelUpResponse.next_level} Quests`);
      }

      for (const q of levelUpResponse.quests) {
        if (q.title && q.title.trim() && q.objective && q.objective.trim()) {
          const quest = await createQuest(
            orgId,
            questline.id,
            q.title,
            q.objective,
            []
          );
          // Link quest to goal and optionally to first milestone
          await linkQuestToGoal(
            quest.id,
            req.params.id,
            milestoneIds[0] || null
          );
          questIds.push(quest.id);
          
          // Create an initial task for the quest so it shows up in questmaster decks
          // Use the quest objective as the task description
          try {
            const initialTask = await createTask(
              orgId,
              quest.id,
              `Start: ${q.title}`,
              q.objective,
              true // Auto-assign
            );
            console.log(`[Level Up] Created initial task "${initialTask.title}" for quest "${q.title}"`);
          } catch (taskError) {
            console.error(`[Level Up] Failed to create initial task for quest "${q.title}":`, taskError);
            // Don't fail the whole operation if task creation fails
          }
        }
      }
    }

    // Create child goals if specified
    const childGoalIds: string[] = [];
    if (levelUpResponse.child_goals && levelUpResponse.child_goals.length > 0) {
      for (const cg of levelUpResponse.child_goals) {
        if (cg.title && cg.title.trim()) {
          const childGoal = await createHierarchicalGoal(
            orgId,
            cg.title,
            req.params.id,
            cg.level || 0
          );
          childGoalIds.push(childGoal.id);
        }
      }
    }

    res.json({
      goal: updatedGoal,
      milestonesCreated: milestoneIds.length,
      questsCreated: questIds.length,
      childGoalsCreated: childGoalIds.length,
    });
  } catch (error) {
    console.error("Apply level up error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).json({ 
      error: "Failed to apply level up",
      details: errorMessage
    });
  }
});

// Get milestones for a goal
app.get("/api/goals/:id/milestones", async (req, res) => {
  try {
    const milestones = await getMilestonesByGoalId(req.params.id);
    res.json(milestones);
  } catch (error) {
    console.error("Get milestones error:", error);
    res.status(500).json({ error: "Failed to get milestones" });
  }
});

// Create milestone
app.post("/api/milestones", async (req, res) => {
  try {
    const { goalId, title, dueDate, orderIndex } = req.body;
    if (!goalId || !title) {
      return res.status(400).json({ error: "goalId and title are required" });
    }
    const milestone = await createMilestone(goalId, title, dueDate || null, orderIndex || 0);
    res.json(milestone);
  } catch (error) {
    console.error("Create milestone error:", error);
    res.status(500).json({ error: "Failed to create milestone" });
  }
});

// Update milestone
app.put("/api/milestones/:id", async (req, res) => {
  try {
    const updates = req.body;
    const updated = await updateMilestone(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ error: "Milestone not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Update milestone error:", error);
    res.status(500).json({ error: "Failed to update milestone" });
  }
});

// Link quest to goal
app.post("/api/quests/:id/link-goal", async (req, res) => {
  try {
    const { goalId, milestoneId } = req.body;
    const updated = await linkQuestToGoal(req.params.id, goalId || null, milestoneId || null);
    if (!updated) {
      return res.status(404).json({ error: "Quest not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Link quest to goal error:", error);
    res.status(500).json({ error: "Failed to link quest to goal" });
  }
});

// Get quests for a goal
app.get("/api/goals/:id/quests", async (req, res) => {
  try {
    const quests = await getQuestsForGoal(req.params.id);
    res.json(quests);
  } catch (error) {
    console.error("Get quests for goal error:", error);
    res.status(500).json({ error: "Failed to get quests for goal" });
  }
});

// Get active goals (for filtering)
app.get("/api/active-goals", async (req, res) => {
  try {
    const orgId = req.query.orgId as string || "default-org";
    const goals = await getActiveGoals(orgId);
    res.json(goals);
  } catch (error) {
    console.error("Get active goals error:", error);
    res.status(500).json({ error: "Failed to get active goals" });
  }
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

    // Handle LLM prompt if provided
    let taskDescriptionUpdate = task.description || "";
    if (expansion.llmPrompt) {
      const llmPromptSection = `\n\n---\n\n## 🤖 LLM-Assisted Task\n\n**Instructions:** This task is suitable for AI assistance. Use the prompt below with an LLM (ChatGPT, Claude, etc.) to generate the required output.\n\n**LLM Prompt:**\n\`\`\`\n${expansion.llmPrompt}\n\`\`\`\n\n**Next Steps:**\n1. Copy the prompt above\n2. Paste it into your preferred LLM (ChatGPT, Claude, etc.)\n3. Review and refine the LLM's response\n4. Paste the final output here as part of completing this task\n\n---\n`;
      taskDescriptionUpdate = (task.description || "") + llmPromptSection;
    }

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
    // If there are no subtasks but there's an LLM prompt, update the task description
    const taskUpdates: Partial<Task> = {
      expandState: expansion.subtasks.length > 0 ? "expanded" : "ready",
      expansionDepth: (task.expansionDepth || 0) + 1,
      acceptanceCriteria: expansion.updatedAcceptanceCriteria,
      dod: expansion.updatedAcceptanceCriteria.join("\n"),
    };

    // If LLM prompt exists, update description
    if (expansion.llmPrompt) {
      taskUpdates.description = taskDescriptionUpdate;
    }

    await updateTask(task.id, taskUpdates);

    // Update quest to include new subtasks
    await updateQuest(parentQuest.id, {
      taskIds: [...parentQuest.taskIds, ...createdSubtasks.map(t => t.id)],
    });

    res.json({
      taskId: task.id,
      subtasks: createdSubtasks,
      updatedAcceptanceCriteria: expansion.updatedAcceptanceCriteria,
      llmPrompt: expansion.llmPrompt,
      subtasksCreated: createdSubtasks.length,
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

// Get task by ID
app.get("/api/tasks/:id", async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Find which quest this task belongs to
    const orgId = task.orgId;
    const allQuests = await storage.list<Quest>("quests", (q) => q.orgId === orgId);
    const quest = allQuests.find(q => q.taskIds.includes(task.id));
    
    // Fetch subtasks (tasks where parentTaskId === this task's id)
    const subtasks = await storage.list<Task>("tasks", (t) => 
      t.orgId === orgId && t.parentTaskId === task.id
    );
    
    // Add questId and subtasks to task response
    const taskWithQuest = {
      ...task,
      questId: quest?.id,
      subtasks: subtasks || [],
    };
    
    res.json(taskWithQuest);
  } catch (error) {
    console.error("Get task error:", error);
    res.status(500).json({ error: "Failed to get task" });
  }
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

// Submit task output endpoint
app.post("/api/tasks/:id/outputs", async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { type, content, title } = req.body;
    if (!type || !content || !content.trim()) {
      return res.status(400).json({ error: "Type and content are required" });
    }

    if (!['text', 'link', 'file', 'code', 'image'].includes(type)) {
      return res.status(400).json({ error: "Invalid output type" });
    }

    // Create output
    const output = {
      id: `output-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      type,
      content: content.trim(),
      title: title?.trim() || undefined,
      submittedAt: new Date().toISOString(),
      submittedBy: undefined, // TODO: Get from auth context
    };

    // Add output to task
    const existingOutputs = task.outputs || [];
    const updatedOutputs = [...existingOutputs, output];

    // Update task with new output
    // Only auto-complete if task is not already done
    const updates: Partial<Task> = {
      outputs: updatedOutputs,
    };
    if (task.status !== 'done') {
      updates.status = 'done'; // Auto-complete when output is submitted
    }
    const updated = await updateTask(req.params.id, updates);

    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }

    // Publish event
    await publish("task.output.submitted", {
      taskId: task.id,
      taskTitle: task.title,
      outputId: output.id,
      outputType: output.type,
    }, {
      orgId: task.orgId,
      sourceApp: "questboard",
    });

    res.json({
      output,
      task: updated,
    });
  } catch (error) {
    console.error("Submit output error:", error);
    res.status(500).json({ error: "Failed to submit output" });
  }
});

// AI Help endpoint for tasks
app.post("/api/tasks/:id/ai-help", async (req, res) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const { type } = req.body;
    if (!type || !['hints', 'breakdown', 'next-actions', 'blockers'].includes(type)) {
      return res.status(400).json({ error: "Invalid help type. Must be: hints, breakdown, next-actions, or blockers" });
    }

    // For now, return a simple response structure
    // In the future, this could call AI to generate actual help
    let content = '';
    let hints: string[] = [];
    let nextActions: string[] = [];
    let subtasks: Array<{ title: string; description?: string }> = [];

    switch (type) {
      case 'hints':
        hints = [
          `Break down "${task.title}" into smaller steps if it feels overwhelming`,
          `Focus on the acceptance criteria: ${task.acceptanceCriteria?.join(', ') || task.dod || 'Complete the task objectives'}`,
          `Consider the Working Genius phase: ${task.phase || 'N/A'}`,
          `Estimated time: ${task.estimatedMinutes || 60} minutes - plan accordingly`,
        ];
        break;
      case 'breakdown':
        subtasks = [
          { title: 'Review task requirements', description: 'Understand what needs to be done' },
          { title: 'Gather necessary resources', description: 'Collect any materials, information, or tools needed' },
          { title: 'Execute the main work', description: task.description || 'Complete the primary objective' },
          { title: 'Verify completion', description: `Check against: ${task.acceptanceCriteria?.join(', ') || task.dod || 'task requirements'}` },
        ];
        break;
      case 'next-actions':
        nextActions = [
          task.status === 'todo' ? 'Start by reviewing the task description and acceptance criteria' : 'Continue from where you left off',
          task.blockers && task.blockers.length > 0 ? `Address blockers: ${task.blockers.join(', ')}` : 'No blockers to address',
          `Work towards: ${task.acceptanceCriteria?.[0] || task.dod || 'completing the task'}`,
          `Remember: This task is part of "${task.questId ? 'a quest' : 'your work'}"`,
        ];
        break;
      case 'blockers':
        if (task.blockers && task.blockers.length > 0) {
          content = `Current blockers:\n${task.blockers.map(b => `- ${b}`).join('\n')}\n\nSuggestions:\n- Break down blockers into smaller issues\n- Identify who or what can help resolve each blocker\n- Consider alternative approaches if blocked`;
        } else {
          content = 'No blockers identified. You\'re ready to proceed!';
        }
        break;
    }

    res.json({
      type,
      content,
      hints: hints.length > 0 ? hints : undefined,
      nextActions: nextActions.length > 0 ? nextActions : undefined,
      subtasks: subtasks.length > 0 ? subtasks : undefined,
    });
  } catch (error) {
    console.error("AI help error:", error);
    res.status(500).json({ error: "Failed to get AI help" });
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

// Get Daily Deck endpoint
app.get("/api/daily-deck", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";
    const dateParam = req.query.date as string | undefined;
    const today = dateParam || new Date().toISOString().split("T")[0];

    // Try to fetch today's daily deck
    const deckId = `daily-deck-${orgId}-${today}`;
    const dailyDeck = await storage.get<DailyDeck>("daily_decks", deckId);

    // Get entity counts for context (even if no deck exists)
    const counts = await getEntityCounts(orgId);

    if (!dailyDeck) {
      return res.json({
        exists: false,
        message: "No daily deck found. Run Questmaster to generate one.",
        orgId,
        date: today,
        counts, // Include counts so UI can show helpful info
      });
    }

    // Get last questmaster run
    const lastQuestmasterRun = await getLastQuestmasterRun(orgId);

    res.json({
      exists: true,
      dailyDeck,
      lastQuestmasterRun,
      counts,
      orgId,
    });
  } catch (error) {
    console.error("Get daily deck error:", error);
    res.status(500).json({ error: "Failed to get daily deck" });
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

    // Build org context for knowledge base debugging
    let orgContext = null;
    let orgContextFormatted = null;
    let orgContextError = null;
    try {
      console.log(`[Debug] Building org context for orgId: ${orgId}`);
      const { buildOrgContext, formatOrgContext } = await import("@sb/ai");
      console.log(`[Debug] Successfully imported buildOrgContext and formatOrgContext`);
      
      orgContext = await buildOrgContext(orgId, {
        maxActiveGoals: 10,
        maxCompletedGoals: 5,
        maxActiveQuests: 15,
        maxCompletedQuests: 10,
        maxOutputs: 10,
        maxKnowledgeCards: 10,
      });
      console.log(`[Debug] buildOrgContext returned:`, {
        activeGoals: orgContext?.activeGoals?.length || 0,
        completedGoals: orgContext?.completedGoals?.length || 0,
        activeQuests: orgContext?.activeQuests?.length || 0,
        completedQuests: orgContext?.completedQuests?.length || 0,
        recentOutputs: orgContext?.recentOutputs?.length || 0,
        knowledgeCards: orgContext?.knowledgeCards?.length || 0,
      });
      
      if (orgContext) {
        orgContextFormatted = formatOrgContext(orgContext, 5000);
        console.log(`[Debug] Formatted context length: ${orgContextFormatted?.length || 0} chars`);
      } else {
        console.warn(`[Debug] buildOrgContext returned null/undefined`);
        orgContextError = "buildOrgContext returned null or undefined";
      }
    } catch (error) {
      orgContextError = error instanceof Error ? error.message : String(error);
      console.error("[Debug] Failed to build org context for debug:", error);
      // Log full error details for debugging
      if (error instanceof Error) {
        console.error("[Debug] Error name:", error.name);
        console.error("[Debug] Error message:", error.message);
        if (error.stack) {
          console.error("[Debug] Error stack:", error.stack);
        }
      }
    }

    res.json({
      storage: storageInfo,
      orgId,
      currentUser,
      counts,
      jobSummaries,
      recentEvents,
      orgContext: {
        raw: orgContext,
        formatted: orgContextFormatted,
        error: orgContextError || undefined,
      },
    });
  } catch (error) {
    console.error("Get debug info error:", error);
    res.status(500).json({ error: "Failed to get debug info" });
  }
});

// Jobs monitoring endpoint
app.get("/api/jobs", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";

    // Get all job run summaries (we'll get more to calculate statistics)
    const allSummaries = await getJobRunSummaries(orgId, 100);

    // Calculate statistics per job type
    const jobStatsMap = new Map<string, {
      jobId: string;
      totalRuns: number;
      successCount: number;
      failedCount: number;
      partialCount: number;
      successRate: number;
      avgDuration: number;
      lastRun?: typeof allSummaries[0];
    }>();

    for (const summary of allSummaries) {
      const stats = jobStatsMap.get(summary.jobId) || {
        jobId: summary.jobId,
        totalRuns: 0,
        successCount: 0,
        failedCount: 0,
        partialCount: 0,
        successRate: 0,
        avgDuration: 0,
        lastRun: undefined,
      };

      stats.totalRuns++;

      if (summary.status === 'success') stats.successCount++;
      else if (summary.status === 'failed') stats.failedCount++;
      else if (summary.status === 'partial') stats.partialCount++;

      // Calculate duration
      const duration = (new Date(summary.finishedAt).getTime() - new Date(summary.startedAt).getTime()) / 1000;
      stats.avgDuration = (stats.avgDuration * (stats.totalRuns - 1) + duration) / stats.totalRuns;

      // Update last run
      if (!stats.lastRun || new Date(summary.finishedAt) > new Date(stats.lastRun.finishedAt)) {
        stats.lastRun = summary;
      }

      jobStatsMap.set(summary.jobId, stats);
    }

    // Calculate success rates
    const statistics = Array.from(jobStatsMap.values()).map(stats => ({
      ...stats,
      successRate: stats.totalRuns > 0 ? (stats.successCount / stats.totalRuns) * 100 : 0,
    }));

    res.json({
      summaries: allSummaries,
      statistics,
    });
  } catch (error) {
    console.error("Get jobs data error:", error);
    res.status(500).json({ error: "Failed to get jobs data" });
  }
});

// Reset storage to Supabase endpoint
app.post("/api/debug/reset-storage", async (req, res) => {
  try {
    const { resetToSupabase } = await import("@sb/storage");
    resetToSupabase();
    res.json({
      success: true,
      message: "Storage reset to Supabase mode. Restart server for changes to take effect.",
      storageInfo: getStorageInfo()
    });
  } catch (error) {
    console.error("Reset storage error:", error);
    res.status(500).json({ error: "Failed to reset storage" });
  }
});

// Create tasks for quests that don't have any
app.post("/api/debug/create-quest-tasks", async (req, res) => {
  try {
    const orgId = req.body.orgId as string || "default-org";
    
    // Get all quests for this org
    const quests = await storage.list<Quest>("quests", (q) => q.orgId === orgId);
    
    let created = 0;
    let skipped = 0;
    const errors: string[] = [];
    
    for (const quest of quests) {
      // Skip if quest already has tasks
      if (quest.taskIds && quest.taskIds.length > 0) {
        skipped++;
        continue;
      }
      
      // Create an initial task for this quest
      try {
        const initialTask = await createTask(
          orgId,
          quest.id,
          `Start: ${quest.title}`,
          quest.objective || `Work on ${quest.title}`,
          true // Auto-assign
        );
        created++;
        console.log(`[Debug] Created task "${initialTask.title}" for quest "${quest.title}"`);
      } catch (taskError) {
        const errorMsg = taskError instanceof Error ? taskError.message : String(taskError);
        errors.push(`Quest "${quest.title}": ${errorMsg}`);
        console.error(`[Debug] Failed to create task for quest "${quest.title}":`, taskError);
      }
    }
    
    res.json({
      success: true,
      orgId,
      created,
      skipped,
      total: quests.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Create quest tasks error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create quest tasks",
      details: error instanceof Error ? error.message : String(error),
    });
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

// Seed demo data endpoint
app.post("/api/seed-demo", async (req, res) => {
  try {
    const orgId = "demo-org";
    const now = new Date();

    // 1. Create org
    const org: Org = {
      id: orgId,
      name: "Demo Organization",
      planName: "demo",
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await storage.put("org", org);

    // 2. Create 3 members
    const members = [
      {
        id: "member-1",
        email: "alice@demo.com",
        role: "owner",
        orgId,
        createdAt: now.toISOString(),
      },
      {
        id: "member-2",
        email: "bob@demo.com",
        role: "member",
        orgId,
        createdAt: now.toISOString(),
      },
      {
        id: "member-3",
        email: "charlie@demo.com",
        role: "member",
        orgId,
        createdAt: now.toISOString(),
      },
    ];

    for (const member of members) {
      await storage.put("member", member);
    }

    // Create member profiles
    const profiles = [
      {
        memberId: "member-1",
        orgId,
        top2: ["W", "I"] as [string, string],
        competency2: ["D", "G"] as [string, string],
        frustration2: ["E", "T"] as [string, string],
        dailyCapacityMinutes: 360,
        updatedAt: now.toISOString(),
      },
      {
        memberId: "member-2",
        orgId,
        top2: ["G", "E"] as [string, string],
        competency2: ["T", "W"] as [string, string],
        frustration2: ["I", "D"] as [string, string],
        dailyCapacityMinutes: 420,
        updatedAt: now.toISOString(),
      },
      {
        memberId: "member-3",
        orgId,
        top2: ["D", "T"] as [string, string],
        competency2: ["E", "W"] as [string, string],
        frustration2: ["G", "I"] as [string, string],
        dailyCapacityMinutes: 400,
        updatedAt: now.toISOString(),
      },
    ];

    for (const profile of profiles) {
      await storage.put("memberProfile", profile);
    }

    // 3. Create 1 goal
    const goal: Goal = {
      id: "goal-demo-1",
      title: "Build modern task management platform",
      orgId,
      status: "decomposed",
      createdAt: now.toISOString(),
      approvedAt: now.toISOString(),
      decomposedAt: now.toISOString(),
      clarifyOutput: {
        goal: "Build modern task management platform",
        clarified: {
          what: "A modern, real-time task management platform with team collaboration features",
          why: "To improve team productivity and project visibility",
          success: "Platform supports 100+ concurrent users with <2s response time",
          constraints: ["Must integrate with Slack", "Budget: $50k", "Timeline: 3 months"],
        },
      },
    };
    await storage.put("goal", goal);

    // 4. Create 3 questlines
    const questlines = [
      {
        id: "questline-1",
        title: "Foundation & Infrastructure",
        epic: "Core Platform",
        objective: "Set up the foundational architecture and infrastructure",
        goalId: goal.id,
        orgId,
        state: "unlocked" as const,
        createdAt: now.toISOString(),
        unlockedAt: now.toISOString(),
      },
      {
        id: "questline-2",
        title: "User Interface & Experience",
        epic: "Frontend Development",
        objective: "Build responsive and intuitive user interfaces",
        goalId: goal.id,
        orgId,
        state: "unlocked" as const,
        createdAt: now.toISOString(),
        unlockedAt: now.toISOString(),
      },
      {
        id: "questline-3",
        title: "Team Collaboration Features",
        epic: "Advanced Features",
        objective: "Implement real-time collaboration and notification system",
        goalId: goal.id,
        orgId,
        state: "unlocked" as const,
        createdAt: now.toISOString(),
        unlockedAt: now.toISOString(),
      },
    ];

    for (const questline of questlines) {
      await storage.put("questline", questline);
    }

    // 5. Create quests (one per questline)
    const quests = [
      {
        id: "quest-1",
        title: "Backend Setup",
        objective: "Initialize backend services and database",
        questlineId: "questline-1",
        orgId,
        state: "in-progress" as const,
        createdAt: now.toISOString(),
        unlockedAt: now.toISOString(),
      },
      {
        id: "quest-2",
        title: "UI Components",
        objective: "Build reusable React components",
        questlineId: "questline-2",
        orgId,
        state: "unlocked" as const,
        createdAt: now.toISOString(),
        unlockedAt: now.toISOString(),
      },
      {
        id: "quest-3",
        title: "Real-time System",
        objective: "Implement WebSocket connections",
        questlineId: "questline-3",
        orgId,
        state: "locked" as const,
        createdAt: now.toISOString(),
      },
    ];

    for (const quest of quests) {
      await storage.put("quest", quest);
    }

    // 6. Create 12 tasks with dependencies and phases
    const tasks: Task[] = [
      // Quest 1 tasks (Backend Setup) - phases: W, I, D, G
      {
        id: "task-1",
        title: "Research database options",
        description: "Evaluate PostgreSQL vs MongoDB for our use case",
        questId: "quest-1",
        orgId,
        phase: "W",
        status: "done",
        assignedTo: "member-1",
        assignmentReason: "Alice has top2 W (Wonder) - perfect for research",
        estimatedMinutes: 120,
        createdAt: now.toISOString(),
        completedAt: now.toISOString(),
      },
      {
        id: "task-2",
        title: "Design database schema",
        description: "Create ERD and migration scripts",
        questId: "quest-1",
        orgId,
        phase: "I",
        status: "done",
        assignedTo: "member-1",
        assignmentReason: "Alice has top2 I (Invention) - ideal for design work",
        estimatedMinutes: 180,
        prerequisiteTasks: ["task-1"],
        createdAt: now.toISOString(),
        completedAt: now.toISOString(),
      },
      {
        id: "task-3",
        title: "Review API architecture",
        description: "Validate REST endpoint design",
        questId: "quest-1",
        orgId,
        phase: "D",
        status: "in-progress",
        assignedTo: "member-3",
        assignmentReason: "Charlie has top2 D (Discernment) - great for review",
        estimatedMinutes: 90,
        prerequisiteTasks: ["task-2"],
        createdAt: now.toISOString(),
      },
      {
        id: "task-4",
        title: "Implement authentication system",
        description: "Set up JWT-based auth",
        questId: "quest-1",
        orgId,
        phase: "G",
        status: "todo",
        assignedTo: "member-2",
        assignmentReason: "Bob has top2 G (Galvanizing) - good for rallying implementation",
        estimatedMinutes: 240,
        prerequisiteTasks: ["task-3"],
        createdAt: now.toISOString(),
      },

      // Quest 2 tasks (UI Components) - phases: E, T, W, I
      {
        id: "task-5",
        title: "Set up component library",
        description: "Configure Tailwind and base components",
        questId: "quest-2",
        orgId,
        phase: "E",
        status: "done",
        assignedTo: "member-2",
        assignmentReason: "Bob has top2 E (Enablement) - perfect for setup",
        estimatedMinutes: 120,
        createdAt: now.toISOString(),
        completedAt: now.toISOString(),
      },
      {
        id: "task-6",
        title: "Build task list component",
        description: "Create drag-and-drop task list",
        questId: "quest-2",
        orgId,
        phase: "T",
        status: "in-progress",
        assignedTo: "member-3",
        assignmentReason: "Charlie has top2 T (Tenacity) - excellent for execution",
        estimatedMinutes: 300,
        prerequisiteTasks: ["task-5"],
        createdAt: now.toISOString(),
      },
      {
        id: "task-7",
        title: "Research accessibility patterns",
        description: "Ensure WCAG 2.1 AA compliance",
        questId: "quest-2",
        orgId,
        phase: "W",
        status: "todo",
        assignedTo: "member-1",
        assignmentReason: "Alice has top2 W (Wonder) - great for research",
        estimatedMinutes: 90,
        prerequisiteTasks: ["task-5"],
        createdAt: now.toISOString(),
      },
      {
        id: "task-8",
        title: "Design notification UI",
        description: "Create toast and modal components",
        questId: "quest-2",
        orgId,
        phase: "I",
        status: "todo",
        assignedTo: "member-1",
        assignmentReason: "Alice has top2 I (Invention) - perfect for design",
        estimatedMinutes: 150,
        prerequisiteTasks: ["task-6"],
        createdAt: now.toISOString(),
      },

      // Quest 3 tasks (Real-time System) - phases: D, G, E, T
      {
        id: "task-9",
        title: "Evaluate WebSocket vs SSE",
        description: "Choose real-time technology",
        questId: "quest-3",
        orgId,
        phase: "D",
        status: "todo",
        assignedTo: "member-3",
        assignmentReason: "Charlie has top2 D (Discernment) - ideal for evaluation",
        estimatedMinutes: 120,
        prerequisiteTasks: ["task-4"],
        createdAt: now.toISOString(),
      },
      {
        id: "task-10",
        title: "Plan WebSocket architecture",
        description: "Design connection pools and message format",
        questId: "quest-3",
        orgId,
        phase: "G",
        status: "blocked",
        assignedTo: "member-2",
        assignmentReason: "Bob has top2 G (Galvanizing) - good for planning",
        estimatedMinutes: 180,
        prerequisiteTasks: ["task-9"],
        createdAt: now.toISOString(),
      },
      {
        id: "task-11",
        title: "Implement connection handler",
        description: "Build WebSocket server logic",
        questId: "quest-3",
        orgId,
        phase: "E",
        status: "blocked",
        assignedTo: "member-2",
        assignmentReason: "Bob has top2 E (Enablement) - great for implementation",
        estimatedMinutes: 240,
        prerequisiteTasks: ["task-10"],
        createdAt: now.toISOString(),
      },
      {
        id: "task-12",
        title: "Test under load",
        description: "Verify 100+ concurrent connections",
        questId: "quest-3",
        orgId,
        phase: "T",
        status: "blocked",
        assignedTo: "member-3",
        assignmentReason: "Charlie has top2 T (Tenacity) - perfect for thorough testing",
        estimatedMinutes: 180,
        prerequisiteTasks: ["task-11"],
        createdAt: now.toISOString(),
      },
    ];

    for (const task of tasks) {
      await storage.put("task", task);
    }

    // 7. Create a job run summary
    const jobSummary = {
      id: "job-run-demo-1",
      jobType: "questmaster",
      jobId: "questmaster-demo",
      orgId,
      status: "completed",
      startedAt: new Date(now.getTime() - 3600000).toISOString(), // 1 hour ago
      finishedAt: new Date(now.getTime() - 3000000).toISOString(), // 50 min ago
      output: {
        tasksAssigned: 12,
        questsUnlocked: 2,
        dailyDeckSize: 5,
      },
    };
    await storage.put("jobRunSummary", jobSummary);

    res.json({
      success: true,
      message: "Demo data seeded successfully!",
      data: {
        orgId,
        members: members.length,
        goals: 1,
        questlines: questlines.length,
        quests: quests.length,
        tasks: tasks.length,
        jobRuns: 1,
      },
    });
  } catch (error) {
    console.error("Seed demo error:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

// Analytics endpoint
app.get("/api/analytics", async (req, res) => {
  try {
    const orgId = (req.query.orgId as string) || "default-org";

    // Get all data for the org
    const [allGoals, allQuestlines, allQuests, allTasks, members, memberProfiles, teamCapacity] = await Promise.all([
      getAllGoals(),
      getQuestlinesByOrgId(orgId),
      storage.list<Quest>("quests", (q) => q.orgId === orgId),
      storage.list<Task>("tasks", (t) => t.orgId === orgId),
      getMembersByOrgId(orgId),
      getMemberProfilesByOrgId(orgId),
      getTeamPulse(orgId),
    ]);

    const goals = allGoals.filter(g => g.orgId === orgId);

    // Task statistics
    const tasksByStatus = {
      todo: allTasks.filter(t => t.status === "todo").length,
      inProgress: allTasks.filter(t => t.status === "in-progress").length,
      done: allTasks.filter(t => t.status === "done").length,
      blocked: allTasks.filter(t => t.blockers && t.blockers.length > 0).length,
    };

    // Goal statistics
    const goalsByStatus = {
      draft: goals.filter(g => g.status === "draft").length,
      clarified: goals.filter(g => g.status === "clarified_pending_approval").length,
      approved: goals.filter(g => g.status === "approved").length,
      active: goals.filter(g => g.status === "active").length,
      completed: goals.filter(g => g.status === "completed").length,
      paused: goals.filter(g => g.status === "paused").length,
    };

    // Quest statistics
    const questsByState = {
      locked: allQuests.filter(q => q.state === "locked").length,
      unlocked: allQuests.filter(q => q.state === "unlocked").length,
      inProgress: allQuests.filter(q => q.state === "in-progress").length,
      completed: allQuests.filter(q => q.state === "completed").length,
    };

    // Working Genius distribution
    const wgDistribution = {
      W: 0, I: 0, D: 0, G: 0, E: 0, T: 0,
    };
    memberProfiles.forEach(profile => {
      profile.top2.forEach(phase => {
        wgDistribution[phase]++;
      });
    });

    // Task assignments by Working Genius phase
    const tasksByPhase = {
      W: allTasks.filter(t => t.phase === "W").length,
      I: allTasks.filter(t => t.phase === "I").length,
      D: allTasks.filter(t => t.phase === "D").length,
      G: allTasks.filter(t => t.phase === "G").length,
      E: allTasks.filter(t => t.phase === "E").length,
      T: allTasks.filter(t => t.phase === "T").length,
      unassigned: allTasks.filter(t => !t.phase).length,
    };

    // Get recent events for activity timeline
    const events = readEvents(100);
    const relevantEvents = events.filter(e =>
      e.orgId === orgId || !e.orgId
    ).slice(0, 20);

    const recentActivity = relevantEvents.map(e => ({
      type: e.type,
      payload: e.payload,
      createdAt: e.createdAt,
    }));

    // Calculate completion rate (tasks done / total tasks)
    const totalTasks = allTasks.length;
    const completedTasks = tasksByStatus.done;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Calculate average task completion time
    const completedTasksWithTime = allTasks.filter(t =>
      t.status === "done" && t.completedAt && t.createdAt
    );
    const avgCompletionTimeMinutes = completedTasksWithTime.length > 0
      ? Math.round(
          completedTasksWithTime.reduce((sum, t) => {
            const created = new Date(t.createdAt).getTime();
            const completed = new Date(t.completedAt!).getTime();
            return sum + (completed - created) / 1000 / 60;
          }, 0) / completedTasksWithTime.length
        )
      : 0;

    // Team utilization
    const totalCapacity = teamCapacity.reduce((sum, m) => sum + m.capacityTotal, 0);
    const totalUsed = teamCapacity.reduce((sum, m) => sum + m.capacityUsed, 0);
    const teamUtilization = totalCapacity > 0 ? Math.round((totalUsed / totalCapacity) * 100) : 0;

    // Overloaded members (>100% capacity)
    const overloadedMembers = teamCapacity.filter(m =>
      m.capacityUsed > m.capacityTotal
    );

    // At-risk indicators
    const atRisk = {
      overloadedMembers: overloadedMembers.length,
      blockedTasks: tasksByStatus.blocked,
      lockedQuests: questsByState.locked,
      staleGoals: goals.filter(g => {
        if (!g.createdAt) return false;
        const daysSinceCreation = (Date.now() - new Date(g.createdAt).getTime()) / 1000 / 60 / 60 / 24;
        return g.status === "draft" && daysSinceCreation > 7;
      }).length,
    };

    res.json({
      orgId,
      summary: {
        totalGoals: goals.length,
        totalQuestlines: allQuestlines.length,
        totalQuests: allQuests.length,
        totalTasks: allTasks.length,
        totalMembers: members.length,
        completionRate,
        avgCompletionTimeMinutes,
        teamUtilization,
      },
      tasksByStatus,
      goalsByStatus,
      questsByState,
      wgDistribution,
      tasksByPhase,
      teamCapacity,
      overloadedMembers: overloadedMembers.map(m => ({
        email: m.memberEmail,
        utilizationPercent: Math.round((m.capacityUsed / m.capacityTotal) * 100),
      })),
      atRisk,
      recentActivity,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({
      error: "Failed to fetch analytics",
      details: error instanceof Error ? error.message : String(error),
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

