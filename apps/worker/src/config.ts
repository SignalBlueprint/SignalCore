/**
 * Configuration loader for scheduler
 */

import fs from "fs";
import path from "path";
import yaml from "js-yaml";
import type { SchedulerConfig } from "@sb/jobs";
import { logger } from "@sb/logger";

/**
 * Load scheduler configuration from YAML file
 */
export function loadSchedulerConfig(configPath?: string): SchedulerConfig {
  // Default to scheduler.yaml in the worker directory
  const defaultPath = path.join(__dirname, "..", "scheduler.yaml");
  const filePath = configPath || defaultPath;

  logger.info(`Loading scheduler config from: ${filePath}`);

  try {
    const fileContents = fs.readFileSync(filePath, "utf8");
    const config = yaml.load(fileContents) as SchedulerConfig;

    if (!config || !config.schedules) {
      throw new Error("Invalid scheduler config: missing schedules");
    }

    logger.info(`Loaded ${config.schedules.length} schedule(s) from config`);
    return config;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      logger.error(`Scheduler config file not found: ${filePath}`);
      throw new Error(`Scheduler config file not found: ${filePath}`);
    }
    logger.error("Failed to load scheduler config", {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Validate scheduler configuration
 */
export function validateSchedulerConfig(config: SchedulerConfig): string[] {
  const errors: string[] = [];

  if (!config.schedules || !Array.isArray(config.schedules)) {
    errors.push("Config must have a 'schedules' array");
    return errors;
  }

  for (const [index, schedule] of config.schedules.entries()) {
    if (!schedule.jobId) {
      errors.push(`Schedule ${index}: missing jobId`);
    }
    if (!schedule.schedule) {
      errors.push(`Schedule ${index}: missing schedule (cron expression)`);
    }
    if (schedule.enabled === undefined) {
      errors.push(`Schedule ${index}: missing enabled flag`);
    }
  }

  return errors;
}
