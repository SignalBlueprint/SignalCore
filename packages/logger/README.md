# @sb/logger

Centralized logging system for the Signal Blueprint suite with structured logging and multiple output formats.

## Purpose

`@sb/logger` provides a consistent logging interface across all apps and packages with support for different log levels, structured data, and formatted output.

## Features

- **Multiple Log Levels** - info, warn, error, debug
- **Structured Logging** - Attach metadata to log entries
- **Pretty Output** - Colored console output for development
- **JSON Output** - Structured logs for production
- **Context Support** - Add context to all logs (app name, request ID, etc.)

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Basic Logging

```typescript
import { logger } from "@sb/logger";

logger.info("Server started on port 3000");
logger.warn("High memory usage detected");
logger.error("Failed to connect to database");
logger.debug("Request payload:", { body: req.body });
```

### Structured Logging

```typescript
logger.info("User created", {
  userId: "user_123",
  email: "user@example.com",
  timestamp: new Date().toISOString()
});
```

### Logger with Context

```typescript
import { createLogger } from "@sb/logger";

const logger = createLogger({ app: "catalog" });

logger.info("Product created", { productId: "prod_123" });
// [catalog] Product created { productId: 'prod_123' }
```

## API Reference

### `logger.info(message, meta?)`
Log informational message

### `logger.warn(message, meta?)`
Log warning

### `logger.error(message, meta?)`
Log error

### `logger.debug(message, meta?)`
Log debug information

### `createLogger(context): Logger`
Create logger with context

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Minimum log level | `info` |
| `LOG_FORMAT` | Output format (`pretty` or `json`) | `pretty` |

## Testing

```bash
pnpm --filter @sb/logger test
```

## Dependencies

None - uses console with formatting

## Used By

All apps and packages for logging

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
