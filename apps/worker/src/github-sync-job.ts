/**
 * GitHub Sync job
 * Syncs tasks with syncToGithub=true to GitHub Issues
 */

import { type Job } from "@sb/jobs";
import { storage } from "@sb/storage";
import { createIssue, updateIssue, getIssue, isGitHubConfigured } from "@sb/integrations-github";
import type { Task } from "@sb/schemas";

const TASK_KIND = "tasks";

/**
 * Generate issue body from task
 */
function generateIssueBody(task: Task): string {
  const parts: string[] = [];

  if (task.description) {
    parts.push(`## Description\n\n${task.description}`);
  }

  if (task.dod) {
    parts.push(`## Definition of Done\n\n${task.dod}`);
  }

  if (task.blockers && task.blockers.length > 0) {
    parts.push(`## Blockers\n\n${task.blockers.map((b) => `- ${b}`).join("\n")}`);
  }

  if (task.owner) {
    parts.push(`## Assigned To\n\n${task.owner}`);
  }

  parts.push(`\n---\n\n*Synced from Questboard - Task ID: ${task.id}*`);

  return parts.join("\n\n");
}

/**
 * Get labels for issue based on task properties
 */
function getIssueLabels(task: Task): string[] {
  const labels: string[] = [];

  // Priority label
  if (task.priority) {
    labels.push(`priority-${task.priority}`);
  }

  // Status label
  if (task.status === "blocked") {
    labels.push("blocked");
  }

  // Tags
  if (task.tags) {
    labels.push(...task.tags);
  }

  return labels;
}

/**
 * GitHub Sync job
 */
export const githubSyncJob: Job = {
  id: "github.sync",
  name: "GitHub Sync",
  scheduleHint: "every 5 minutes",
  run: async (ctx) => {
    ctx.logger.info("Starting GitHub Sync job");

    if (!isGitHubConfigured()) {
      ctx.logger.warn("GitHub integration not configured (GITHUB_TOKEN missing), skipping sync");
      return;
    }

    try {
      // Get all tasks that should be synced to GitHub
      const allTasks = await storage.list<Task>(TASK_KIND);
      const tasksToSync = allTasks.filter(
        (t) => t.syncToGithub === true && (!t.github || !t.github.issueNumber || t.github.issueNumber === 0)
      );
      const tasksToUpdate = allTasks.filter(
        (t) => t.syncToGithub === true && t.github && t.github.issueNumber && t.github.issueNumber > 0
      );

      ctx.logger.info(`Found ${tasksToSync.length} tasks to create, ${tasksToUpdate.length} tasks to update`);

      // Create issues for tasks without GitHub links
      for (const task of tasksToSync) {
        try {
          // Get repo from task (we'll need to add this to the task or org settings)
          // For now, we'll skip if no repo is configured
          // TODO: Add repo to task or org settings
          if (!task.github?.repo) {
            ctx.logger.warn(`Task ${task.id} has syncToGithub=true but no repo configured, skipping`);
            continue;
          }

          const repo = task.github.repo;
          const issueBody = generateIssueBody(task);
          const labels = getIssueLabels(task);

          const issue = await createIssue({
            repo,
            title: task.title,
            body: issueBody,
            labels,
          });

          // Update task with GitHub metadata
          const updatedTask: Task = {
            ...task,
            github: {
              repo,
              issueNumber: issue.number,
              url: issue.html_url,
            },
            updatedAt: new Date().toISOString(),
          };

          await storage.upsert(TASK_KIND, updatedTask);

          ctx.logger.info(`Created GitHub issue #${issue.number} for task ${task.id}`);
        } catch (error) {
          ctx.logger.error(`Failed to create GitHub issue for task ${task.id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Update issues for tasks that have changed
      for (const task of tasksToUpdate) {
        try {
          if (!task.github) continue;

          const repo = task.github.repo;
          const issueNumber = task.github.issueNumber;

          // Check if issue was closed on GitHub (optional, behind flag)
          // For now, we'll just update the issue body
          const issueBody = generateIssueBody(task);
          const labels = getIssueLabels(task);

          // Determine state based on task status
          let state: "open" | "closed" | undefined = undefined;
          if (task.status === "done") {
            state = "closed";
          } else {
            state = "open";
          }

          await updateIssue({
            repo,
            issueNumber,
            title: task.title,
            body: issueBody,
            labels,
            state,
          });

          ctx.logger.info(`Updated GitHub issue #${issueNumber} for task ${task.id}`);
        } catch (error) {
          ctx.logger.error(`Failed to update GitHub issue for task ${task.id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      ctx.logger.info("GitHub Sync job completed successfully");
    } catch (error) {
      ctx.logger.error("GitHub Sync job failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },
};

