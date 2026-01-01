/**
 * @sb/notify
 * Notification layer for Slack and email
 */

import { getEnv } from "@sb/config";
import { logger } from "@sb/logger";

const SLACK_ENABLED = getEnv("NOTIFY_SLACK_ENABLED") === "true";
const EMAIL_ENABLED = getEnv("NOTIFY_EMAIL_ENABLED") === "true";
const DISCORD_ENABLED = getEnv("NOTIFY_DISCORD_ENABLED") === "true";
const SLACK_WEBHOOK_URL = getEnv("SLACK_WEBHOOK_URL");
const SLACK_BOT_TOKEN = getEnv("SLACK_BOT_TOKEN");
const DISCORD_WEBHOOK_URL = getEnv("DISCORD_WEBHOOK_URL");

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

/**
 * Send a message to a Discord channel via webhook
 */
export async function sendDiscordMessage(
  text: string,
  options?: {
    username?: string;
    avatarUrl?: string;
    color?: number; // Decimal color code (e.g., 16711680 for red)
    title?: string;
  }
): Promise<boolean> {
  if (!DISCORD_ENABLED) {
    logger.info("Discord notifications disabled, skipping message");
    return false;
  }

  if (!DISCORD_WEBHOOK_URL) {
    logger.warn("Discord webhook URL not configured");
    return false;
  }

  try {
    const payload: {
      content?: string;
      username?: string;
      avatar_url?: string;
      embeds?: Array<{
        title?: string;
        description: string;
        color?: number;
        timestamp: string;
      }>;
    } = {
      username: options?.username || "Worker Bot",
      avatar_url: options?.avatarUrl,
    };

    // Use embeds for rich formatting if title or color provided
    if (options?.title || options?.color) {
      payload.embeds = [
        {
          title: options?.title,
          description: text,
          color: options?.color,
          timestamp: new Date().toISOString(),
        },
      ];
    } else {
      // Simple text message
      payload.content = text;
    }

    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook failed: ${response.statusText}`);
    }

    logger.info("Discord message sent successfully");
    return true;
  } catch (error) {
    logger.error("Failed to send Discord message", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Check if Discord notifications are enabled
 */
export function isDiscordEnabled(): boolean {
  return DISCORD_ENABLED && !!DISCORD_WEBHOOK_URL;
}

