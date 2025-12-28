/**
 * Questboard-specific AI functions
 */

import { callAi } from "./index";
import type { ClarifyOutput, DecomposeOutput, TemplateQuestline } from "@sb/schemas";

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
export async function runClarifyGoal(input: string): Promise<ClarifyOutput> {
  const prompt = `Clarify this goal by providing structured information.

Goal: "${input}"

Return ONLY valid JSON in this exact structure (no markdown, no code blocks, just JSON):
{
  "goal": "${input}",
  "clarified": {
    "what": "Clear description of what needs to be achieved",
    "why": "The reason or motivation behind this goal",
    "success": "How we'll know when this goal is achieved",
    "constraints": ["constraint1", "constraint2"]
  },
  "confidence": 0.8
}`;

  const result = await callAi<{ content: string }>({
    input: prompt,
    model: "gpt-4",
    useCache: true,
  });

  // Parse the JSON response
  const parsed = parseJsonResponse<ClarifyOutput>(
    typeof result.result === "string" ? result.result : JSON.stringify(result.result)
  );

  // Validate the structure
  if (!parsed.clarified || !parsed.goal) {
    throw new Error("Invalid clarify output structure");
  }

  return parsed;
}

/**
 * Decompose a goal into questlines
 */
export async function runDecomposeGoal(
  goalId: string,
  clarifiedGoal: ClarifyOutput
): Promise<DecomposeOutput> {
  const prompt = `Decompose this clarified goal into sequential questlines (connected task sequences).

Goal: ${clarifiedGoal.goal}
What: ${clarifiedGoal.clarified.what}
Why: ${clarifiedGoal.clarified.why}
Success: ${clarifiedGoal.clarified.success}
Constraints: ${clarifiedGoal.clarified.constraints.join(", ")}

Return ONLY valid JSON in this exact structure (no markdown, no code blocks, just JSON):
{
  "goalId": "${goalId}",
  "questlines": [
    {
      "id": "q1",
      "title": "Questline title",
      "description": "What this questline accomplishes",
      "order": 1,
      "locked": false,
      "prerequisiteIds": []
    }
  ],
  "estimatedComplexity": "medium"
}

Create 3-6 questlines that are sequential. Later questlines may depend on earlier ones via prerequisiteIds array.`;

  const result = await callAi<{ content: string }>({
    input: prompt,
    model: "gpt-4",
    useCache: true,
  });

  // Parse the JSON response
  const parsed = parseJsonResponse<DecomposeOutput>(
    typeof result.result === "string" ? result.result : JSON.stringify(result.result)
  );

  // Validate the structure
  if (!parsed.questlines || !Array.isArray(parsed.questlines)) {
    throw new Error("Invalid decompose output structure");
  }

  return parsed;
}
