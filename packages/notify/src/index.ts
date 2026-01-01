/**
 * @sb/notify
 * Notification layer for Slack and email
 */

import { getEnv } from "@sb/config";
import { logger } from "@sb/logger";

const SLACK_ENABLED = getEnv("NOTIFY_SLACK_ENABLED") === "true";
const SLACK_WEBHOOK_URL = getEnv("SLACK_WEBHOOK_URL");
const SLACK_BOT_TOKEN = getEnv("SLACK_BOT_TOKEN");

/**
 * Send a message to a Slack channel
 */
export async function sendSlackMessage(
  channel: string,
  text: string,
  options?: {
    username?: string;
    iconEmoji?: string;
  }
): Promise<boolean> {
  if (!SLACK_ENABLED) {
    logger.info("Slack notifications disabled, skipping message");
    return false;
  }

  if (!SLACK_WEBHOOK_URL && !SLACK_BOT_TOKEN) {
    logger.warn("Slack webhook URL or bot token not configured");
    return false;
  }

  try {
    // Use webhook if available (simpler)
    if (SLACK_WEBHOOK_URL) {
      const response = await fetch(SLACK_WEBHOOK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: channel.startsWith("#") ? channel : `#${channel}`,
          text,
          username: options?.username || "Questmaster",
          icon_emoji: options?.iconEmoji || ":robot_face:",
        }),
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.statusText}`);
      }

      logger.info(`Slack message sent to ${channel}`);
      return true;
    }

    // Use bot token if available (more flexible)
    if (SLACK_BOT_TOKEN) {
      const response = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          channel: channel.startsWith("#") ? channel.slice(1) : channel,
          text,
          username: options?.username || "Questmaster",
          icon_emoji: options?.iconEmoji || ":robot_face:",
        }),
      });

      const data = await response.json() as { ok: boolean; error?: string };
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error || 'Unknown error'}`);
      }

      logger.info(`Slack message sent to ${channel}`);
      return true;
    }

    return false;
  } catch (error) {
    logger.error("Failed to send Slack message", {
      error: error instanceof Error ? error.message : String(error),
      channel,
    });
    return false;
  }
}

/**
 * Check if Slack notifications are enabled
 */
export function isSlackEnabled(): boolean {
  return SLACK_ENABLED && (!!SLACK_WEBHOOK_URL || !!SLACK_BOT_TOKEN);
}

// Export email service
export {
  sendEmail,
  sendBulkEmails,
  getEmailQueueStatus,
  isEmailConfigured,
  type EmailMessage,
  type EmailResult,
} from "./email";

