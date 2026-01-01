/**
 * SendGrid webhook handler for email delivery events
 * Handles: delivered, bounce, open, click, dropped, deferred, etc.
 */

import { storage } from "@sb/storage";
import type { EmailSendHistory } from "@sb/schemas";
import { logger } from "@sb/logger";

export interface SendGridEvent {
  event: string;
  email: string;
  timestamp: number;
  sg_message_id?: string;
  campaignId?: string;
  leadId?: string;
  reason?: string;
  status?: string;
  response?: string;
  url?: string;
}

/**
 * Process SendGrid webhook events
 */
export async function handleSendGridWebhook(events: SendGridEvent[]): Promise<void> {
  logger.info(`Processing ${events.length} SendGrid webhook events`);

  for (const event of events) {
    try {
      await processEvent(event);
    } catch (error) {
      logger.error("Failed to process SendGrid event", {
        event: event.event,
        email: event.email,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
}

/**
 * Process a single SendGrid event
 */
async function processEvent(event: SendGridEvent): Promise<void> {
  const { campaignId, leadId, sg_message_id } = event;

  // Find the email send history entry
  let historyEntry: EmailSendHistory | null = null;

  if (campaignId && leadId) {
    // Try to find by campaign and lead ID (from custom args)
    const allHistory = await storage.list<EmailSendHistory>("email_send_history");
    historyEntry = allHistory.find(
      (h: EmailSendHistory) => h.campaignId === campaignId && h.leadId === leadId
    ) || null;
  } else if (sg_message_id) {
    // Try to find by SendGrid message ID
    const allHistory = await storage.list<EmailSendHistory>("email_send_history");
    historyEntry = allHistory.find((h: EmailSendHistory) => h.messageId === sg_message_id) || null;
  }

  if (!historyEntry) {
    logger.warn("No history entry found for SendGrid event", {
      event: event.event,
      email: event.email,
      campaignId,
      leadId,
      sg_message_id,
    });
    return;
  }

  // Update history based on event type
  const eventDate = new Date(event.timestamp * 1000).toISOString();

  switch (event.event) {
    case "delivered":
      historyEntry.status = "delivered";
      historyEntry.deliveredAt = eventDate;
      break;

    case "open":
      historyEntry.status = "opened";
      historyEntry.openedAt = eventDate;
      break;

    case "click":
      historyEntry.status = "clicked";
      historyEntry.clickedAt = eventDate;
      if (event.url) {
        logger.info("Email link clicked", {
          campaignId,
          leadId,
          url: event.url,
        });
      }
      break;

    case "bounce":
    case "dropped":
      historyEntry.status = "bounced";
      historyEntry.error = event.reason || event.response || "Email bounced";
      break;

    case "deferred":
      // Temporary failure, don't update status
      logger.info("Email delivery deferred", {
        campaignId,
        leadId,
        reason: event.reason,
      });
      return;

    case "spamreport":
      historyEntry.status = "bounced";
      historyEntry.error = "Marked as spam";
      logger.warn("Email marked as spam", {
        campaignId,
        leadId,
        email: event.email,
      });
      break;

    default:
      logger.debug(`Unhandled SendGrid event: ${event.event}`, {
        email: event.email,
      });
      return;
  }

  // Save updated history
  await storage.upsert("email_send_history", historyEntry);

  logger.info(`Updated email history from webhook`, {
    event: event.event,
    campaignId,
    leadId,
    status: historyEntry.status,
  });
}

/**
 * Verify SendGrid webhook signature (optional but recommended for production)
 * This prevents unauthorized webhook calls
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  // SendGrid webhook signature verification
  // Implementation would use crypto to verify ECDSA signature
  // For now, return true (skip verification in development)
  // TODO: Implement proper signature verification for production
  return true;
}
