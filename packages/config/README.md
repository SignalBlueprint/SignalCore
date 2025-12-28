# @sb/config

Environment variable and runtime configuration management for the Signal Blueprint suite.

## How Environment Variables Work in This Monorepo

Each app in the monorepo manages its own environment variables independently. Use this package to access environment variables safely with type checking and validation.

### Usage

```typescript
import { getEnv, ENV } from "@sb/config";

// Get with default
const logLevel = getEnv("LOG_LEVEL", { default: "info" });

// Get required (throws if missing)
const apiKey = getEnv("OPENAI_API_KEY", { required: true });

// Get optional
const optional = getEnv("OPTIONAL_VAR");

// Use pre-defined ENV object
if (ENV.NODE_ENV === "production") {
  // production code
}
```

### Pre-defined Environment Variables

The `ENV` object includes common environment variables with safe defaults:
- `NODE_ENV` - defaults to "development"
- `OPENAI_API_KEY` - optional
- `LOG_LEVEL` - defaults to "info"

Each app should define its own `.env.example` file documenting required variables. See [docs/ENV.md](../../docs/ENV.md) for more information.

