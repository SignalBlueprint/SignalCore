/**
 * Questboard schemas
 */

/**
 * Working Genius types
 */
export type WorkingGenius =
  | "Wonder"
  | "Invention"
  | "Discernment"
  | "Galvanizing"
  | "Enablement"
  | "Tenacity";

/**
 * Working Genius phase abbreviations (single letter codes)
 */
export type WGPhase = "W" | "I" | "D" | "G" | "E" | "T";
// W = Wonder, I = Invention, D = Discernment, G = Galvanizing, E = Enablement, T = Tenacity

/**
 * Working Genius profile for a user
 */
export interface WorkingGeniusProfile {
  top2: [WorkingGenius, WorkingGenius];
  competency2: [WorkingGenius, WorkingGenius]; // Changed from competency array to 2-item tuple
  frustration2: [WorkingGenius, WorkingGenius]; // Changed from frustration array to 2-item tuple
}

/**
 * Member profile with Working Genius and capacity information
 */
export interface MemberProfile {
  memberId: string;
  orgId: string;
  top2: [WGPhase, WGPhase];
  competency2: [WGPhase, WGPhase];
  frustration2: [WGPhase, WGPhase];
  dailyCapacityMinutes: number;
  timezone?: string;
  role?: string;
  strengths?: string[];
  weaknesses?: string[];
  notes?: string;
  updatedAt: string;
}

/**
 * Team snapshot - aggregated view of team with member profiles
 */
export interface TeamSnapshot {
  orgId: string;
  members: Array<{
    id: string;
    email: string;
    role: string;
    profile: MemberProfile;
  }>;
  teamNotes?: string;
  generatedAt: string;
}

/**
 * Clarify output - structured clarification of a goal
 */
export interface ClarifyOutput {
  goal: string;
  clarified: {
    what: string;
    why: string;
    success: string;
    constraints: string[];
  };
}

/**
 * Quest state
 */
export type QuestState = "locked" | "unlocked" | "in-progress" | "completed";

/**
 * Unlock condition types
 */
export type UnlockCondition =
  | { type: "taskCompleted"; taskId: string }
  | { type: "questCompleted"; questId: string }
  | { type: "allTasksCompleted"; taskIds: string[] }
  | { type: "anyTaskCompleted"; taskIds: string[] };

/**
 * Questline entity (first-class stored entity)
 */
export interface Questline {
  id: string;
  orgId: string;
  goalId: string;
  title: string;
  description?: string;
  epic?: string; // High-level epic description
  questIds: string[]; // Array of quest IDs in this questline
  owner?: string; // Email of assigned team member (primary owner)
  assignmentReason?: string; // Why this questline was assigned to this owner
  order?: number; // Display order within the goal (0-based)
  createdAt: string;
  updatedAt: string;
}

/**
 * Quest entity (first-class stored entity)
 */
export interface Quest {
  id: string;
  orgId: string;
  questlineId: string;
  title: string;
  objective: string; // What this quest accomplishes
  unlockConditions: UnlockCondition[]; // Conditions that must be met to unlock
  taskIds: string[]; // Array of task IDs in this quest
  state: QuestState; // locked, unlocked, in-progress, completed
  unlockedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Decompose output - breaks goal into questlines (temporary structure during decomposition)
 */
export interface DecomposeOutput {
  goalId: string;
  questlines: Array<{
    id: string;
    title: string;
    description: string;
    order: number;
    locked: boolean;
    prerequisiteIds?: string[];
    quests?: Array<{
      id: string;
      title: string;
      objective: string;
      tasks: Array<{
        id: string;
        title: string;
        description?: string;
        phase?: WGPhase; // Working Genius phase (W/I/D/G/E/T)
        estimatedMinutes?: number;
        suggestedOwnerEmail?: string; // AI hint for assignment
        priority?: "low" | "medium" | "high" | "urgent";
        requiresApproval?: boolean;
        acceptanceCriteria?: string[];
        dependsOnTaskIds?: string[];
      }>;
    }>;
  }>;
  estimatedComplexity: string;
  expansionCandidates?: string[]; // Task IDs worth expanding next
}

/**
 * Goal entity
 */
export interface Goal {
  id: string;
  orgId?: string; // Optional for backward compatibility, but required for Supabase
  title: string;
  createdAt: string;
  status: "draft" | "clarified_pending_approval" | "approved" | "denied" | "decomposed";
  clarifyOutput?: ClarifyOutput;
  decomposeOutput?: DecomposeOutput;
  approvedAt?: string;
  deniedAt?: string;
  denialReason?: string; // Reason for denial
  decomposedAt?: string;
}

/**
 * Member Quest Deck - persisted daily deck for a member
 */
export interface MemberQuestDeck {
  id: string; // Format: deck-{memberId}-{date}
  memberId: string;
  orgId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  deckEntries: Array<{
    questId: string;
    questTitle: string;
    taskIds: string[];
    totalEstimatedMinutes: number;
  }>;
  generatedAt: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Sprint Plan - weekly plan for an organization
 */
export interface SprintPlan {
  id: string; // Format: sprint-{orgId}-{weekStart}
  orgId: string;
  weekStart: string; // ISO date string (YYYY-MM-DD) - Monday of the week
  weekEnd: string; // ISO date string (YYYY-MM-DD) - Friday of the week
  memberPlans: Array<{
    memberId: string;
    memberEmail: string;
    quests: Array<{
      questId: string;
      questTitle: string;
      priority: string;
    }>;
    tasks: Array<{
      taskId: string;
      taskTitle: string;
      priority: string;
      estimatedMinutes: number;
    }>;
    totalCapacityMinutes: number; // 5 days * dailyCapacityMinutes
    allocatedMinutes: number; // Sum of task estimatedMinutes
    capacityUtilization: number; // allocatedMinutes / totalCapacityMinutes
  }>;
  notes?: string;
  status: "draft" | "approved" | "active" | "completed";
  approvedAt?: string;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Template - reusable questline template for spawning goals
 */
export interface Template {
  id: string;
  orgId: string;
  title: string;
  description?: string;
  tags: string[];
  createdBy: string; // User ID or email
  createdAt: string;
  updatedAt?: string;
}

/**
 * TemplateQuestline - stores the questline structure (quests/tasks) for a template
 * This preserves the full hierarchy without actual entity IDs
 */
export interface TemplateQuestline {
  id: string; // Same as templateId for storage lookup
  templateId: string;
  questlineDefinition: {
    title: string;
    description?: string;
    epic?: string;
    quests: Array<{
      title: string;
      objective: string;
      unlockConditions: Array<{
        type: "questCompleted" | "taskCompleted" | "allTasksCompleted" | "anyTaskCompleted";
        // For templates, these reference template quest/task indices instead of IDs
        questIndex?: number; // Index in the quests array
        taskIndex?: number; // Index within the quest's tasks array
        taskIndices?: number[]; // For allTasksCompleted/anyTaskCompleted
      }>;
      tasks: Array<{
        title: string;
        description?: string;
        requiresApproval?: boolean;
        priority?: string;
      }>;
    }>;
  };
}

/**
 * JobRunSummary - tracks execution stats for background jobs
 */
export interface JobRunSummary {
  id: string; // Format: summary-{jobId}-{orgId}-{timestamp}
  orgId: string;
  jobId: string; // e.g., "daily.questmaster", "weekly.sprintplanner"
  startedAt: string;
  finishedAt: string;
  status: "success" | "failed" | "partial";
  error?: string; // Error message if failed
  stats: {
    goals?: number;
    questlines?: number;
    quests?: number;
    tasks?: number;
    decksGenerated?: number;
    unlockedQuests?: number;
    staleTasks?: number;
    sprintPlansGenerated?: number;
    memberPlansGenerated?: number;
  };
  createdAt: string;
}