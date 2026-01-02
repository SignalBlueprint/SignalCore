/**
 * Onboarding routes for Questboard
 * Handles new user setup, sample data seeding, and onboarding status tracking
 */

import { Router, Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "@sb/auth";
import { storage } from "@sb/storage";
import type { Org, Member, Goal, Questline, Quest, Task } from "@sb/schemas";

const router = Router();

/**
 * GET /api/onboarding/status
 * Check if the current user has completed onboarding
 */
router.get("/status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) {
      res.status(400).json({ error: "Organization not found" });
      return;
    }

    // Check if org has onboarding_completed flag
    const org = await storage.get<Org>("orgs", orgId);
    const hasCompletedOnboarding = org?.metadata?.onboarding_completed || false;

    res.json({
      completed: hasCompletedOnboarding,
      hasData: {
        goals: (await storage.list<Goal>("goals")).filter(g => g.org_id === orgId).length > 0,
        members: (await storage.list<Member>("members")).filter(m => m.org_id === orgId).length > 1,
      }
    });
  } catch (error) {
    console.error("Error checking onboarding status:", error);
    res.status(500).json({ error: "Failed to check onboarding status" });
  }
});

/**
 * POST /api/onboarding/complete
 * Mark onboarding as completed for the current org
 */
router.post("/complete", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) {
      res.status(400).json({ error: "Organization not found" });
      return;
    }

    // Update org metadata
    const org = await storage.get<Org>("orgs", orgId);
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    const updatedOrg = await storage.update<Org>("orgs", orgId, {
      ...org,
      metadata: {
        ...org.metadata,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      }
    });

    res.json({ success: true, org: updatedOrg });
  } catch (error) {
    console.error("Error completing onboarding:", error);
    res.status(500).json({ error: "Failed to complete onboarding" });
  }
});

/**
 * POST /api/onboarding/seed-sample-data
 * Create sample goals, questlines, quests, and tasks for new users
 */
router.post("/seed-sample-data", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org?.id;
    const userId = req.user?.id;

    if (!orgId || !userId) {
      res.status(400).json({ error: "Organization or user not found" });
      return;
    }

    // Create a sample goal
    const sampleGoal = await storage.create<Goal>("goals", {
      org_id: orgId,
      title: "🎯 Complete Questboard Onboarding",
      description: "Get familiar with Questboard by exploring goals, questlines, and tasks. This is sample data to help you understand the workflow.",
      status: "active",
      priority: 1,
      target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
      created_by: userId,
      metadata: {
        is_sample: true,
        category: "onboarding"
      }
    });

    // Create a sample questline
    const sampleQuestline = await storage.create<Questline>("questlines", {
      org_id: orgId,
      goal_id: sampleGoal.id,
      title: "🚀 Getting Started Journey",
      description: "A step-by-step introduction to using Questboard effectively",
      status: "active",
      order: 1,
      metadata: {
        is_sample: true
      }
    });

    // Create a sample quest
    const sampleQuest = await storage.create<Quest>("quests", {
      org_id: orgId,
      questline_id: sampleQuestline.id,
      title: "📚 Learn the Basics",
      description: "Understand how goals, questlines, and tasks work together",
      status: "active",
      unlock_conditions: [],
      metadata: {
        is_sample: true
      }
    });

    // Create sample tasks
    const taskTitles = [
      { title: "✅ Explore the Today view", description: "See your daily focus tasks and priorities" },
      { title: "📊 Check the Analytics dashboard", description: "View team capacity and completion metrics" },
      { title: "👥 Add your first team member", description: "Go to Team page and add a colleague" },
      { title: "🎯 Create your first real goal", description: "Replace this sample with your actual work" },
      { title: "🗑️ Delete sample data when ready", description: "Remove these sample items once you're comfortable" },
    ];

    const createdTasks = [];
    for (let i = 0; i < taskTitles.length; i++) {
      const task = await storage.create<Task>("tasks", {
        org_id: orgId,
        quest_id: sampleQuest.id,
        title: taskTitles[i].title,
        description: taskTitles[i].description,
        status: i === 0 ? "ready" : "blocked",
        priority: i + 1,
        estimated_hours: 0.25,
        assigned_to: i === 0 ? userId : undefined,
        unlock_conditions: i > 0 ? [`task:${i - 1}`] : [],
        metadata: {
          is_sample: true
        }
      });
      createdTasks.push(task);
    }

    res.json({
      success: true,
      created: {
        goal: sampleGoal,
        questline: sampleQuestline,
        quest: sampleQuest,
        tasks: createdTasks
      }
    });
  } catch (error) {
    console.error("Error seeding sample data:", error);
    res.status(500).json({ error: "Failed to seed sample data" });
  }
});

/**
 * POST /api/onboarding/skip-sample-data
 * Mark onboarding as complete without creating sample data
 */
router.post("/skip-sample-data", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const orgId = req.org?.id;
    if (!orgId) {
      res.status(400).json({ error: "Organization not found" });
      return;
    }

    const org = await storage.get<Org>("orgs", orgId);
    if (!org) {
      res.status(404).json({ error: "Organization not found" });
      return;
    }

    const updatedOrg = await storage.update<Org>("orgs", orgId, {
      ...org,
      metadata: {
        ...org.metadata,
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        skipped_sample_data: true,
      }
    });

    res.json({ success: true, org: updatedOrg });
  } catch (error) {
    console.error("Error skipping sample data:", error);
    res.status(500).json({ error: "Failed to skip sample data" });
  }
});

export default router;
