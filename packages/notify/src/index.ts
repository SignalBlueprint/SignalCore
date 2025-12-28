/**
 * @sb/notify
 * Notification layer for Slack and email
 */

import { getEnv } from "@sb/config";
import { logger } from "@sb/logger";

const SLACK_ENABLED = getEnv("NOTIFY_SLACK_ENABLED") === "true";
const EMAIL_ENABLED = getEnv("NOTIFY_EMAIL_ENABLED") === "true";
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

      const data = await response.json();
      if (!data.ok) {
        throw new Error(`Slack API error: ${data.error}`);
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
 * Send an email (stub implementation)
 */
export async function sendEmail(
  to: string,
  subject: string,
  text: string
): Promise<boolean> {
  if (!EMAIL_ENABLED) {
    logger.info("Email notifications disabled, skipping email");
    return false;
  }

  // Stub implementation - in production, integrate with SendGrid, SES, etc.
  logger.info(`[STUB] Would send email to ${to}: ${subject}`);
  logger.debug(`Email body: ${text}`);

  // TODO: Implement actual email sending
  // Example with SendGrid:
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  // await sgMail.send({ to, from: process.env.FROM_EMAIL, subject, text });

  return true;
}

/**
 * Check if Slack notifications are enabled
 */
export function isSlackEnabled(): boolean {
  return SLACK_ENABLED && (!!SLACK_WEBHOOK_URL || !!SLACK_BOT_TOKEN);
}

/**
 * Check if email notifications are enabled
 */
export function isEmailEnabled(): boolean {
  return EMAIL_ENABLED;
}

