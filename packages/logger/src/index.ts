/**
 * @sb/logger
 * Structured logging utilities
 */

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  [key: string]: unknown;
}

function formatLogEntry(entry: LogEntry): string {
  const { level, message, timestamp, ...rest } = entry;
  const meta = Object.keys(rest).length > 0 ? ` ${JSON.stringify(rest)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${meta}`;
}

class Logger {
  info(message: string, meta?: Record<string, unknown>): void {
    this.log("info", message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log("warn", message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log("error", message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log("debug", message, meta);
  }

  private log(
    level: LogLevel,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    };

    const formatted = formatLogEntry(entry);

    switch (level) {
      case "error":
        console.error(formatted);
        break;
      case "warn":
        console.warn(formatted);
        break;
      case "debug":
        console.debug(formatted);
        break;
      default:
        console.log(formatted);
    }
  }
}

export const logger = new Logger();

