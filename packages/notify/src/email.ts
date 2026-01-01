/**
 * Email service with SendGrid integration
 * Supports transactional emails, campaign emails, and delivery tracking
 */

import sgMail from "@sendgrid/mail";
import { getEnv } from "@sb/config";
import { logger } from "@sb/logger";

// Configuration
const SENDGRID_API_KEY = getEnv("SENDGRID_API_KEY");
const FROM_EMAIL = getEnv("FROM_EMAIL") || "noreply@signalblueprint.com";
const FROM_NAME = getEnv("FROM_NAME") || "Signal Blueprint";
const EMAIL_ENABLED = getEnv("NOTIFY_EMAIL_ENABLED") === "true";

// Rate limiting configuration
const RATE_LIMIT_PER_SECOND = parseInt(getEnv("EMAIL_RATE_LIMIT") || "10", 10);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// Initialize SendGrid
if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  logger.info("SendGrid email service initialized");
} else {
  logger.warn("SENDGRID_API_KEY not configured - email sending disabled");
}

/**
 * Email message interface
 */
export interface EmailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: {
    email: string;
    name?: string;
  };
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    content: string;
    filename: string;
    type?: string;
    disposition?: string;
  }>;
  customArgs?: Record<string, string>;
  categories?: string[];
}

/**
 * Email send result
 */
export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  statusCode?: number;
}

/**
 * Email queue item
 */
interface QueueItem {
  message: EmailMessage;
  resolve: (result: EmailResult) => void;
  reject: (error: Error) => void;
  retryCount: number;
}

/**
 * Email queue for rate limiting
 */
class EmailQueue {
  private queue: QueueItem[] = [];
  private processing = false;
  private lastSendTime = 0;

  /**
   * Add email to queue
   */
  async enqueue(message: EmailMessage): Promise<EmailResult> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        message,
        resolve,
        reject,
        retryCount: 0,
      });

      if (!this.processing) {
        this.process();
      }
    });
  }

  /**
   * Process queue with rate limiting
   */
  private async process() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) break;

      // Rate limiting: ensure minimum delay between sends
      const now = Date.now();
      const timeSinceLastSend = now - this.lastSendTime;
      const minDelay = 1000 / RATE_LIMIT_PER_SECOND;

      if (timeSinceLastSend < minDelay) {
        await this.sleep(minDelay - timeSinceLastSend);
      }

      try {
        const result = await this.sendEmail(item.message);
        this.lastSendTime = Date.now();
        item.resolve(result);
      } catch (error) {
        // Retry logic
        if (item.retryCount < MAX_RETRIES) {
          logger.warn(`Email send failed, retrying (${item.retryCount + 1}/${MAX_RETRIES})`, {
            to: item.message.to,
            error: error instanceof Error ? error.message : String(error),
          });

          item.retryCount++;
          await this.sleep(RETRY_DELAY_MS * item.retryCount);
          this.queue.unshift(item); // Add back to front of queue
        } else {
          logger.error("Email send failed after max retries", {
            to: item.message.to,
            error: error instanceof Error ? error.message : String(error),
          });

          item.resolve({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    }

    this.processing = false;
  }

  /**
   * Send email via SendGrid
   */
  private async sendEmail(message: EmailMessage): Promise<EmailResult> {
    if (!EMAIL_ENABLED) {
      logger.info("Email sending disabled, skipping", { to: message.to });
      return { success: false, error: "Email sending disabled" };
    }

    if (!SENDGRID_API_KEY) {
      logger.error("SendGrid API key not configured");
      return { success: false, error: "SendGrid API key not configured" };
    }

    try {
      const msg: any = {
        to: message.to,
        from: message.from || {
          email: FROM_EMAIL,
          name: FROM_NAME,
        },
        subject: message.subject,
        text: message.text,
        html: message.html,
        replyTo: message.replyTo,
        cc: message.cc,
        bcc: message.bcc,
        attachments: message.attachments,
        customArgs: message.customArgs,
        categories: message.categories,
      };

      const [response] = await sgMail.send(msg);

      logger.info("Email sent successfully", {
        to: message.to,
        subject: message.subject,
        messageId: response.headers["x-message-id"],
        statusCode: response.statusCode,
      });

      return {
        success: true,
        messageId: response.headers["x-message-id"] as string,
        statusCode: response.statusCode,
      };
    } catch (error: any) {
      logger.error("Failed to send email", {
        to: message.to,
        subject: message.subject,
        error: error.message,
        response: error.response?.body,
      });

      return {
        success: false,
        error: error.message,
        statusCode: error.code,
      };
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
    };
  }
}

// Global email queue instance
const emailQueue = new EmailQueue();

/**
 * Send an email (queued with rate limiting)
 */
export async function sendEmail(message: EmailMessage): Promise<EmailResult> {
  return emailQueue.enqueue(message);
}

/**
 * Send bulk emails (optimized for campaigns)
 */
export async function sendBulkEmails(
  messages: EmailMessage[],
  onProgress?: (sent: number, total: number) => void
): Promise<EmailResult[]> {
  const results: EmailResult[] = [];

  for (let i = 0; i < messages.length; i++) {
    const result = await sendEmail(messages[i]);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, messages.length);
    }
  }

  return results;
}

/**
 * Get email queue status
 */
export function getEmailQueueStatus() {
  return emailQueue.getStatus();
}

/**
 * Check if email is configured and enabled
 */
export function isEmailConfigured(): boolean {
  return !!SENDGRID_API_KEY && EMAIL_ENABLED;
}
