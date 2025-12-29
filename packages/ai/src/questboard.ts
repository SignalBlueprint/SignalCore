/**
 * Questboard-specific AI functions
 */

// Ensure environment variables are loaded
import "@sb/config";

import { callAi } from "./index";
import { decomposeGoalStructured, expandTaskStructured } from "./openai-client";
import OpenAI from "openai";
import { hashInput, getJson, setJson } from "@sb/cache";
import { publish } from "@sb/events";
import { recordAiCall } from "@sb/telemetry";
import type { ClarifyOutput, DecomposeOutput, TemplateQuestline, TeamSnapshot, LevelUpResponse, Goal } from "@sb/schemas";
import {
  CLARIFY_SYSTEM_PROMPT,
  buildClarifyPrompt,
  CLARIFY_SCHEMA,
  DECOMPOSE_SYSTEM_PROMPT,
  buildDecomposePrompt,
  EXPAND_SYSTEM_PROMPT,
  buildExpandPrompt,
  LEVEL_UP_SYSTEM_PROMPT,
  buildLevelUpPrompt,
  LEVEL_UP_SCHEMA,
  IMPROVE_GOAL_SYSTEM_PROMPT,
  buildImproveGoalPrompt,
  IMPROVE_GOAL_SCHEMA,
} from "./prompts";
import { buildOrgContext, formatOrgContext } from "./org-context";

// Reuse OpenAI client (will be initialized in openai-client.ts)
// For clarify, we'll create our own instance to avoid circular dependencies
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set. Make sure .env file exists in the repository root with OPENAI_API_KEY set.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

/**
 * Parse JSON from AI response, handling markdown code blocks
 */
function parseJsonResponse<T>(text: string): T {
  // Remove markdown code blocks if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  
  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error}. Text: ${cleaned.substring(0, 200)}`);
  }
}

/**
 * Clarify a goal - structure and validate the goal definition
 */
export async function runClarifyGoal(
  input: string,
  options?: { orgId?: string }
): Promise<ClarifyOutput> {
  // Build org context if orgId provided
  let orgContextText = "";
  if (options?.orgId) {
    try {
      const context = await buildOrgContext(options.orgId, { maxActiveGoals: 8, maxCompletedGoals: 3 });
      orgContextText = formatOrgContext(context, 2000);
    } catch (error) {
      console.warn("Failed to build org context for clarify:", error);
    }
  }

  const systemPrompt = CLARIFY_SYSTEM_PROMPT;
  const userPrompt = buildClarifyPrompt({
    title: input,
    orgContext: orgContextText || undefined,
  });

  // Check cache first
  const cacheKey = `${systemPrompt}\n\n${userPrompt}`;
  const inputHash = hashInput(cacheKey);
  const cached = getJson<ClarifyOutput>(inputHash);
  if (cached !== null) {
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: true,
      duration: 0,
    });
    return cached;
  }

  const startTime = Date.now();

  try {
    const openai = getOpenAIClient();
    
    // Use structured outputs for clarify
    // Note: json_schema requires gpt-4o, gpt-4-turbo, or gpt-4o-mini (2024-11-20 or later)
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // This model supports structured outputs
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: CLARIFY_SCHEMA, // CLARIFY_SCHEMA already has name, strict, and schema
      },
      max_tokens: 800,
      temperature: 0.2,
    });

    // With structured outputs, the content should be valid JSON matching the schema
    // But we need to check both the content field and the response format
    const choice = response.choices[0];
    if (!choice) {
      console.error("No choices in OpenAI response. Full response:", JSON.stringify(response, null, 2));
      throw new Error("No choices in response");
    }

    let content = choice.message?.content;
    
    // With structured outputs, content should always be present and valid JSON
    if (!content) {
      console.error("No content in OpenAI response. Full response:", JSON.stringify(response, null, 2));
      console.error("Choice object:", JSON.stringify(choice, null, 2));
      throw new Error("No content in response");
    }

    // Log the raw response for debugging
    if (process.env.DEBUG_AI) {
      console.log("[AI] Clarify response content:", content);
      console.log("[AI] Full response:", JSON.stringify(response, null, 2));
    }

    let parsed: ClarifyOutput;
    try {
      // With structured outputs, content should be valid JSON
      // Try parsing directly
      parsed = JSON.parse(content) as ClarifyOutput;
      
      // Log what we got for debugging
      if (process.env.DEBUG_AI) {
        console.log("[AI] Parsed clarify output:", JSON.stringify(parsed, null, 2));
      }
    } catch (parseError) {
      // If direct parse fails, try cleaning it (might have markdown code blocks)
      try {
        const cleaned = parseJsonResponse<ClarifyOutput>(content);
        parsed = cleaned;
      } catch (cleanError) {
        console.error("Failed to parse clarify response. Raw content:", content.substring(0, 1000));
        console.error("Parse error:", parseError);
        throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }
    }

    // Validate the structure with detailed error messages
    if (!parsed) {
      console.error("Parsed result is null or undefined. Raw content:", content);
      throw new Error("Invalid clarify output structure: parsed result is null");
    }
    
    // Check for common issues
    if (typeof parsed !== 'object') {
      console.error("Parsed result is not an object:", typeof parsed, content);
      throw new Error("Invalid clarify output structure: response is not an object");
    }
    
    if (!parsed.clarified) {
      console.error("Missing 'clarified' field. Parsed object keys:", Object.keys(parsed));
      console.error("Full parsed object:", JSON.stringify(parsed, null, 2));
      throw new Error("Invalid clarify output structure: missing 'clarified' field");
    }
    if (!parsed.goal) {
      console.error("Missing 'goal' field. Parsed object keys:", Object.keys(parsed));
      console.error("Full parsed object:", JSON.stringify(parsed, null, 2));
      throw new Error("Invalid clarify output structure: missing 'goal' field");
    }
    if (!parsed.clarified.what || !parsed.clarified.why || !parsed.clarified.success) {
      console.error("Missing required fields in 'clarified'. Available fields:", Object.keys(parsed.clarified || {}));
      console.error("Full 'clarified' object:", JSON.stringify(parsed.clarified, null, 2));
      throw new Error("Invalid clarify output structure: missing required fields in 'clarified' (what, why, or success)");
    }
    if (!Array.isArray(parsed.clarified.constraints)) {
      console.error("'constraints' is not an array. Type:", typeof parsed.clarified.constraints, "Value:", parsed.clarified.constraints);
      // Try to fix it if it's a string or null
      if (typeof parsed.clarified.constraints === 'string') {
        parsed.clarified.constraints = [];
      } else if (!parsed.clarified.constraints) {
        parsed.clarified.constraints = [];
      } else {
        throw new Error("Invalid clarify output structure: 'constraints' must be an array");
      }
    }

    // Store in cache
    setJson(inputHash, parsed);

    // Record AI call
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: false,
      duration: Date.now() - startTime,
    });

    await publish(
      "ai.run",
      {
        model: "gpt-4o-mini",
        inputHash,
        cached: false,
        duration: Date.now() - startTime,
      },
      {
        sourceApp: "ai",
      }
    );

    return parsed;
  } catch (error) {
    console.error("Clarify goal error:", error);
    throw new Error(
      `Failed to clarify goal: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Build compact team snapshot string for prompt
 */
function buildTeamSnapshotCompact(teamSnapshot?: TeamSnapshot): string {
  if (!teamSnapshot || teamSnapshot.members.length === 0) {
    return "No team members available.";
  }

  return teamSnapshot.members
    .map((member) => {
      const profile = member.profile;
      let line = `${member.email} (${member.role}): Top2=[${profile.top2.join(",")}], Cap=${profile.dailyCapacityMinutes}min`;
      if (profile.competency2 && profile.competency2[0] && profile.competency2[1]) {
        line += `, Comp=[${profile.competency2.join(",")}]`;
      }
      if (profile.frustration2 && profile.frustration2[0] && profile.frustration2[1]) {
        line += `, Frust=[${profile.frustration2.join(",")}]`;
      }
      return line;
    })
    .join("\n");
}

/**
 * Decompose a goal into questlines with tasks using structured outputs
 */
export async function runDecomposeGoal(
  goalId: string,
  clarifiedGoal: ClarifyOutput,
  teamSnapshot?: TeamSnapshot,
  options?: { orgId?: string }
): Promise<DecomposeOutput> {
  // Build org context if orgId provided
  let orgContextText = "";
  if (options?.orgId) {
    try {
      const context = await buildOrgContext(options.orgId, { 
        maxActiveGoals: 10, 
        maxCompletedGoals: 5,
        maxActiveQuests: 15,
        maxCompletedQuests: 10,
      });
      orgContextText = formatOrgContext(context, 2500);
    } catch (error) {
      console.warn("Failed to build org context for decompose:", error);
    }
  }

  const teamSnapshotCompact = buildTeamSnapshotCompact(teamSnapshot);
  const userPrompt = buildDecomposePrompt({
    clarifiedGoal,
    teamSnapshotCompact,
    orgContext: orgContextText || undefined,
  });

  const result = await decomposeGoalStructured({
    system: DECOMPOSE_SYSTEM_PROMPT,
    userPrompt,
    useCache: true,
  });

  // Transform structured output to DecomposeOutput format
  const structured = result.result as any;

  // Map questlines and tasks to the expected format
  const questlines = structured.questlines.map((ql: any, qlIndex: number) => {
    // Group tasks by questline_id
    const questlineTasks = structured.tasks.filter(
      (t: any) => t.questline_id === ql.id
    );

    // Create a single quest per questline (can be enhanced later)
    const quest = {
      id: `quest-${ql.id}`,
      title: ql.title,
      objective: ql.outcome,
      tasks: questlineTasks.map((t: any) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        phase: t.phase,
        estimatedMinutes: t.estimate_min,
        suggestedOwnerEmail: t.owner_hint_email && t.owner_hint_email.trim() ? t.owner_hint_email.trim() : undefined,
        priority: t.priority || "medium",
        requiresApproval: t.requires_approval || false,
        acceptanceCriteria: t.acceptance_criteria,
        dependsOnTaskIds: t.depends_on_task_ids || [],
      })),
    };

    return {
      id: ql.id,
      title: ql.title,
      description: ql.outcome,
      order: qlIndex + 1,
      locked: false,
      prerequisiteIds: [],
      quests: [quest],
    };
  });

  const output: DecomposeOutput = {
    goalId,
    questlines,
    estimatedComplexity: "medium",
    expansionCandidates: structured.expansion_candidates || [],
  };
  return output;
}

// buildExpandPrompt and EXPAND_SYSTEM_PROMPT are now imported from ./prompts

/**
 * Expand a task into subtasks using structured outputs
 */
export async function runExpandTask(args: {
  task: {
    id: string;
    title: string;
    description?: string;
    phase?: string;
    acceptance?: string[];
  };
  teamSnapshot?: TeamSnapshot;
}): Promise<{
  taskId: string;
  subtasks: Array<{
    id: string;
    title: string;
    description?: string;
    phase: string;
    estimatedMinutes: number;
    acceptanceCriteria: string[];
    dependsOnSubtaskIds: string[];
    ownerHintEmail?: string;
    priority?: string;
  }>;
  updatedAcceptanceCriteria: string[];
}> {
  const teamSnapshotCompact = buildTeamSnapshotCompact(args.teamSnapshot);
  const userPrompt = buildExpandPrompt({
    task: args.task,
    teamSnapshotCompact,
  });

  const result = await expandTaskStructured({
    system: EXPAND_SYSTEM_PROMPT,
    userPrompt,
    useCache: true,
  });

  const structured = result.result as any;

  return {
    taskId: structured.task_id,
    subtasks: structured.subtasks.map((st: any) => ({
      id: st.id,
      title: st.title,
      description: st.description,
      phase: st.phase,
      estimatedMinutes: st.estimate_min,
      acceptanceCriteria: st.acceptance_criteria,
      dependsOnSubtaskIds: st.depends_on_subtask_ids || [],
      ownerHintEmail: st.owner_hint_email && st.owner_hint_email.trim() ? st.owner_hint_email.trim() : undefined,
      priority: st.priority || "medium",
    })),
    updatedAcceptanceCriteria: structured.updated_acceptance_criteria,
  };
}

/**
 * Adapt a template questline to a new goal context
 */
export async function adaptTemplate(
  templateQuestlineDefinition: TemplateQuestline["questlineDefinition"],
  newGoalContext: string
): Promise<TemplateQuestline["questlineDefinition"]> {
  const prompt = `Given the following questline template and a new goal context, adapt the questline template to fit the new goal.

Questline Template:
${JSON.stringify(templateQuestlineDefinition, null, 2)}

New Goal Context: "${newGoalContext}"

Return ONLY valid JSON in the exact structure of the 'questlineDefinition' from the template, with updated titles, descriptions, and objectives to match the new goal context. Do not change the structure, order, or prerequisite logic (questIndex, taskIndex, taskIndices). Only modify the textual content.`;

  const result = await callAi<{ content: string }>({
    input: prompt,
    model: "gpt-4",
    useCache: true,
  });

  const parsed = parseJsonResponse<TemplateQuestline["questlineDefinition"]>(
    typeof result.result === "string" ? result.result : JSON.stringify(result.result)
  );

  if (!parsed.quests || !Array.isArray(parsed.quests)) {
    throw new Error("Invalid adaptTemplate output structure");
  }

  return parsed;
}

/**
 * Level Up a goal - generate next level content
 */
export async function runLevelUpGoal(
  goal: Goal,
  options?: { orgId?: string }
): Promise<LevelUpResponse> {
  // Build org context if orgId provided
  let orgContextText = "";
  if (options?.orgId) {
    try {
      const context = await buildOrgContext(options.orgId, { 
        maxActiveGoals: 10, 
        maxCompletedGoals: 5,
        maxKnowledgeCards: 10,
      });
      orgContextText = formatOrgContext(context, 2500);
    } catch (error) {
      console.warn("Failed to build org context for level up:", error);
    }
  }

  const systemPrompt = LEVEL_UP_SYSTEM_PROMPT;
  const userPrompt = buildLevelUpPrompt({
    ...goal,
    orgContext: orgContextText || undefined,
  });

  // Check cache first
  const cacheKey = `${systemPrompt}\n\n${userPrompt}`;
  const inputHash = hashInput(cacheKey);
  const cached = getJson<LevelUpResponse>(inputHash);
  if (cached !== null) {
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: true,
      duration: 0,
    });
    return cached;
  }

  const startTime = Date.now();

  try {
    const openai = getOpenAIClient();
    
    // Use structured outputs for level up
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: LEVEL_UP_SCHEMA,
      },
      max_tokens: 2000,
      temperature: 0.3,
    });

    const choice = response.choices[0];
    if (!choice) {
      throw new Error("No choices in response");
    }

    let content = choice.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    if (process.env.DEBUG_AI) {
      console.log("[AI] Level Up response content:", content);
    }

    const result = parseJsonResponse<LevelUpResponse>(content);

    // Store in cache
    setJson(inputHash, result);

    // Record AI call
    const duration = Date.now() - startTime;
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: false,
      duration,
    });

    // Publish event
    await publish("ai.level_up", {
      goalId: goal.id,
      currentLevel: goal.level || 0,
      nextLevel: result.next_level,
      cached: false,
      duration,
    }, {
      sourceApp: "questboard",
    });

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("[AI] Level Up failed:", error);
    
    await publish("ai.level_up.error", {
      goalId: goal.id,
      currentLevel: goal.level || 0,
      error: error instanceof Error ? error.message : String(error),
      duration,
    }, {
      sourceApp: "questboard",
    });

    throw error;
  }
}

/**
 * Improve goal structure - refine title, problem, outcome, metrics, etc.
 */
export async function runImproveGoal(
  goal: Goal,
  options?: { orgId?: string }
): Promise<{
  improved_title: string;
  improved_problem: string;
  improved_outcome: string;
  metrics: Array<{ name: string; target: number | string; window: string }>;
  scope_level: "company" | "program" | "team" | "individual";
  milestones: Array<{ title: string; due_date: string }>;
  dependencies: string[];
  risks: string[];
  summary: string;
}> {
  // Build org context if orgId provided
  let orgContextText = "";
  if (options?.orgId) {
    try {
      const context = await buildOrgContext(options.orgId, {
        maxActiveGoals: 10,
        maxCompletedGoals: 5,
      });
      orgContextText = formatOrgContext(context, 2500);
    } catch (error) {
      console.warn("Failed to build org context for improve goal:", error);
    }
  }

  const systemPrompt = IMPROVE_GOAL_SYSTEM_PROMPT;
  const userPrompt = buildImproveGoalPrompt({
    goal: {
      title: goal.title,
      problem: goal.problem || goal.spec_json?.problem,
      outcome: goal.outcome || goal.spec_json?.outcome,
      scope_level: goal.scope_level || goal.spec_json?.scope_level,
      spec_json: goal.spec_json,
    },
    orgContext: orgContextText || undefined,
  });

  // Check cache first
  const cacheKey = `${systemPrompt}\n\n${userPrompt}`;
  const inputHash = hashInput(cacheKey);
  const cached = getJson<any>(inputHash);
  if (cached !== null) {
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: true,
      duration: 0,
    });
    return cached;
  }

  const startTime = Date.now();

  try {
    const openai = getOpenAIClient();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: IMPROVE_GOAL_SCHEMA,
      },
      max_tokens: 1500,
      temperature: 0.3,
    });

    const choice = response.choices[0];
    if (!choice) {
      console.error("No choices in OpenAI response. Full response:", JSON.stringify(response, null, 2));
      throw new Error("No choices in response");
    }

    let content = choice.message?.content;
    
    // With structured outputs, content should always be present and valid JSON
    if (!content) {
      console.error("No content in OpenAI response. Full response:", JSON.stringify(response, null, 2));
      console.error("Choice object:", JSON.stringify(choice, null, 2));
      throw new Error("No content in response");
    }

    // Log the raw response for debugging
    if (process.env.DEBUG_AI) {
      console.log("Improve goal raw response:", content);
    }

    const result = parseJsonResponse<any>(content);

    // Cache result
    setJson(inputHash, result);

    const duration = Date.now() - startTime;
    recordAiCall({
      model: "gpt-4o-mini",
      inputHash,
      cached: false,
      duration,
    });

    await publish("ai.improve_goal", {
      goalId: goal.id,
      title: goal.title,
    }, {
      sourceApp: "questboard",
    });

    return result;
  } catch (error) {
    console.error("Improve goal error:", error);
    throw error;
  }
}
