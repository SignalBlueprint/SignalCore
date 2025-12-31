# @sb/db

Supabase client configuration and database utilities for the Signal Blueprint suite.

## Purpose

`@sb/db` provides a configured Supabase client instance that all apps and packages use to interact with the PostgreSQL database. It handles connection setup, authentication, and client initialization.

## Features

- **Supabase Client** - Pre-configured Supabase client
- **Connection Pooling** - Efficient database connections
- **Auto-Configuration** - Reads from environment variables
- **Type Safety** - TypeScript support for database operations

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Getting Supabase Client

```typescript
import { getSupabaseClient } from "@sb/db";

const supabase = getSupabaseClient();

// Query database
const { data, error } = await supabase
  .from("products")
  .select("*")
  .eq("status", "active");
```

### Checking Configuration

```typescript
import { isSupabaseConfigured } from "@sb/db";

if (isSupabaseConfigured()) {
  console.log("Supabase is configured");
} else {
  console.log("Using local storage fallback");
}
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |

Set in root `.env` file.

## Testing

```bash
pnpm --filter @sb/db test
```

## Dependencies

- `@supabase/supabase-js` - Supabase client SDK

## Used By

- **@sb/storage** - Database operations
- **@sb/auth** - User and org management
- All apps requiring database access

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
