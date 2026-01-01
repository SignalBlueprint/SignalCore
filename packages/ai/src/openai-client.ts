/**
 * OpenAI client with Responses API and structured outputs
 */

// Ensure environment variables are loaded
import "@sb/config";

import OpenAI from "openai";
import { hashInput, getJson, setJson } from "@sb/cache";
import { publish } from "@sb/events";
import { recordAiCall } from "@sb/telemetry";
import { DecompositionSchema, ExpansionSchema } from "./schemas";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is not set. Make sure .env file exists in the repository root with OPENAI_API_KEY set.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
}

type JsonSchemaFormat = {
  type: "json_schema";
  json_schema: { name: string; strict: boolean; schema: any };
};

interface StructuredCallOptions {
  model?: string;
  system: string;
  user: string;
  format: JsonSchemaFormat;
  maxOutputTokens?: number;
  useCache?: boolean;
}

/**
 * Make a structured AI call using Responses API with JSON Schema
 */
async function runStructured<T>(
  options: StructuredCallOptions
): Promise<{ result: T; cached: boolean; inputHash: string }> {
  const {
    model = "gpt-4o-mini",
    system,
    user,
    format,
    maxOutputTokens = 1200,
    useCache = true,
  } = options;

  // Create cache key from system + user prompt
  const cacheKey = `${system}\n\n${user}`;
  const inputHash = hashInput(cacheKey);
  const startTime = Date.now();

  // Check cache first
  if (useCache) {
    const cached = getJson<T>(inputHash);
    if (cached !== null) {
      recordAiCall({
        model,
        inputHash,
        cached: true,
        duration: Date.now() - startTime,
      });

      await publish(
        "ai.run",
        {
          model,
          inputHash,
          cached: true,
          duration: Date.now() - startTime,
        },
        {
          sourceApp: "ai",
        }
      );

      return {
        result: cached,
        cached: true,
        inputHash,
      };
    }
  }

  // Make actual API call
  try {
    const openai = getOpenAIClient();
    
    // Try Responses API first (if available), otherwise fall back to chat completions with structured outputs
    let result: T;
    
    try {
      // Attempt Responses API (newer API)
      const response = await (openai as any).responses.create({
        model,
        store: false,
        input: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        text: { format },
        max_output_tokens: maxOutputTokens,
        temperature: 0.2,
      });

      const raw = (response as any).output_text || (response as any).output?.[0]?.text || "";
      result = JSON.parse(raw) as T;
    } catch (responsesError) {
      // Fallback to chat completions with structured outputs (more widely supported)
      const response = await openai.chat.completions.create({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: format.json_schema.name,
            strict: format.json_schema.strict,
            schema: format.json_schema.schema,
          },
        },
        max_tokens: maxOutputTokens,
        temperature: 0.2,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No content in response");
      }
      result = JSON.parse(content) as T;
    }

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
    });

    await publish(
      "ai.run",
      {
        model,
        inputHash,
        cached: false,
        duration: Date.now() - startTime,
      },
      {
        sourceApp: "ai",
      }
    );

    return {
      result,
      cached: false,
      inputHash,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(
      `OpenAI API call failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Decompose a goal using structured outputs
 */
export async function decomposeGoalStructured(args: {
  model?: string;
  system: string;
  userPrompt: string;
  useCache?: boolean;
}) {
  return runStructured({
    model: args.model ?? "gpt-4o-mini",
    system: args.system,
    user: args.userPrompt,
    format: {
      type: "json_schema",
      json_schema: DecompositionSchema,
    } as any,
    maxOutputTokens: 1600,
    useCache: args.useCache ?? true,
  });
}

/**
 * Expand a task using structured outputs
 */
export async function expandTaskStructured(args: {
  model?: string;
  system: string;
  userPrompt: string;
  useCache?: boolean;
}) {
  return runStructured({
    model: args.model ?? "gpt-4o-mini",
    system: args.system,
    user: args.userPrompt,
    format: {
      type: "json_schema",
      json_schema: ExpansionSchema,
    } as any,
    maxOutputTokens: 1200,
    useCache: args.useCache ?? true,
  });
}

interface GenerateTextOptions {
  model?: string;
  prompt: string;
  system?: string;
  maxTokens?: number;
  temperature?: number;
  useCache?: boolean;
}

/**
 * Generate text using OpenAI chat completions
 */
export async function generateText(
  options: GenerateTextOptions
): Promise<string> {
  const {
    model = "gpt-4",
    prompt,
    system,
    maxTokens = 1000,
    temperature = 0.7,
    useCache = true,
  } = options;

  // Create cache key
  const cacheKey = system ? `${system}\n\n${prompt}` : prompt;
  const inputHash = hashInput(cacheKey);
  const startTime = Date.now();

  // Check cache first
  if (useCache) {
    const cached = getJson<string>(inputHash);
    if (cached !== null) {
      recordAiCall({
        model,
        inputHash,
        cached: true,
        duration: Date.now() - startTime,
      });

      await publish(
        "ai.run",
        {
          model,
          inputHash,
          cached: true,
          duration: Date.now() - startTime,
        },
        {
          sourceApp: "ai",
        }
      );

      return cached;
    }
  }

  // Make actual API call
  try {
    const openai = getOpenAIClient();

    const messages: Array<{ role: "system" | "user"; content: string }> = [];
    if (system) {
      messages.push({ role: "system", content: system });
    }
    messages.push({ role: "user", content: prompt });

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content in response");
    }

    // Store in cache
    if (useCache) {
      setJson(inputHash, content);
    }

    // Record AI call with token usage
    const tokens = {
      input: response.usage?.prompt_tokens,
      output: response.usage?.completion_tokens,
    };

    recordAiCall({
      model,
      inputHash,
      cached: false,
      duration: Date.now() - startTime,
      tokens,
    });

    await publish(
      "ai.run",
      {
        model,
        inputHash,
        cached: false,
        duration: Date.now() - startTime,
        tokens,
      },
      {
        sourceApp: "ai",
      }
    );

    return content;
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw new Error(
      `OpenAI API call failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

