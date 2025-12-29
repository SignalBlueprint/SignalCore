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
 * Assignment explanation stored on task
 */
export interface TaskAssignmentReason {
  scoreBreakdown?: {
    geniusMatch: number;
    competencyMatch: number;
    frustrationPenalty: number;
    workloadPenalty: number;
  };
  alternatives?: Array<{ userId: string; score: number }>;
  aiSuggestedOwner?: string; // Email if AI suggested an owner
}

/**
 * Task expansion state
 */
export type TaskExpandState = "ready" | "expanded" | "locked";

/**
 * Task output - tangible deliverable submitted when completing a task
 */
export interface TaskOutput {
  id: string;
  type: "text" | "link" | "file" | "code" | "image";
  content: string; // Text content, URL, file path, code snippet, or image URL
  title?: string; // Optional title/description
  submittedAt: string;
  submittedBy?: string; // User ID who submitted
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
  phase?: "W" | "I" | "D" | "G" | "E" | "T"; // Working Genius phase
  estimatedMinutes?: number; // Estimated time to complete in minutes
  assignmentReason?: TaskAssignmentReason; // Why this task was assigned to owner
  expandState?: TaskExpandState; // Expansion control state
  expansionDepth?: number; // How many times this task has been expanded (max 2)
  expandCostEstimate?: number; // Estimated cost of expansion (for UI display)
  acceptanceCriteria?: string[]; // Acceptance criteria for the task
  parentTaskId?: string; // If this is a subtask, reference to parent
  dod?: string; // Definition of Done
  blockers?: string[];
  tags?: string[];
  requiresApproval?: boolean; // Checkpoint task - requires explicit approval
  approvedAt?: string; // Timestamp when approved
  approvedBy?: string; // User ID who approved
  syncToGithub?: boolean; // Whether to sync this task to GitHub
  github?: TaskGitHub; // GitHub issue metadata if synced
  outputs?: TaskOutput[]; // Tangible deliverables submitted when completing
  createdAt: string;
  updatedAt: string;
}

