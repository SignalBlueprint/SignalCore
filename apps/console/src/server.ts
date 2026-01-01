/**
 * Console Server - Suite hub UI
 */

// Load environment variables from root .env file
// This is done automatically via @sb/config, but we import it here to ensure it loads
import "@sb/config";

import express from "express";
import * as path from "path";
import { SUITE_APPS, getSuiteApp } from "@sb/suite";
import { readEvents } from "@sb/events";
import { getTelemetryState } from "@sb/telemetry";
import type { Member, JobExecution } from "@sb/schemas";
import authRouter from "./routes/auth";
import { getJobs } from "@sb/jobs";
import { storage } from "@sb/storage";

const app = express();
const suiteApp = getSuiteApp("console");
const PORT = Number(process.env.PORT ?? suiteApp.defaultPort);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// API Routes

// Authentication routes
app.use("/api/auth", authRouter);

// Get suite apps
app.get("/api/apps", (req, res) => {
  res.json(SUITE_APPS);
});

app.get(suiteApp.routes.health, (req, res) => {
  res.status(200).json({ status: "ok", app: suiteApp.id });
});

// Get latest events (last 200)
app.get("/api/events", (req, res) => {
  try {
    const events = readEvents(200);
    res.json(events);
  } catch (error) {
    console.error("Error reading events:", error);
    res.status(500).json({ error: "Failed to read events" });
  }
});

// Get telemetry state
app.get("/api/telemetry", (req, res) => {
  try {
    const state = getTelemetryState();
    res.json(state);
  } catch (error) {
    console.error("Error getting telemetry:", error);
    res.status(500).json({ error: "Failed to get telemetry" });
  }
});

// Get team members (mock data for now - in production, this would query a database)
app.get("/api/team", (req, res) => {
  try {
    const mockTeamMembers: Array<Member & { name: string; avatar?: string; currentWorkloadMinutes?: number }> = [
      {
        id: "member-1",
        orgId: "org-1",
        name: "Alex Chen",
        email: "alex@signalblueprint.com",
        role: "admin",
        workingGeniusProfile: {
          top2: ["Wonder", "Invention"],
          competency2: ["Discernment", "Enablement"],
          frustration2: ["Galvanizing", "Tenacity"]
        },
        dailyCapacityMinutes: 480,
        currentWorkloadMinutes: 180,
        avatar: "🧑‍💻",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "member-2",
        orgId: "org-1",
        name: "Jordan Rivera",
        email: "jordan@signalblueprint.com",
        role: "member",
        workingGeniusProfile: {
          top2: ["Discernment", "Tenacity"],
          competency2: ["Enablement", "Wonder"],
          frustration2: ["Invention", "Galvanizing"]
        },
        dailyCapacityMinutes: 480,
        currentWorkloadMinutes: 320,
        avatar: "👩‍💼",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      {
        id: "member-3",
        orgId: "org-1",
        name: "Sam Taylor",
        email: "sam@signalblueprint.com",
        role: "member",
        workingGeniusProfile: {
          top2: ["Galvanizing", "Enablement"],
          competency2: ["Tenacity", "Invention"],
          frustration2: ["Wonder", "Discernment"]
        },
        dailyCapacityMinutes: 480,
        currentWorkloadMinutes: 240,
        avatar: "🧑‍🎨",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
    res.json(mockTeamMembers);
  } catch (error) {
    console.error("Error getting team members:", error);
    res.status(500).json({ error: "Failed to get team members" });
  }
});

// Get system health for all suite apps
app.get("/api/health", async (req, res) => {
  try {
    const healthChecks = await Promise.all(
      SUITE_APPS.map(async (suiteApp) => {
        try {
          const response = await fetch(
            `http://localhost:${suiteApp.defaultPort}${suiteApp.routes.health}`,
            { signal: AbortSignal.timeout(2000) }
          );
          const isHealthy = response.ok;
          return {
            id: suiteApp.id,
            name: suiteApp.name,
            status: isHealthy ? "online" : "offline",
            port: suiteApp.defaultPort,
            lastChecked: new Date().toISOString()
          };
        } catch (error) {
          return {
            id: suiteApp.id,
            name: suiteApp.name,
            status: "offline",
            port: suiteApp.defaultPort,
            lastChecked: new Date().toISOString()
          };
        }
      })
    );
    res.json(healthChecks);
  } catch (error) {
    console.error("Error checking health:", error);
    res.status(500).json({ error: "Failed to check health" });
  }
});

// Get quick stats for dashboard
app.get("/api/dashboard/stats", (req, res) => {
  try {
    const events = readEvents(50);
    const telemetry = getTelemetryState();

    const stats = {
      totalEvents: events.length,
      recentEventsCount: events.filter((e) =>
        new Date(e.createdAt).getTime() > Date.now() - 3600000
      ).length,
      totalAICalls: telemetry.totalCalls,
      totalCost: telemetry.totalCost,
      cacheHitRate: telemetry.totalCalls > 0
        ? ((telemetry.cachedCalls / telemetry.totalCalls) * 100).toFixed(1)
        : 0
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting dashboard stats:", error);
    res.status(500).json({ error: "Failed to get dashboard stats" });
  }
});

// Get active quests summary for the console dashboard (game-like view)
app.get("/api/quests/active", async (req, res) => {
  try {
    const questboardBaseUrl = `http://localhost:${getSuiteApp("questboard").defaultPort}`;

    // Fetch active questlines from questboard
    const questlinesResponse = await fetch(`${questboardBaseUrl}/api/questlines?orgId=default-org`);
    if (!questlinesResponse.ok) {
      throw new Error(`Failed to fetch questlines: ${questlinesResponse.statusText}`);
    }
    const questlines = await questlinesResponse.json();

    // Fetch all quests for these questlines
    const questPromises = questlines.map(async (ql: any) => {
      const questsResponse = await fetch(`${questboardBaseUrl}/api/questlines/${ql.id}/quests`);
      if (!questsResponse.ok) return [];
      return await questsResponse.json();
    });
    const questsArrays = await Promise.all(questPromises);
    const allQuests = questsArrays.flat();

    // Fetch tasks for all quests to calculate progress
    const taskPromises = allQuests.map(async (quest: any) => {
      const tasksResponse = await fetch(`${questboardBaseUrl}/api/quests/${quest.id}/tasks`);
      if (!tasksResponse.ok) return { questId: quest.id, tasks: [] };
      const tasks = await tasksResponse.json();
      return { questId: quest.id, tasks };
    });
    const tasksByQuest = await Promise.all(taskPromises);
    const taskMap = new Map(tasksByQuest.map(t => [t.questId, t.tasks]));

    // Build quest summary with progress
    const questSummary = questlines.map((ql: any) => {
      const questlineQuests = allQuests.filter((q: any) => q.questlineId === ql.id);

      const questProgress = questlineQuests.map((quest: any) => {
        const tasks = taskMap.get(quest.id) || [];
        const totalTasks = tasks.length;
        const completedTasks = tasks.filter((t: any) => t.status === 'done').length;
        const inProgressTasks = tasks.filter((t: any) => t.status === 'in-progress').length;

        return {
          id: quest.id,
          title: quest.title,
          objective: quest.objective,
          state: quest.state,
          totalTasks,
          completedTasks,
          inProgressTasks,
          progress: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
          unlockedAt: quest.unlockedAt,
          completedAt: quest.completedAt,
        };
      });

      const totalQuestlineTasks = questProgress.reduce((sum, q) => sum + q.totalTasks, 0);
      const completedQuestlineTasks = questProgress.reduce((sum, q) => sum + q.completedTasks, 0);

      return {
        id: ql.id,
        title: ql.title,
        description: ql.description,
        epic: ql.epic,
        owner: ql.owner,
        assignmentReason: ql.assignmentReason,
        quests: questProgress,
        totalTasks: totalQuestlineTasks,
        completedTasks: completedQuestlineTasks,
        progress: totalQuestlineTasks > 0 ? Math.round((completedQuestlineTasks / totalQuestlineTasks) * 100) : 0,
      };
    });

    res.json({
      questlines: questSummary,
      totalQuestlines: questlines.length,
      activeQuests: allQuests.filter((q: any) => q.state === 'unlocked' || q.state === 'in-progress').length,
      completedQuests: allQuests.filter((q: any) => q.state === 'completed').length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching active quests:", error);
    res.status(500).json({ error: "Failed to fetch active quests" });
  }
});

// Worker Job Monitoring endpoints
const JOB_EXECUTION_KIND = "job-executions";

// Helper: Get all job executions
async function getAllJobExecutions(options?: {
  limit?: number;
  orgId?: string;
  status?: JobExecution["status"];
}): Promise<JobExecution[]> {
  const allExecutions = await storage.list<JobExecution>(
    JOB_EXECUTION_KIND,
    (exec) => {
      if (options?.orgId && exec.orgId !== options.orgId) return false;
      if (options?.status && exec.status !== options.status) return false;
      return true;
    }
  );

  const sorted = allExecutions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

// Helper: Get job executions for a specific job
async function getJobExecutions(
  jobId: string,
  options?: { limit?: number; orgId?: string }
): Promise<JobExecution[]> {
  const allExecutions = await storage.list<JobExecution>(
    JOB_EXECUTION_KIND,
    (exec) => {
      if (exec.jobId !== jobId) return false;
      if (options?.orgId && exec.orgId !== options.orgId) return false;
      return true;
    }
  );

  const sorted = allExecutions.sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
  );

  if (options?.limit) {
    return sorted.slice(0, options.limit);
  }

  return sorted;
}

// Helper: Get job stats
async function getJobStats(jobId: string, orgId?: string) {
  const executions = await getJobExecutions(jobId, { orgId });

  const totalRuns = executions.length;
  const successCount = executions.filter((e) => e.status === "success").length;
  const failureCount = executions.filter((e) => e.status === "failed").length;
  const timeoutCount = executions.filter((e) => e.status === "timeout").length;

  const completedExecutions = executions.filter((e) => e.duration !== undefined);
  const averageDuration =
    completedExecutions.length > 0
      ? completedExecutions.reduce((sum, e) => sum + (e.duration || 0), 0) /
        completedExecutions.length
      : 0;

  const lastRun = executions[0];
  const lastSuccess = executions.find((e) => e.status === "success");
  const lastFailure = executions.find((e) => e.status === "failed");

  return {
    jobId,
    totalRuns,
    successCount,
    failureCount,
    timeoutCount,
    averageDuration,
    lastRun,
    lastSuccess,
    lastFailure,
  };
}

app.get("/api/worker/jobs", (req, res) => {
  try {
    const jobs = getJobs();
    res.json(jobs.map((job) => ({
      id: job.id,
      name: job.name,
      scheduleHint: job.scheduleHint,
    })));
  } catch (error) {
    console.error("Error getting worker jobs:", error);
    res.status(500).json({ error: "Failed to get worker jobs" });
  }
});

app.get("/api/worker/executions", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
    const status = req.query.status as "running" | "success" | "failed" | "timeout" | undefined;
    const orgId = req.query.orgId as string | undefined;

    const executions = await getAllJobExecutions({ limit, status, orgId });
    res.json(executions);
  } catch (error) {
    console.error("Error getting worker executions:", error);
    res.status(500).json({ error: "Failed to get worker executions" });
  }
});

app.get("/api/worker/executions/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
    const orgId = req.query.orgId as string | undefined;

    const executions = await getJobExecutions(jobId, { limit, orgId });
    res.json(executions);
  } catch (error) {
    console.error("Error getting job executions:", error);
    res.status(500).json({ error: "Failed to get job executions" });
  }
});

app.get("/api/worker/stats/:jobId", async (req, res) => {
  try {
    const { jobId } = req.params;
    const orgId = req.query.orgId as string | undefined;

    const stats = await getJobStats(jobId, orgId);
    res.json(stats);
  } catch (error) {
    console.error("Error getting job stats:", error);
    res.status(500).json({ error: "Failed to get job stats" });
  }
});

app.get("/api/worker/overview", async (req, res) => {
  try {
    const jobs = getJobs();
    const recentExecutions = await getAllJobExecutions({ limit: 100 });

    // Calculate overview stats
    const last24Hours = Date.now() - 24 * 60 * 60 * 1000;
    const recentExecs = recentExecutions.filter(
      (e) => new Date(e.startedAt).getTime() > last24Hours
    );

    const totalJobs = jobs.length;
    const totalExecutions = recentExecs.length;
    const successCount = recentExecs.filter((e) => e.status === "success").length;
    const failureCount = recentExecs.filter((e) => e.status === "failed").length;
    const runningCount = recentExecs.filter((e) => e.status === "running").length;
    const successRate = totalExecutions > 0
      ? ((successCount / totalExecutions) * 100).toFixed(1)
      : "0";

    // Get stats for each job
    const jobStatsPromises = jobs.map(async (job) => {
      try {
        const stats = await getJobStats(job.id);
        const recentJobExecs = recentExecs.filter((e) => e.jobId === job.id);
        return {
          jobId: job.id,
          jobName: job.name,
          totalRuns: stats.totalRuns,
          successCount: stats.successCount,
          failureCount: stats.failureCount,
          averageDuration: Math.round(stats.averageDuration),
          lastRun: stats.lastRun,
          recentRuns24h: recentJobExecs.length,
        };
      } catch (error) {
        return {
          jobId: job.id,
          jobName: job.name,
          totalRuns: 0,
          successCount: 0,
          failureCount: 0,
          averageDuration: 0,
          lastRun: null,
          recentRuns24h: 0,
        };
      }
    });

    const jobStats = await Promise.all(jobStatsPromises);

    res.json({
      overview: {
        totalJobs,
        totalExecutions24h: totalExecutions,
        successCount,
        failureCount,
        runningCount,
        successRate,
      },
      jobs: jobStats,
      recentExecutions: recentExecutions.slice(0, 10),
    });
  } catch (error) {
    console.error("Error getting worker overview:", error);
    res.status(500).json({ error: "Failed to get worker overview" });
  }
});

// Serve index.html for all other routes (client-side routing)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(
    `[${suiteApp.id}] Server running on http://localhost:${PORT}${suiteApp.routes.base}`
  );
});
