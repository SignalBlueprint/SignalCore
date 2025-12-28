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
 * buildClarifyPrompt({ title, context, knownConstraints })
 */
export function buildClarifyPrompt(args: {
  title: string;
  context?: string;
  knownConstraints?: string[];
}): string;
export function buildClarifyPrompt(
  arg: string | { title: string; context?: string; knownConstraints?: string[] }
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

  return `Clarify this goal by providing structured information.

Goal: "${title}"

Context (optional):
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
}): string {
  const goal = safeBlock(args.clarifiedGoal.goal);
  const what = safeBlock(args.clarifiedGoal.clarified.what);
  const why = safeBlock(args.clarifiedGoal.clarified.why);
  const success = safeBlock(args.clarifiedGoal.clarified.success);
  const constraints = compactList(args.clarifiedGoal.clarified.constraints || [], 10);
  const team = compactTeamSnapshot(args.teamSnapshotCompact);

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

TEAM (use for phase-fit + capacity awareness):
${team}

OUTPUT REQUIREMENTS:
- IMPORTANT: Create EXACTLY 3-5 questlines (prefer 3-4 for simple goals, 5 for complex ones)
- Each questline should represent a major theme or workstream (like game quest chains)
- 5 to 25 tasks total, distributed across questlines
- Identify up to 8 expansion_candidates (task ids) that would benefit from deeper breakdown
- Each task must include: phase, estimate_min, acceptance_criteria, depends_on_task_ids (can be empty)
- Assign tasks to questlines based on thematic fit (tasks in same questline should tell a coherent story)
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
  }
};
