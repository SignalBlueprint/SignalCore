/**
 * JSON Schemas for structured outputs using OpenAI Responses API
 */

export const DecompositionSchema = {
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
        maxItems: 5,
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "title", "outcome", "priority"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            outcome: { type: "string" },
            priority: { type: "integer", minimum: 1, maximum: 5 },
          },
        },
      },
      tasks: {
        type: "array",
        maxItems: 30,
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
            "owner_hint_email",
            "priority",
            "requires_approval",
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
              items: { type: "string" },
            },
            depends_on_task_ids: {
              type: "array",
              maxItems: 8,
              items: { type: "string" },
            },
            owner_hint_email: { 
              type: "string",
              description: "Email of suggested owner (empty string if not confident)"
            },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
            requires_approval: { type: "boolean" },
          },
        },
      },
      expansion_candidates: {
        description: "Task IDs worth expanding next (max 8).",
        type: "array",
        maxItems: 8,
        items: { type: "string" },
      },
    },
  },
} as const;

export const ExpansionSchema = {
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
        items: { type: "string" },
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
            "description",
            "phase",
            "estimate_min",
            "acceptance_criteria",
            "depends_on_subtask_ids",
            "owner_hint_email",
            "priority",
          ],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            description: { type: "string" },
            phase: { type: "string", enum: ["W", "I", "D", "G", "E", "T"] },
            estimate_min: { type: "integer", minimum: 5, maximum: 240 },
            acceptance_criteria: {
              type: "array",
              maxItems: 5,
              items: { type: "string" },
            },
            depends_on_subtask_ids: {
              type: "array",
              maxItems: 6,
              items: { type: "string" },
            },
            owner_hint_email: { 
              type: "string",
              description: "Email of suggested owner (empty string if not confident)"
            },
            priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
          },
        },
      },
    },
  },
} as const;

