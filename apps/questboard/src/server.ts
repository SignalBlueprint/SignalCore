/**
 * Questboard MVP0 Server
 */

import express from "express";
import * as path from "path";
import {
  getAllGoals,
  getGoalById,
  createGoal,
  updateGoal,
  createQuestline,
  getQuestlinesByGoalId,
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
} from "./store";
import { getUserQuestDeck } from "@sb/assignment";
import { publish, queryEventsByEntity } from "@sb/events";
import { runClarifyGoal, runDecomposeGoal } from "@sb/ai";
import { runQuestmaster } from "./questmaster";
import {
  generateSprintPlan,
  getSprintPlan,
  getSprintPlans,
  approveSprintPlan,
  compareSprintPlans,
} from "./sprintplanner";
import { storage, ConflictError } from "@sb/storage";
import type { Org } from "@sb/schemas";
import type { Goal } from "@sb/schemas";
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
    res.status(500).json({ error: "Failed to clarify goal" });
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

// Decompose goal - creates stored questlines and quests
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

    const decomposeOutput = await runDecomposeGoal(goal.id, goal.clarifyOutput);
    
    // Create stored entities from decompose output
    const orgId = "default-org"; // TODO: Get from auth context
    const createdQuestlines = [];
    
    for (const ql of decomposeOutput.questlines) {
      // Create questline
      const questline = await createQuestline(
        orgId,
        goal.id,
        ql.title,
        ql.description
      );
      
      // Create a quest for this questline (simplified - in real app, AI would generate quests)
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
      
      await updateQuestline(questline.id, {
        questIds: [quest.id],
      });
      
      createdQuestlines.push(questline);
    }
    
    const updated = await updateGoal(req.params.id, {
      decomposeOutput,
      status: "decomposed",
      decomposedAt: new Date().toISOString(),
    });

    // Publish event
    await publish("quest.goal.decomposed", {
      goalId: updated.id,
      title: updated.title,
      questlineCount: decomposeOutput.questlines.length,
    }, {
      sourceApp: "questboard",
    });

    res.json({ ...updated, createdQuestlines });
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
        adaptedDefinition = await adaptTemplate(templateQuestline, goalTitle, goalContext);
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
    
    // Get last questmaster run
    const lastQuestmasterRun = await getLastQuestmasterRun(orgId);
    
    res.json({
      deck,
      blockedTasks,
      readyToUnlock,
      standup,
      teamPulse,
      lastQuestmasterRun,
    });
  } catch (error) {
    console.error("Get today screen error:", error);
    res.status(500).json({ error: "Failed to get today screen data" });
  }
});

// Serve index.html for all other routes (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[questboard] Server running on http://localhost:${PORT}`);
});

