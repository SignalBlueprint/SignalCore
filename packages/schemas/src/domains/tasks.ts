/**
 * Task domain schemas
 */

/**
 * Task status
 */
export type TaskStatus = "todo" | "in-progress" | "blocked" | "done";

/**
 * Task priority
 */
export type TaskPriority = "low" | "medium" | "high" | "urgent";

/**
 * GitHub integration metadata for a task
 */
export interface TaskGitHub {
  repo: string; // Format: owner/repo
  issueNumber: number;
  url: string; // HTML URL to the issue
}

/**
 * Task entity
 */
export interface Task {
  id: string;
  orgId: string;
  projectId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  owner?: string;
  dod?: string; // Definition of Done
  blockers?: string[];
  tags?: string[];
  requiresApproval?: boolean; // Checkpoint task - requires explicit approval
  approvedAt?: string; // Timestamp when approved
  approvedBy?: string; // User ID who approved
  syncToGithub?: boolean; // Whether to sync this task to GitHub
  github?: TaskGitHub; // GitHub issue metadata if synced
  createdAt: string;
  updatedAt: string;
}

