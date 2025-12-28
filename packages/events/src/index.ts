/**
 * @sb/events
 * Cross-app event publishing and subscription system
 */

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";

/**
 * Event types supported across the suite
 */
export type EventType =
  | "org.created"
  | "quest.goal.created"
  | "quest.goal.clarified"
  | "quest.goal.approved"
  | "quest.goal.denied"
  | "quest.goal.decomposed"
  | "task.created"
  | "task.completed"
  | "task.approved"
  | "task.updated"
  | "task.assigned"
  | "quest.unlocked"
  | "quest.updated"
  | "quest.checkpoint.passed"
  | "quest.deck.generated"
  | "task.stale"
  | "task.blocked"
  | "audit.task.changed"
  | "audit.quest.changed"
  | "audit.goal.changed"
  | "audit.assignment.changed"
  | "lead.scored"
  | "catalog.generated"
  | "ai.run"
  | "job.completed"
  | "job.failed"
  | "questmaster.dryrun.completed"
  | "sprint.plan.generated"
  | "sprint.plan.approved"
  | "template.saved"
  | "template.spawned"
  | "member.created";

/**
 * Event payload is a generic object
 */
export type EventPayload = Record<string, unknown>;

/**
 * Event envelope schema with zod validation
 */
export const EventEnvelopeSchema = z.object({
  id: z.string(),
  orgId: z.string().optional(),
  type: z.enum([
    "org.created",
    "quest.goal.created",
    "quest.goal.clarified",
    "quest.goal.approved",
    "quest.goal.denied",
    "quest.goal.decomposed",
    "task.created",
    "task.completed",
    "task.approved",
    "task.updated",
    "task.assigned",
    "quest.unlocked",
    "quest.updated",
    "quest.checkpoint.passed",
    "quest.deck.generated",
    "task.stale",
    "task.blocked",
    "audit.task.changed",
    "audit.quest.changed",
    "audit.goal.changed",
    "audit.assignment.changed",
    "lead.scored",
    "catalog.generated",
    "ai.run",
    "job.completed",
    "job.failed",
    "questmaster.dryrun.completed",
    "sprint.plan.generated",
    "sprint.plan.approved",
    "template.saved",
    "template.spawned",
    "member.created",
  ]),
  payload: z.record(z.unknown()),
  createdAt: z.string(),
  sourceApp: z.string(),
  correlationId: z.string().optional(),
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;

/**
 * Event handler function type
 */
export type EventHandler = (event: EventEnvelope) => void | Promise<void>;

/**
 * In-memory event subscriptions
 */
const subscriptions: Map<EventType, Set<EventHandler>> = new Map();

/**
 * Event log directory
 */
const EVENTS_DIR = path.join(process.cwd(), ".sb", "events");
const EVENTS_FILE = path.join(EVENTS_DIR, "events.jsonl");

/**
 * Ensure events directory exists
 */
function ensureEventsDir(): void {
  if (!fs.existsSync(EVENTS_DIR)) {
    fs.mkdirSync(EVENTS_DIR, { recursive: true });
  }
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt-${Date.now()}-${Math.random().toString(36).substring(7)}`;
}

/**
 * Publish an event
 */
export async function publish(
  type: EventType,
  payload: EventPayload,
  options: {
    orgId?: string;
    sourceApp: string;
    correlationId?: string;
  }
): Promise<void> {
  // Create event envelope
  const envelope: EventEnvelope = {
    id: generateEventId(),
    orgId: options.orgId,
    type,
    payload,
    createdAt: new Date().toISOString(),
    sourceApp: options.sourceApp,
    correlationId: options.correlationId,
  };

  // Validate with zod
  const validated = EventEnvelopeSchema.parse(envelope);

  // Write to file log
  ensureEventsDir();
  const line = JSON.stringify(validated) + "\n";
  fs.appendFileSync(EVENTS_FILE, line, "utf-8");

  // Notify subscribers
  const handlers = subscriptions.get(type);
  if (handlers) {
    for (const handler of handlers) {
      try {
        await handler(validated);
      } catch (error) {
        console.error(`Error in event handler for ${type}:`, error);
      }
    }
  }

  // Also notify wildcard subscribers (all events)
  const allHandlers = subscriptions.get("*" as EventType);
  if (allHandlers) {
    for (const handler of allHandlers) {
      try {
        await handler(validated);
      } catch (error) {
        console.error(`Error in wildcard event handler:`, error);
      }
    }
  }
}

/**
 * Subscribe to events of a specific type
 */
export function subscribe(type: EventType, handler: EventHandler): () => void {
  if (!subscriptions.has(type)) {
    subscriptions.set(type, new Set());
  }
  subscriptions.get(type)!.add(handler);

  // Return unsubscribe function
  return () => {
    const handlers = subscriptions.get(type);
    if (handlers) {
      handlers.delete(handler);
    }
  };
}

/**
 * Get all events from the log file (for debugging/querying)
 */
export function readEvents(limit?: number): EventEnvelope[] {
  if (!fs.existsSync(EVENTS_FILE)) {
    return [];
  }

  const content = fs.readFileSync(EVENTS_FILE, "utf-8");
  const lines = content.trim().split("\n").filter((line) => line.trim());
  const events = lines
    .map((line) => {
      try {
        return EventEnvelopeSchema.parse(JSON.parse(line));
      } catch {
        return null;
      }
    })
    .filter((event): event is EventEnvelope => event !== null);

  return limit ? events.slice(-limit) : events;
}

/**
 * Query events by entity ID and type
 */
export function queryEventsByEntity(
  entityId: string,
  entityType?: "task" | "quest" | "goal",
  limit?: number
): EventEnvelope[] {
  const allEvents = readEvents();
  return allEvents
    .filter((event) => {
      // Check if event payload contains the entity ID
      const payload = event.payload as Record<string, unknown>;
      const hasEntityId =
        payload.taskId === entityId ||
        payload.questId === entityId ||
        payload.goalId === entityId ||
        payload.id === entityId;
      
      // Filter by entity type if specified
      if (entityType) {
        const typeMatch =
          (entityType === "task" && event.type.includes("task")) ||
          (entityType === "quest" && event.type.includes("quest")) ||
          (entityType === "goal" && event.type.includes("goal"));
        return hasEntityId && typeMatch;
      }
      
      return hasEntityId;
    })
    .slice(0, limit || 100)
    .reverse(); // Most recent first
}

