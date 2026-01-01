/**
 * Worker App Alert schemas
 */

/**
 * Alert severity levels
 */
export type AlertSeverity = "critical" | "high" | "medium" | "low";

/**
 * Alert notification channels
 */
export type AlertChannel = "slack" | "email" | "discord";

/**
 * Alert throttling state
 */
export interface AlertThrottle {
  alertKey: string;              // Unique identifier for the alert
  lastSentAt: string;            // ISO timestamp of last alert
  count: number;                 // Number of times alert was sent in current window
  windowStart: string;           // Start of current throttle window
}

/**
 * Alert configuration settings
 */
export interface AlertSettings {
  enabled: boolean;
  channels: AlertChannel[];
  slack?: {
    channel: string;
    username?: string;
    iconEmoji?: string;
  };
  email?: {
    to: string;
    from: string;
  };
  discord?: {
    username?: string;
    avatarUrl?: string;
  };
  throttle?: {
    minInterval: number;         // Minimum seconds between identical alerts
    maxAlertsPerJobPerHour: number;
  };
}

/**
 * Job failure alert conditions
 */
export interface JobFailureAlertConditions {
  consecutiveFailures?: number;  // Alert after N consecutive failures
  jobPattern?: string;           // Regex pattern to match job IDs
  failureCount?: number;         // Alert after N total failures
  failureReason?: string;        // Alert on specific failure reason (timeout, error, etc.)
}

/**
 * Queue health alert conditions
 */
export interface QueueHealthAlertConditions {
  dlqSize?: number;              // Alert when DLQ has N or more jobs
  pendingJobs?: number;          // Alert when pending queue has N or more jobs
  delayedJobs?: number;          // Alert when delayed jobs exceed N
  mode?: "paused" | "draining";  // Alert on specific queue mode
}

/**
 * Performance alert conditions
 */
export interface PerformanceAlertConditions {
  jobPattern: string;            // Regex pattern to match job IDs
  successRate?: number;          // Alert when success rate drops below threshold (0-1)
  durationIncrease?: number;     // Alert when duration increases by factor (e.g., 2.0 = 200%)
  concurrencyUtilization?: number; // Alert when concurrency utilization exceeds threshold (0-1)
  timeWindow: number;            // Time window in seconds for calculating metrics
  minRuns: number;               // Minimum job runs required before alerting
  duration?: number;             // Duration condition must be met (seconds)
}

/**
 * Dependency failure alert conditions
 */
export interface DependencyAlertConditions {
  hasDependencies: boolean;      // Only alert on jobs with dependencies
  failureReason?: string;        // Specific failure reason
}

/**
 * Generic alert rule
 */
export interface AlertRule {
  name: string;
  description: string;
  enabled: boolean;
  severity: AlertSeverity;
  channels: AlertChannel[];
  conditions:
    | JobFailureAlertConditions
    | QueueHealthAlertConditions
    | PerformanceAlertConditions
    | DependencyAlertConditions;
}

/**
 * Alert configuration (parsed from alerts.yaml)
 */
export interface AlertConfig {
  settings: AlertSettings;
  jobFailures?: AlertRule[];
  queueHealth?: AlertRule[];
  performance?: AlertRule[];
  dependencies?: AlertRule[];
}

/**
 * Alert event - represents an alert that should be sent
 */
export interface AlertEvent {
  id: string;                    // Unique alert event ID
  alertName: string;             // Name of the alert rule that triggered
  severity: AlertSeverity;
  title: string;                 // Alert title
  message: string;               // Detailed alert message
  channels: AlertChannel[];
  metadata?: Record<string, unknown>; // Additional context
  triggeredAt: string;           // ISO timestamp
  jobId?: string;                // Related job ID (if applicable)
  queuedJobId?: string;          // Related queued job ID (if applicable)
}

/**
 * Alert delivery record
 */
export interface AlertDelivery {
  id: string;
  alertEventId: string;
  channel: AlertChannel;
  status: "pending" | "sent" | "failed";
  sentAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
