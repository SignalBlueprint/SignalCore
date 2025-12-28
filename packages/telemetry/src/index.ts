/**
 * @sb/telemetry
 * Telemetry and cost tracking for AI calls and operations
 */

import * as fs from "fs";
import * as path from "path";

export interface RunEvent {
  type: "run";
  timestamp: string;
  model?: string;
  inputHash?: string;
  cached: boolean;
  duration?: number;
}

export interface CostEvent {
  type: "cost";
  timestamp: string;
  model: string;
  tokens?: {
    input?: number;
    output?: number;
  };
  cost?: number;
}

export type TelemetryEvent = RunEvent | CostEvent;

interface TelemetryState {
  totalCalls: number;
  cachedCalls: number;
  totalTokens: number;
  totalCost: number;
}

const state: TelemetryState = {
  totalCalls: 0,
  cachedCalls: 0,
  totalTokens: 0,
  totalCost: 0,
};

const RUNLOGS_DIR = path.join(process.cwd(), ".sb", "runlogs");

/**
 * Ensure .sb/runlogs directory exists
 */
function ensureRunlogsDir(): void {
  if (!fs.existsSync(RUNLOGS_DIR)) {
    fs.mkdirSync(RUNLOGS_DIR, { recursive: true });
  }
}

/**
 * Append event to JSONL file
 */
function appendToRunlogs(event: TelemetryEvent): void {
  try {
    ensureRunlogsDir();
    const date = new Date().toISOString().split("T")[0];
    const filepath = path.join(RUNLOGS_DIR, `runlogs-${date}.jsonl`);
    const line = JSON.stringify(event) + "\n";
    fs.appendFileSync(filepath, line, "utf-8");
  } catch (error) {
    // Silently fail if we can't write runlogs
    console.error("Failed to write telemetry event:", error);
  }
}

/**
 * Record an AI call event
 */
export interface RecordAiCallOptions {
  model: string;
  inputHash: string;
  cached: boolean;
  tokens?: {
    input?: number;
    output?: number;
  };
  duration?: number;
}

export function recordAiCall(options: RecordAiCallOptions): void {
  const { model, inputHash, cached, tokens, duration } = options;

  // Update in-memory counters
  state.totalCalls++;
  if (cached) {
    state.cachedCalls++;
  }

  if (tokens) {
    const total = (tokens.input || 0) + (tokens.output || 0);
    state.totalTokens += total;
  }

  // Create and append run event
  const runEvent: RunEvent = {
    type: "run",
    timestamp: new Date().toISOString(),
    model,
    inputHash,
    cached,
    duration,
  };

  appendToRunlogs(runEvent);

  // If tokens provided, create cost event (cost calculation would go here)
  if (tokens) {
    const costEvent: CostEvent = {
      type: "cost",
      timestamp: new Date().toISOString(),
      model,
      tokens,
    };
    appendToRunlogs(costEvent);
  }
}

/**
 * Get current telemetry state
 */
export function getTelemetryState(): TelemetryState {
  return { ...state };
}

/**
 * Reset telemetry state (useful for testing)
 */
export function resetTelemetryState(): void {
  state.totalCalls = 0;
  state.cachedCalls = 0;
  state.totalTokens = 0;
  state.totalCost = 0;
}

