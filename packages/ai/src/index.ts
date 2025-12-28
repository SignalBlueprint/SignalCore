/**
 * @sb/ai
 * AI-related utilities and integrations with caching and telemetry
 */

import { hashInput, getJson, setJson } from "@sb/cache";
import { publish } from "@sb/events";
import { recordAiCall } from "@sb/telemetry";

/**
 * Options for AI call
 */
export interface AiCallOptions {
  model?: string;
  input: string;
  useCache?: boolean;
}

/**
 * Result of an AI call
 */
export interface AiCallResult<T = unknown> {
  result: T;
  cached: boolean;
  inputHash: string;
}

/**
 * Make an AI call with caching and telemetry
 * This is a demo implementation showing the pattern.
 * Replace the actual AI call logic with your OpenAI/Anthropic/etc implementation.
 */
export async function callAi<T = unknown>(
  options: AiCallOptions
): Promise<AiCallResult<T>> {
  const { input, model = "gpt-4", useCache = true } = options;
  const inputHash = hashInput(input);
  const startTime = Date.now();

  // Check cache first
  if (useCache) {
    const cached = getJson<T>(inputHash);
    if (cached !== null) {
      // Record cached call
      recordAiCall({
        model,
        inputHash,
        cached: true,
        duration: Date.now() - startTime,
      });

      // Publish ai.run event (cached)
      await publish("ai.run", {
        model,
        inputHash,
        cached: true,
        duration: Date.now() - startTime,
      }, {
        sourceApp: "ai",
      });

      return {
        result: cached,
        cached: true,
        inputHash,
      };
    }
  }

  // Make actual AI call (demo - replace with real implementation)
  // const response = await openai.chat.completions.create({ ... });
  // const result = response.choices[0].message.content;
  
  // For demo purposes, return a placeholder result
  const result = { message: "AI response (demo)", input } as T;

  // Store in cache
  if (useCache) {
    setJson(inputHash, result);
  }

  // Record AI call
  recordAiCall({
    model,
    inputHash,
    cached: false,
    duration: Date.now() - startTime,
    // tokens: { input: promptTokens, output: completionTokens }, // Add when available
  });

  // Publish ai.run event
  await publish("ai.run", {
    model,
    inputHash,
    cached: false,
    duration: Date.now() - startTime,
  }, {
    sourceApp: "ai",
  });

  return {
    result,
    cached: false,
    inputHash,
  };
}

/**
 * Example usage:
 * 
 * const result = await callAi({
 *   input: "What is the weather?",
 *   model: "gpt-4",
 *   useCache: true
 * });
 * 
 * if (result.cached) {
 *   console.log("Used cached result");
 * }
 */

export * from "./questboard";
export * from "./openai-client";
export * from "./schemas";
export * from "./prompts";
