/**
 * Centralized prompt management for AI operations
 * - Stable system prefixes to improve cache hits
 * - Strict JSON-only outputs aligned to JSON Schema
 * - Defensive escaping + compact inputs for cost control
 */

export const PROMPT_VERSION = "2025-12-27.1";

/* ----------------------------- small helpers ----------------------------- */

function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function safeInline(s: string): string {
  // Safe for embedding in prompts. Avoids breaking quotes or newlines.
  const n = normalizeWhitespace(s);
  return n.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function safeBlock(s: string): string {
  // Safe for block sections; keeps newlines but normalizes.
  return s.replace(/\r\n/g, "\n").trim();
}

function compactList(items: string[], max = 10): string[] {
  return (items || [])
    .map((x) => normalizeWhitespace(String(x || "")))
    .filter(Boolean)
    .slice(0, max);
}

function compactTeamSnapshot(teamSnapshotCompact: string, maxChars = 2000): string {
  const t = safeBlock(teamSnapshotCompact || "");
  if (!t) return "(no team snapshot provided)";
  return t.length > maxChars ? `${t.slice(0, maxChars)}\n...[truncated]` : t;
}

/* ---------------------------- stable system base -------------------------- */

// Keep this constant across calls for caching. Keep ASCII punctuation.
const SYSTEM_BASE = `You are Questboard, an execution planner.

Return ONLY valid JSON that matches the provided JSON schema.
No markdown. No commentary. No trailing text.

General rules:
- Prefer short strings.
- Keep lists small and within schema maxItems.
- Avoid duplicate items.
- Do not invent emails unless you are confident.
`;

/* --------------------------- Clarify (Goal) ------------------------------- */

export const CLARIFY_SYSTEM_PROMPT = `${SYSTEM_BASE}
Clarification rules:
- Provide clear, actionable clarification.
- Constraints must be realistic and specific.
- Success criteria must be measurable.
`;

/**
 * Backwards compatible signature:
 * buildClarifyPrompt(goalTitle: string)
 */
export function buildClarifyPrompt(goalTitle: string): string;
/**
 * Expanded signature:
 * buildClarifyPrompt({ title, context, knownConstraints, orgContext })
 */
export function buildClarifyPrompt(args: {
  title: string;
  context?: string;
  knownConstraints?: string[];
  orgContext?: string;
}): string;
export function buildClarifyPrompt(
  arg: string | { title: string; context?: string; knownConstraints?: string[]; orgContext?: string }
): string {
  if (typeof arg === "string") {
    const title = safeInline(arg);
    return `Clarify this goal by providing structured information.

Goal: "${title}"

Return ONLY valid JSON matching the schema.`;
  }

  const title = safeInline(arg.title);
  const context = arg.context ? safeBlock(arg.context) : "";
  const known = compactList(arg.knownConstraints || [], 10);
  const orgContext = arg.orgContext ? safeBlock(arg.orgContext) : "";

  return `Clarify this goal by providing structured information.

Goal: "${title}"

${orgContext ? `ORGANIZATIONAL CONTEXT (use this to inform your clarification):
${orgContext}

` : ""}Context (optional):
${context || "(none)"}

Known constraints (optional):
${known.length ? `- ${known.join("\n- ")}` : "(none)"}

Return ONLY valid JSON matching the schema.`;
}

/**
 * JSON Schema for clarify output
 * NOTE: kept compatible with your current structure.
 */
export const CLARIFY_SCHEMA = {
  name: "clarify_goal_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["goal", "clarified"],
    properties: {
      goal: { type: "string", description: "The original goal title" },
      clarified: {
        type: "object",
        additionalProperties: false,
        required: ["what", "why", "success", "constraints", "questions"],
        properties: {
          what: { type: "string", description: "What needs to be achieved" },
          why: { type: "string", description: "Motivation or reason" },
          success: { type: "string", description: "Measurable completion criteria" },
          constraints: {
            type: "array",
            items: { type: "string" },
            maxItems: 10,
            description: "Constraints or limitations"
          },
          questions: {
            type: "array",
            items: { type: "string" },
            maxItems: 6,
            description: "Questions to ask before executing (can be empty array if none)"
          }
        }
      }
    }
  }
} as const;

/* -------------------------- Decompose (Goal) ------------------------------ */

export const DECOMPOSE_SYSTEM_PROMPT = `${SYSTEM_BASE}
Decomposition rules:
- Stay within max items.
- Tasks must be actionable and testable (acceptance criteria).
- Keep dependencies minimal.
- Use WG phases: W I D G E T.
- Suggest owner_hint_email only when confident, otherwise omit.
- Keep estimates in minutes.
`;

/**
 * Build user prompt for goal decomposition
 */
export function buildDecomposePrompt(args: {
  clarifiedGoal: {
    goal: string;
    clarified: {
      what: string;
      why: string;
      success: string;
      constraints: string[];
    };
  };
  teamSnapshotCompact: string;
  orgContext?: string;
}): string {
  const goal = safeBlock(args.clarifiedGoal.goal);
  const what = safeBlock(args.clarifiedGoal.clarified.what);
  const why = safeBlock(args.clarifiedGoal.clarified.why);
  const success = safeBlock(args.clarifiedGoal.clarified.success);
  const constraints = compactList(args.clarifiedGoal.clarified.constraints || [], 10);
  const team = compactTeamSnapshot(args.teamSnapshotCompact);
  const orgContext = args.orgContext ? safeBlock(args.orgContext) : "";

  return `DECOMPOSE THIS GOAL INTO QUESTLINES + TASKS.

GOAL:
${goal}

WHAT:
${what}

WHY:
${why}

SUCCESS:
${success}

CONSTRAINTS:
${constraints.length ? `- ${constraints.join("\n- ")}` : "(none)"}

${orgContext ? `ORGANIZATIONAL CONTEXT (use this to inform decomposition - reference similar goals, patterns, and existing artifacts):
${orgContext}

` : ""}TEAM (use for phase-fit + capacity awareness):
${team}

OUTPUT REQUIREMENTS:
- IMPORTANT: Create EXACTLY 3-5 questlines (prefer 3-4 for simple goals, 5 for complex ones)
- Each questline should represent a major theme or workstream (like game quest chains)
- 5 to 25 tasks total, distributed across questlines
- Identify up to 8 expansion_candidates (task ids) that would benefit from deeper breakdown
- Each task must include: phase, estimate_min, acceptance_criteria, depends_on_task_ids (can be empty)
- Assign tasks to questlines based on thematic fit (tasks in same questline should tell a coherent story)
- Reference organizational patterns and existing artifacts when relevant
`;
}

/**
 * JSON Schema for decompose output
 */
export const DECOMPOSE_SCHEMA = {
  name: "goal_decomposition_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["summary", "questlines", "tasks", "expansion_candidates"],
    properties: {
      summary: { type: "string" },
      questlines: {
        type: "array",
        minItems: 3,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "outcome", "priority"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            outcome: { type: "string" },
            priority: { type: "integer", minimum: 1, maximum: 5 }
          }
        }
      },
      tasks: {
        type: "array",
        maxItems: 25,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "questline_id",
            "title",
            "description",
            "phase",
            "estimate_min",
            "acceptance_criteria",
            "depends_on_task_ids",
            "owner_hint_email"
          ],
          properties: {
            id: { type: "string" },
            questline_id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            phase: { type: "string", enum: ["W", "I", "D", "G", "E", "T"] },
            estimate_min: { type: "integer", minimum: 5, maximum: 480 },
            acceptance_criteria: {
              type: "array",
              maxItems: 6,
              items: { type: "string" }
            },
            depends_on_task_ids: {
              type: "array",
              maxItems: 8,
              items: { type: "string" }
            },
            owner_hint_email: { 
              type: "string",
              description: "Email of suggested owner (empty string if not confident)"
            }
          }
        }
      },
      expansion_candidates: {
        type: "array",
        maxItems: 8,
        items: { type: "string" }
      }
    }
  }
} as const;

/* --------------------------- Expand (Task) -------------------------------- */

export const EXPAND_SYSTEM_PROMPT = `${SYSTEM_BASE}
Expansion rules:
- Expand into 3 to 12 subtasks max.
- Subtasks must be actionable and testable.
- Keep dependencies minimal.
- Use WG phases: W I D G E T.
- Suggest owner_hint_email only when confident, otherwise omit.
`;

/**
 * Build user prompt for task expansion
 */
export function buildExpandPrompt(args: {
  task: {
    id: string;
    title: string;
    description?: string;
    phase?: string;
    acceptance?: string[];
  };
  teamSnapshotCompact: string;
}): string {
  const id = safeInline(args.task.id);
  const title = safeBlock(args.task.title);
  const description = safeBlock(args.task.description || "");
  const phase = (args.task.phase || "E").toUpperCase();
  const acceptance = compactList(args.task.acceptance || [], 8);
  const team = compactTeamSnapshot(args.teamSnapshotCompact);

  return `EXPAND THIS SINGLE TASK INTO SUBTASKS.

TASK:
- id: ${id}
- title: ${title}
- description: ${description || "(none)"}
- phase: ${["W","I","D","G","E","T"].includes(phase) ? phase : "E"}
- acceptance_criteria: ${acceptance.length ? acceptance.join(" | ") : "Task complete"}

TEAM:
${team}

OUTPUT REQUIREMENTS:
- 3 to 12 subtasks
- Each subtask must include: phase, estimate_min, acceptance_criteria, depends_on_subtask_ids (can be empty)
`;
}

/**
 * JSON Schema for expand output
 */
export const EXPAND_SCHEMA = {
  name: "task_expansion_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["task_id", "subtasks", "updated_acceptance_criteria"],
    properties: {
      task_id: { type: "string" },
      updated_acceptance_criteria: {
        type: "array",
        maxItems: 8,
        items: { type: "string" }
      },
      subtasks: {
        type: "array",
        maxItems: 12,
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "id",
            "title",
            "phase",
            "estimate_min",
            "acceptance_criteria",
            "depends_on_subtask_ids",
            "owner_hint_email"
          ],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            phase: { type: "string", enum: ["W", "I", "D", "G", "E", "T"] },
            estimate_min: { type: "integer", minimum: 5, maximum: 240 },
            acceptance_criteria: {
              type: "array",
              maxItems: 5,
              items: { type: "string" }
            },
            depends_on_subtask_ids: {
              type: "array",
              maxItems: 6,
              items: { type: "string" }
            },
            owner_hint_email: { 
              type: "string",
              description: "Email of suggested owner (empty string if not confident)"
            }
          }
        }
      }
    }
  }
} as const;

/* --------------------------- Level Up (Goal) ------------------------------ */

export const LEVEL_UP_SYSTEM_PROMPT = `${SYSTEM_BASE}
Level Up rules:
- Generate the next level of goal maturity based on current level.
- Level 0→1: Add outcome statement, success metric, target value.
- Level 1→2: Add milestones (3-7), rough sequence, first 10 quests.
- Level 2→3: Add dependencies, risks, resourcing estimate, blockers.
- Level 3→4: Add playbook/SOPs, recurring maintenance quests, KPI dashboard spec.
- Level 4→5: Add longer roadmap, strategic bets, contingency branches.
- Keep outputs practical and actionable.
- Do not invent data that isn't inferrable from the goal.
`;

export function buildLevelUpPrompt(goal: {
  id: string;
  title: string;
  level?: number | null;
  outcome?: string | null;
  successMetric?: string | null;
  planMarkdown?: string | null;
  parentGoalId?: string | null;
  summary?: string | null;
  orgContext?: string;
}): string {
  const title = safeInline(goal.title);
  const currentLevel = goal.level ?? 0;
  const nextLevel = currentLevel + 1;
  
  let levelContext = "";
  if (currentLevel === 0) {
    levelContext = "This is a draft goal (Level 0) with only a title. Generate Level 1 content: a single-sentence summary, outcome statement, success metric, and target value.";
  } else if (currentLevel === 1) {
    levelContext = `Current Level 1 content:
- Outcome: ${goal.outcome || "(none)"}
- Success Metric: ${goal.successMetric || "(none)"}
- Target Value: ${goal.successMetric ? "(to be set)" : "(none)"}

Generate Level 2 content: milestones (3-7), rough sequence, and first 10 starter quests.`;
  } else if (currentLevel === 2) {
    levelContext = `Current Level 2 content:
- Plan: ${goal.planMarkdown ? safeBlock(goal.planMarkdown).substring(0, 500) : "(none)"}

Generate Level 3 content: dependencies, risks, resourcing estimate, and blockers list.`;
  } else if (currentLevel === 3) {
    levelContext = `Current Level 3 content:
- Plan: ${goal.planMarkdown ? safeBlock(goal.planMarkdown).substring(0, 500) : "(none)"}

Generate Level 4 content: playbook/SOPs, recurring maintenance quests, and KPI dashboard spec.`;
  } else if (currentLevel === 4) {
    levelContext = `Current Level 4 content:
- Plan: ${goal.planMarkdown ? safeBlock(goal.planMarkdown).substring(0, 500) : "(none)"}

Generate Level 5 content: longer roadmap, strategic bets, and contingency branches.`;
  }
  
  const orgContext = goal.orgContext ? safeBlock(goal.orgContext) : "";

  return `Level up this goal from Level ${currentLevel} to Level ${nextLevel}.

Goal: "${title}"
Goal ID: ${goal.id}
${goal.parentGoalId ? `Parent Goal ID: ${goal.parentGoalId}` : "This is a top-level goal"}

${orgContext ? `ORGANIZATIONAL CONTEXT (use this to inform level-up - reference similar goals, patterns, and organizational knowledge):
${orgContext}

` : ""}${levelContext}

Return ONLY valid JSON matching the schema.`;
}

export const LEVEL_UP_SCHEMA = {
  name: "level_up_goal_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["next_level", "summary", "goal_updates", "milestones", "quests", "child_goals", "assumptions"],
    properties: {
      next_level: {
        type: "integer",
        minimum: 1,
        maximum: 5,
        description: "The target level (current + 1)"
      },
      summary: {
        type: "string",
        description: "A single sentence summary of the goal at its new level."
      },
      goal_updates: {
        type: "object",
        additionalProperties: false,
        required: ["outcome", "success_metric", "target_value", "plan_markdown", "playbook_markdown", "risks", "dependencies"],
        properties: {
          outcome: { type: "string", description: "Outcome statement (for L1). Use empty string if not applicable." },
          success_metric: { type: "string", description: "Success metric (for L1). Use empty string if not applicable." },
          target_value: { type: "string", description: "Target value for metric (for L1). Use empty string if not applicable." },
          plan_markdown: { type: "string", description: "Long plan in markdown (for L2+). Use empty string if not applicable." },
          playbook_markdown: { type: "string", description: "SOPs/playbook in markdown (for L4+). Use empty string if not applicable." },
          risks: {
            type: "array",
            items: { type: "string" },
            maxItems: 10,
            description: "List of risks (for L3+). Use empty array if not applicable."
          },
          dependencies: {
            type: "array",
            items: { type: "string" },
            maxItems: 10,
            description: "List of dependencies (for L3+). Use empty array if not applicable."
          }
        }
      },
      milestones: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "due_date"],
          properties: {
            title: { type: "string" },
            due_date: { type: "string", description: "ISO date string (YYYY-MM-DD) or empty string if not applicable" }
          }
        },
        maxItems: 7,
        description: "Milestones for L2+. Use empty array if not applicable."
      },
      quests: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "objective", "priority", "points"],
          properties: {
            title: { type: "string" },
            objective: { type: "string" },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"], description: "Priority level" },
            points: { type: "integer", minimum: 1, maximum: 5, description: "Point value (1-5)" }
          }
        },
        maxItems: 10,
        description: "Starter quests for L2+. Use empty array if not applicable."
      },
      child_goals: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "level"],
          properties: {
            title: { type: "string" },
            level: { type: "integer", minimum: 0, maximum: 5 }
          }
        },
        maxItems: 5,
        description: "Suggested child goals (optional)"
      },
      assumptions: {
        type: "array",
        items: { type: "string" },
        maxItems: 10,
        description: "Key assumptions (for L3+)"
      }
    }
  }
} as const;

/* --------------------------- Improve Goal Structure ----------------------- */

export const IMPROVE_GOAL_SYSTEM_PROMPT = `${SYSTEM_BASE}
Goal Structure Improvement rules:
- Improve goal title to be clear, concise, and action-oriented (one sentence).
- Ensure problem statement is specific and measurable.
- Ensure outcome statement clearly defines success.
- Suggest 2-5 metrics with realistic targets.
- Identify scope level (company/program/team/individual) based on goal.
- Suggest milestones that are achievable and time-bound.
- Identify dependencies and risks realistically.
- Reference organizational context to avoid duplication and align with existing goals.
`;

export function buildImproveGoalPrompt(args: {
  goal: {
    title: string;
    problem?: string | null;
    outcome?: string | null;
    scope_level?: string;
    spec_json?: any;
  };
  orgContext?: string;
}): string {
  const title = safeInline(args.goal.title);
  const problem = args.goal.problem || args.goal.spec_json?.problem || "";
  const outcome = args.goal.outcome || args.goal.spec_json?.outcome || "";
  const scopeLevel = args.goal.scope_level || args.goal.spec_json?.scope_level || "program";
  const orgContext = args.orgContext ? safeBlock(args.orgContext) : "";

  return `Improve this goal's structure to make it clearer, more actionable, and better aligned with organizational context.

CURRENT GOAL:
Title: "${title}"
Problem: ${problem || "(not specified)"}
Outcome: ${outcome || "(not specified)"}
Scope Level: ${scopeLevel}

${orgContext ? `ORGANIZATIONAL CONTEXT (use this to improve alignment and avoid duplication):
${orgContext}

` : ""}IMPROVEMENT REQUIREMENTS:
- Title: Make it a clear, concise one-sentence goal (action-oriented)
- Problem: Specific, measurable problem statement
- Outcome: Clear success definition
- Metrics: 2-5 metrics with realistic targets
- Scope: Appropriate scope level (company/program/team/individual)
- Milestones: 3-7 achievable, time-bound milestones
- Dependencies: Realistic dependencies
- Risks: Key risks identified

Return ONLY valid JSON matching the schema.`;
}

export const IMPROVE_GOAL_SCHEMA = {
  name: "improve_goal_structure_v1",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["improved_title", "improved_problem", "improved_outcome", "metrics", "scope_level", "milestones", "dependencies", "risks", "summary"],
    properties: {
      improved_title: {
        type: "string",
        description: "Improved goal title (one clear sentence, action-oriented)"
      },
      improved_problem: {
        type: "string",
        description: "Improved problem statement (specific and measurable)"
      },
      improved_outcome: {
        type: "string",
        description: "Improved outcome statement (clear success definition)"
      },
      metrics: {
        type: "array",
        minItems: 2,
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "target", "window"],
          properties: {
            name: { type: "string" },
            target: { 
              type: "string",
              description: "Target value as a string (can be a number like '5' or a percentage like '20%')"
            },
            window: { type: "string" }
          }
        }
      },
      scope_level: {
        type: "string",
        enum: ["company", "program", "team", "individual"]
      },
      milestones: {
        type: "array",
        minItems: 3,
        maxItems: 7,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["title", "due_date"],
          properties: {
            title: { type: "string" },
            due_date: { type: "string", description: "ISO date string (YYYY-MM-DD)" }
          }
        }
      },
      dependencies: {
        type: "array",
        items: { type: "string" },
        maxItems: 10
      },
      risks: {
        type: "array",
        items: { type: "string" },
        maxItems: 10
      },
      summary: {
        type: "string",
        description: "One-sentence summary of the improved goal"
      }
    }
  }
} as const;

/* --------------------------- exports for callers -------------------------- */

export const PROMPTS = {
  version: PROMPT_VERSION,
  clarify: {
    system: CLARIFY_SYSTEM_PROMPT,
    schema: CLARIFY_SCHEMA
  },
  decompose: {
    system: DECOMPOSE_SYSTEM_PROMPT,
    schema: DECOMPOSE_SCHEMA
  },
  expand: {
    system: EXPAND_SYSTEM_PROMPT,
    schema: EXPAND_SCHEMA
  },
  levelUp: {
    system: LEVEL_UP_SYSTEM_PROMPT,
    schema: LEVEL_UP_SCHEMA
  },
  improveGoal: {
    system: IMPROVE_GOAL_SYSTEM_PROMPT,
    schema: IMPROVE_GOAL_SCHEMA
  }
};
