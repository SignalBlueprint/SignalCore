/**
 * Alert Manager - Centralized alerting for worker app
 * Monitors job executions, queue health, and performance
 */

import { logger } from "@sb/logger";
import { storage } from "@sb/storage";
import { sendSlackMessage, sendEmail, sendDiscordMessage, isSlackEnabled, isEmailEnabled, isDiscordEnabled } from "@sb/notify";
import type {
  AlertConfig,
  AlertEvent,
  AlertThrottle,
  AlertChannel,
  AlertSeverity,
  JobExecution,
  QueueStats,
  DeadLetterJob,
} from "@sb/schemas";
import { getJobStats, getAllJobExecutions } from "./executions";
import { readFileSync } from "fs";
import { join } from "path";
import * as yaml from "js-yaml";

const ALERT_THROTTLE_KIND = "alert-throttles";
const ALERT_EVENTS_KIND = "alert-events";

/**
 * Alert Manager class
 */
export class AlertManager {
  private config: AlertConfig;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(configPath?: string) {
    const path = configPath || join(__dirname, "../alerts.yaml");
    this.config = this.loadConfig(path);
  }

  /**
   * Load alert configuration from YAML file
   */
  private loadConfig(path: string): AlertConfig {
    try {
      const content = readFileSync(path, "utf8");
      const config = yaml.parse(content) as AlertConfig;

      // Validate config
      if (!config.settings) {
        throw new Error("Alert config missing 'settings' section");
      }

      logger.info("Loaded alert configuration", {
        path,
        enabled: config.settings.enabled,
        channels: config.settings.channels,
      });

      return config;
    } catch (error) {
      logger.error("Failed to load alert configuration", {
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      // Return disabled config as fallback
      return {
        settings: {
          enabled: false,
          channels: [],
        },
      };
    }
  }

  /**
   * Start monitoring and alerting
   */
  async start(): Promise<void> {
    if (!this.config.settings.enabled) {
      logger.info("Alerting is disabled in configuration");
      return;
    }

    if (this.monitoringInterval) {
      logger.warn("Alert manager already started");
      return;
    }

    logger.info("Starting alert manager", {
      channels: this.config.settings.channels,
    });

    // Start periodic health checks (every 60 seconds)
    this.monitoringInterval = setInterval(() => {
      this.checkQueueHealth().catch((error) => {
        logger.error("Error checking queue health", { error });
      });
    }, 60000);

    // Initial health check
    await this.checkQueueHealth();
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    logger.info("Stopped alert manager");
  }

  /**
   * Handle job execution completion (success or failure)
   */
  async onJobExecutionComplete(execution: JobExecution): Promise<void> {
    if (!this.config.settings.enabled) {
      return;
    }

    if (execution.status === "failed") {
      await this.checkJobFailureAlerts(execution);
    }

    // Check performance degradation
    await this.checkPerformanceAlerts(execution);
  }

  /**
   * Handle queue events
   */
  async onQueueEvent(event: {
    type: "enqueued" | "completed" | "failed" | "retry" | "dlq";
    queuedJobId: string;
    jobId: string;
    error?: string;
  }): Promise<void> {
    if (!this.config.settings.enabled) {
      return;
    }

    // Alert on dead letter queue entry
    if (event.type === "dlq") {
      await this.checkDLQAlerts();
    }
  }

  /**
   * Check for job failure alerts
   */
  private async checkJobFailureAlerts(execution: JobExecution): Promise<void> {
    const rules = this.config.jobFailures || [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const conditions = rule.conditions as any;

      // Check job pattern match
      if (conditions.jobPattern) {
        const pattern = new RegExp(conditions.jobPattern);
        if (!pattern.test(execution.jobId)) {
          continue;
        }
      }

      // Check consecutive failures
      if (conditions.consecutiveFailures) {
        const isConsecutive = await this.checkConsecutiveFailures(
          execution.jobId,
          conditions.consecutiveFailures,
          execution.orgId
        );
        if (isConsecutive) {
          await this.sendAlert({
            alertName: rule.name,
            severity: rule.severity,
            title: `Job Failed ${conditions.consecutiveFailures} Times Consecutively`,
            message: `Job \`${execution.jobName}\` (${execution.jobId}) has failed ${conditions.consecutiveFailures} times in a row.\n\nLast error: ${execution.error || "Unknown error"}`,
            channels: rule.channels,
            jobId: execution.jobId,
            metadata: {
              executionId: execution.id,
              consecutiveFailures: conditions.consecutiveFailures,
              error: execution.error,
            },
          });
        }
      }

      // Check single failure count (immediate alert)
      if (conditions.failureCount === 1) {
        await this.sendAlert({
          alertName: rule.name,
          severity: rule.severity,
          title: `Critical Job Failed`,
          message: `Critical job \`${execution.jobName}\` (${execution.jobId}) has failed.\n\nError: ${execution.error || "Unknown error"}`,
          channels: rule.channels,
          jobId: execution.jobId,
          metadata: {
            executionId: execution.id,
            error: execution.error,
          },
        });
      }

      // Check failure reason (e.g., timeout)
      if (conditions.failureReason) {
        if (execution.error?.toLowerCase().includes(conditions.failureReason.toLowerCase())) {
          await this.sendAlert({
            alertName: rule.name,
            severity: rule.severity,
            title: `Job ${conditions.failureReason.toUpperCase()}`,
            message: `Job \`${execution.jobName}\` (${execution.jobId}) failed due to ${conditions.failureReason}.\n\nError: ${execution.error}`,
            channels: rule.channels,
            jobId: execution.jobId,
            metadata: {
              executionId: execution.id,
              failureReason: conditions.failureReason,
              error: execution.error,
            },
          });
        }
      }
    }
  }

  /**
   * Check for consecutive failures
   */
  private async checkConsecutiveFailures(
    jobId: string,
    threshold: number,
    orgId?: string
  ): Promise<boolean> {
    const executions = await getAllJobExecutions({
      limit: threshold,
      orgId,
    });

    const jobExecutions = executions.filter((e) => e.jobId === jobId);

    if (jobExecutions.length < threshold) {
      return false;
    }

    // Check if all recent executions are failures
    const recentExecutions = jobExecutions.slice(0, threshold);
    return recentExecutions.every((e) => e.status === "failed");
  }

  /**
   * Check queue health alerts
   */
  private async checkQueueHealth(): Promise<void> {
    const rules = this.config.queueHealth || [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const conditions = rule.conditions as any;

      // Check DLQ size
      if (conditions.dlqSize !== undefined) {
        const dlqJobs = await storage.list<DeadLetterJob>("dead-letter-jobs");
        if (dlqJobs.data.length >= conditions.dlqSize) {
          await this.sendAlert({
            alertName: rule.name,
            severity: rule.severity,
            title: `Dead Letter Queue Alert`,
            message: `${dlqJobs.data.length} job(s) are in the dead letter queue.\n\nThese jobs have permanently failed and require manual investigation.`,
            channels: rule.channels,
            metadata: {
              dlqSize: dlqJobs.data.length,
              jobs: dlqJobs.data.map((j) => ({
                id: j.id,
                jobName: j.jobName,
                failureReason: j.failureReason,
              })),
            },
          });
        }
      }

      // Check pending jobs backlog
      if (conditions.pendingJobs !== undefined) {
        const queuedJobs = await storage.list<any>("queued-jobs");
        const pendingCount = queuedJobs.data.filter(
          (j: any) => j.status === "pending" || j.status === "ready"
        ).length;

        if (pendingCount >= conditions.pendingJobs) {
          await this.sendAlert({
            alertName: rule.name,
            severity: rule.severity,
            title: `Queue Backlog Alert`,
            message: `${pendingCount} jobs are pending in the queue.\n\nThe queue may be overloaded or processing slowly.`,
            channels: rule.channels,
            metadata: {
              pendingJobs: pendingCount,
            },
          });
        }
      }

      // Check delayed jobs
      if (conditions.delayedJobs !== undefined) {
        const queuedJobs = await storage.list<any>("queued-jobs");
        const delayedCount = queuedJobs.data.filter((j: any) => j.status === "delayed").length;

        if (delayedCount >= conditions.delayedJobs) {
          await this.sendAlert({
            alertName: rule.name,
            severity: rule.severity,
            title: `Delayed Jobs Alert`,
            message: `${delayedCount} jobs are delayed/retrying.\n\nMultiple jobs may be experiencing failures.`,
            channels: rule.channels,
            metadata: {
              delayedJobs: delayedCount,
            },
          });
        }
      }

      // Check queue mode (paused/draining)
      if (conditions.mode) {
        const queueConfig = await storage.get<any>("queue-config", "default");
        if (queueConfig?.mode === conditions.mode) {
          await this.sendAlert({
            alertName: rule.name,
            severity: rule.severity,
            title: `Queue ${conditions.mode.toUpperCase()}`,
            message: `The job queue is currently in ${conditions.mode} mode.\n\nNo new jobs will be processed until the queue is resumed.`,
            channels: rule.channels,
            metadata: {
              mode: queueConfig.mode,
            },
          });
        }
      }
    }
  }

  /**
   * Check DLQ-specific alerts
   */
  private async checkDLQAlerts(): Promise<void> {
    const rules = this.config.queueHealth || [];

    for (const rule of rules) {
      if (!rule.enabled || rule.name !== "dlq-jobs") continue;

      const dlqJobs = await storage.list<DeadLetterJob>("dead-letter-jobs");

      // Get the most recent DLQ job
      const recentDLQ = dlqJobs.data.sort(
        (a, b) => new Date(b.movedToDLQAt).getTime() - new Date(a.movedToDLQAt).getTime()
      )[0];

      if (recentDLQ) {
        await this.sendAlert({
          alertName: rule.name,
          severity: rule.severity,
          title: `Job Moved to Dead Letter Queue`,
          message: `Job \`${recentDLQ.jobName}\` (${recentDLQ.jobId}) has been moved to the dead letter queue after ${recentDLQ.attempts} failed attempts.\n\nReason: ${recentDLQ.failureReason}\nError: ${recentDLQ.error || "Unknown"}`,
          channels: rule.channels,
          metadata: {
            dlqJobId: recentDLQ.id,
            originalJobId: recentDLQ.originalJobId,
            attempts: recentDLQ.attempts,
            failureReason: recentDLQ.failureReason,
          },
        });
      }
    }
  }

  /**
   * Check performance degradation alerts
   */
  private async checkPerformanceAlerts(execution: JobExecution): Promise<void> {
    const rules = this.config.performance || [];

    for (const rule of rules) {
      if (!rule.enabled) continue;

      const conditions = rule.conditions as any;

      // Check job pattern match
      if (conditions.jobPattern) {
        const pattern = new RegExp(conditions.jobPattern);
        if (!pattern.test(execution.jobId)) {
          continue;
        }
      }

      // Check success rate degradation
      if (conditions.successRate !== undefined) {
        const stats = await getJobStats(execution.jobId, execution.orgId);

        if (stats.totalRuns >= conditions.minRuns) {
          const successRate = stats.successCount / stats.totalRuns;

          if (successRate < conditions.successRate) {
            await this.sendAlert({
              alertName: rule.name,
              severity: rule.severity,
              title: `Low Success Rate Alert`,
              message: `Job \`${execution.jobName}\` (${execution.jobId}) has a success rate of ${(successRate * 100).toFixed(1)}%, below the ${(conditions.successRate * 100).toFixed(0)}% threshold.\n\nTotal runs: ${stats.totalRuns}\nSuccesses: ${stats.successCount}\nFailures: ${stats.failureCount}`,
              channels: rule.channels,
              jobId: execution.jobId,
              metadata: {
                successRate,
                threshold: conditions.successRate,
                stats,
              },
            });
          }
        }
      }

      // Check duration increase
      if (conditions.durationIncrease !== undefined && execution.duration) {
        const stats = await getJobStats(execution.jobId, execution.orgId);

        if (stats.totalRuns >= conditions.minRuns && stats.averageDuration > 0) {
          const durationRatio = execution.duration / stats.averageDuration;

          if (durationRatio >= conditions.durationIncrease) {
            await this.sendAlert({
              alertName: rule.name,
              severity: rule.severity,
              title: `Job Duration Spike`,
              message: `Job \`${execution.jobName}\` (${execution.jobId}) took ${(execution.duration / 1000).toFixed(1)}s, which is ${durationRatio.toFixed(1)}x the average duration.\n\nCurrent: ${(execution.duration / 1000).toFixed(1)}s\nAverage: ${(stats.averageDuration / 1000).toFixed(1)}s`,
              channels: rule.channels,
              jobId: execution.jobId,
              metadata: {
                duration: execution.duration,
                averageDuration: stats.averageDuration,
                durationRatio,
              },
            });
          }
        }
      }
    }
  }

  /**
   * Send an alert through configured channels
   */
  private async sendAlert(params: {
    alertName: string;
    severity: AlertSeverity;
    title: string;
    message: string;
    channels: AlertChannel[];
    jobId?: string;
    queuedJobId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    // Check throttling
    const shouldThrottle = await this.shouldThrottleAlert(params.alertName, params.jobId);
    if (shouldThrottle) {
      logger.debug("Alert throttled", {
        alertName: params.alertName,
        jobId: params.jobId,
      });
      return;
    }

    // Create alert event
    const alertEvent: AlertEvent = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      alertName: params.alertName,
      severity: params.severity,
      title: params.title,
      message: params.message,
      channels: params.channels,
      metadata: params.metadata,
      triggeredAt: new Date().toISOString(),
      jobId: params.jobId,
      queuedJobId: params.queuedJobId,
    };

    // Store alert event
    await storage.upsert(ALERT_EVENTS_KIND, alertEvent);

    // Send to each channel
    for (const channel of params.channels) {
      try {
        await this.sendToChannel(channel, alertEvent);
      } catch (error) {
        logger.error("Failed to send alert", {
          channel,
          alertName: params.alertName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update throttle
    await this.updateAlertThrottle(params.alertName, params.jobId);

    logger.info("Alert sent", {
      alertName: params.alertName,
      severity: params.severity,
      channels: params.channels,
    });
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(channel: AlertChannel, alert: AlertEvent): Promise<void> {
    const severityEmoji = {
      critical: "🚨",
      high: "⚠️",
      medium: "⚡",
      low: "ℹ️",
    };

    const emoji = severityEmoji[alert.severity];

    switch (channel) {
      case "slack": {
        if (!isSlackEnabled()) {
          logger.warn("Slack notifications disabled, skipping alert");
          return;
        }

        const slackChannel = this.config.settings.slack?.channel || "#worker-alerts";
        const username = this.config.settings.slack?.username || "Worker Bot";
        const iconEmoji = this.config.settings.slack?.iconEmoji || ":gear:";

        const message = `${emoji} *${alert.title}* [${alert.severity.toUpperCase()}]\n\n${alert.message}`;

        await sendSlackMessage(slackChannel, message, {
          username,
          iconEmoji,
        });
        break;
      }

      case "email": {
        if (!isEmailEnabled()) {
          logger.warn("Email notifications disabled, skipping alert");
          return;
        }

        const to = this.config.settings.email?.to || "team@example.com";
        const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
        const body = `${alert.message}\n\nTriggered at: ${alert.triggeredAt}`;

        await sendEmail(to, subject, body);
        break;
      }

      case "discord": {
        if (!isDiscordEnabled()) {
          logger.warn("Discord notifications disabled, skipping alert");
          return;
        }

        const username = this.config.settings.discord?.username || "Worker Bot";
        const avatarUrl = this.config.settings.discord?.avatarUrl;

        // Map severity to Discord embed colors (decimal format)
        const severityColors = {
          critical: 16711680,  // Red (#FF0000)
          high: 16744448,      // Orange (#FFA500)
          medium: 16776960,    // Yellow (#FFFF00)
          low: 3447003,        // Blue (#3498DB)
        };

        const color = severityColors[alert.severity];
        const title = `${emoji} ${alert.title} [${alert.severity.toUpperCase()}]`;

        await sendDiscordMessage(alert.message, {
          username,
          avatarUrl,
          color,
          title,
        });
        break;
      }

      default:
        logger.warn(`Unsupported alert channel: ${channel}`);
    }
  }

  /**
   * Check if alert should be throttled
   */
  private async shouldThrottleAlert(alertName: string, jobId?: string): Promise<boolean> {
    const throttleConfig = this.config.settings.throttle;
    if (!throttleConfig) {
      return false;
    }

    const alertKey = jobId ? `${alertName}:${jobId}` : alertName;
    const throttle = await storage.get<AlertThrottle>(ALERT_THROTTLE_KIND, alertKey);

    if (!throttle) {
      return false;
    }

    const now = Date.now();
    const lastSent = new Date(throttle.lastSentAt).getTime();
    const timeSinceLastAlert = (now - lastSent) / 1000; // Convert to seconds

    // Check minimum interval
    if (timeSinceLastAlert < throttleConfig.minInterval) {
      return true;
    }

    // Check max alerts per hour
    const windowStart = new Date(throttle.windowStart).getTime();
    const hourSinceWindowStart = (now - windowStart) / (1000 * 60 * 60);

    if (hourSinceWindowStart < 1 && throttle.count >= throttleConfig.maxAlertsPerJobPerHour) {
      return true;
    }

    return false;
  }

  /**
   * Update alert throttle state
   */
  private async updateAlertThrottle(alertName: string, jobId?: string): Promise<void> {
    const throttleConfig = this.config.settings.throttle;
    if (!throttleConfig) {
      return;
    }

    const alertKey = jobId ? `${alertName}:${jobId}` : alertName;
    const now = new Date().toISOString();
    const existing = await storage.get<AlertThrottle>(ALERT_THROTTLE_KIND, alertKey);

    if (!existing) {
      // Create new throttle record
      const throttle: AlertThrottle = {
        alertKey,
        lastSentAt: now,
        count: 1,
        windowStart: now,
      };
      await storage.upsert(ALERT_THROTTLE_KIND, throttle);
      return;
    }

    // Check if we need to reset the window (1 hour)
    const windowStart = new Date(existing.windowStart).getTime();
    const hoursSinceWindowStart = (Date.now() - windowStart) / (1000 * 60 * 60);

    if (hoursSinceWindowStart >= 1) {
      // Reset window
      const throttle: AlertThrottle = {
        alertKey,
        lastSentAt: now,
        count: 1,
        windowStart: now,
      };
      await storage.upsert(ALERT_THROTTLE_KIND, throttle);
    } else {
      // Increment count
      const throttle: AlertThrottle = {
        ...existing,
        lastSentAt: now,
        count: existing.count + 1,
      };
      await storage.upsert(ALERT_THROTTLE_KIND, throttle);
    }
  }

  /**
   * Get alert configuration
   */
  getConfig(): AlertConfig {
    return this.config;
  }

  /**
   * Reload configuration from file
   */
  reloadConfig(configPath?: string): void {
    const path = configPath || join(__dirname, "../alerts.yaml");
    this.config = this.loadConfig(path);
  }
}

/**
 * Singleton instance
 */
let alertManager: AlertManager | null = null;

/**
 * Get or create alert manager instance
 */
export function getAlertManager(configPath?: string): AlertManager {
  if (!alertManager) {
    alertManager = new AlertManager(configPath);
  }
  return alertManager;
}

/**
 * Initialize and start alert manager
 */
export async function startAlertManager(configPath?: string): Promise<AlertManager> {
  const manager = getAlertManager(configPath);
  await manager.start();
  return manager;
}

/**
 * Stop alert manager
 */
export async function stopAlertManager(): Promise<void> {
  if (alertManager) {
    await alertManager.stop();
  }
}
