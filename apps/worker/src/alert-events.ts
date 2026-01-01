/**
 * Event handlers for alerting
 * Listens to job and queue events and triggers alerts
 */

import { subscribe } from "@sb/events";
import { logger } from "@sb/logger";
import { getAlertManager } from "./alert-manager";

/**
 * Subscribe to events and trigger alerts
 */
export function setupAlertEventHandlers(): void {
  const alertManager = getAlertManager();

  // Listen for dead letter queue events
  subscribe("queue.dead-letter", async (event) => {
    try {
      await alertManager.onQueueEvent({
        type: "dlq",
        queuedJobId: event.data.queuedJobId,
        jobId: event.data.jobId,
      });
    } catch (error) {
      logger.error("Failed to process DLQ alert", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Listen for job failures
  subscribe("job.failed", async (event) => {
    try {
      await alertManager.onQueueEvent({
        type: "failed",
        queuedJobId: event.data.queuedJobId || event.data.executionId,
        jobId: event.data.jobId,
        error: event.data.error,
      });
    } catch (error) {
      logger.error("Failed to process job failure alert", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // Listen for queue failures
  subscribe("queue.failed", async (event) => {
    try {
      await alertManager.onQueueEvent({
        type: "failed",
        queuedJobId: event.data.queuedJobId,
        jobId: event.data.jobId,
        error: event.data.error,
      });
    } catch (error) {
      logger.error("Failed to process queue failure alert", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  });

  logger.info("Alert event handlers registered");
}
