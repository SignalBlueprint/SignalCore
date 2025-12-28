# @sb/config

Environment variable and runtime configuration management for the Signal Blueprint suite.

## How Environment Variables Work in This Monorepo

The monorepo uses a **single root-level `.env` file** for all environment variables. This package automatically loads the root `.env` file when imported, ensuring all apps and packages use the same configuration.

## Automatic Loading

When you import `@sb/config` (or any package that imports it), the root `.env` file is automatically loaded. You don't need to do anything special - just import the package:

```typescript
import { getEnv } from "@sb/config";
// Root .env is now loaded automatically!
```

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

