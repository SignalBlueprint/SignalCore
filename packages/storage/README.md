# @sb/storage

Storage abstraction layer for consistent entity persistence across the Signal Blueprint suite with automatic Supabase/local fallback.

## Purpose

`@sb/storage` provides a unified storage interface that works seamlessly with both Supabase (PostgreSQL) and local JSON files. Apps use a single API and the package automatically handles database connections, snake_case/camelCase conversion, optimistic concurrency control, and graceful fallback to local storage when Supabase is unavailable.

## Features

### Core Storage Operations
- **get** - Retrieve a single entity by ID
- **list** - Query all entities of a kind with optional filtering
- **upsert** - Insert or update an entity
- **updateWithVersion** - Update with optimistic concurrency control
- **remove** - Delete an entity

### Automatic Fallback
- **Supabase-first** - Attempts Supabase if configured
- **Local JSON fallback** - Automatically falls back to `.sb/data/` JSON files
- **Graceful degradation** - Apps continue working when database is unavailable
- **Per-table fallback** - Missing tables trigger local storage without crashing

### Data Transformation
- **snake_case ↔ camelCase** - Automatic conversion between TypeScript and PostgreSQL naming
- **Type-safe** - Full TypeScript support with generics
- **Schema validation** - Works with `@sb/schemas` for type definitions

### Concurrency Control
- **Optimistic locking** - `updateWithVersion` prevents conflicting updates
- **Conflict detection** - Returns latest entity on version mismatch
- **Safe concurrent updates** - Multiple processes can safely update entities

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Basic CRUD Operations

```typescript
import { storage } from "@sb/storage";

// Create or update an entity
const product = await storage.upsert("products", {
  id: "prod_123",
  name: "Blue T-Shirt",
  price: 29.99,
  status: "active"
});

// Get a single entity
const retrieved = await storage.get("products", "prod_123");

// List all entities
const allProducts = await storage.list("products");

// List with filter
const activeProducts = await storage.list("products",
  (p) => p.status === "active"
);

// Remove an entity
await storage.remove("products", "prod_123");
```

### Optimistic Concurrency Control

```typescript
import { storage, ConflictError } from "@sb/storage";

// Get current entity
const task = await storage.get("tasks", "task_123");

// Modify it
const updatedTask = {
  ...task,
  status: "completed",
  updatedAt: new Date().toISOString()
};

try {
  // Update with version check
  await storage.updateWithVersion(
    "tasks",
    updatedTask,
    task.updatedAt // Expected version
  );
  console.log("Update successful");
} catch (error) {
  if (error instanceof ConflictError) {
    // Another process updated this entity
    console.log("Conflict detected!");
    console.log("Expected version:", error.expectedUpdatedAt);
    console.log("Actual version:", error.actualUpdatedAt);
    console.log("Latest entity:", error.latestEntity);
    // Retry with latest version
  }
}
```

### Storage Modes

```typescript
import { getStorage, getStorageInfo } from "@sb/storage";

// Get storage info
const info = getStorageInfo();
console.log(info.mode); // "Supabase" or "LocalJson"
console.log(info.config);

// Force local storage mode (useful for development)
process.env.STORAGE_MODE = 'local';
```

### Repository Pattern (Recommended)

```typescript
import { storage } from "@sb/storage";
import type { Lead } from "@sb/schemas";

class LeadRepository {
  private kind = "leads";

  async getById(id: string): Promise<Lead | null> {
    return storage.get<Lead>(this.kind, id);
  }

  async getByOrg(orgId: string): Promise<Lead[]> {
    return storage.list<Lead>(this.kind, (lead) => lead.orgId === orgId);
  }

  async create(lead: Lead): Promise<Lead> {
    return storage.upsert<Lead>(this.kind, lead);
  }

  async update(lead: Lead): Promise<Lead> {
    return storage.upsert<Lead>(this.kind, lead);
  }

  async delete(id: string): Promise<boolean> {
    return storage.remove(this.kind, id);
  }
}

export const leadRepository = new LeadRepository();
```

## API Reference

### Storage Interface

```typescript
interface Storage {
  get<T extends { id: string }>(kind: string, id: string): Promise<T | null>;
  list<T extends { id: string }>(kind: string, filter?: (entity: T) => boolean): Promise<T[]>;
  upsert<T extends { id: string }>(kind: string, entity: T): Promise<T>;
  updateWithVersion<T extends { id: string; updatedAt: string }>(
    kind: string,
    entity: T,
    expectedUpdatedAt: string
  ): Promise<T>;
  remove(kind: string, id: string): Promise<boolean>;
}
```

### Functions

#### `storage.get<T>(kind: string, id: string): Promise<T | null>`

Retrieve a single entity by kind and ID.

**Parameters:**
- `kind` - Entity type (e.g., "products", "tasks", "leads")
- `id` - Unique identifier

**Returns:** Entity of type T or null if not found

#### `storage.list<T>(kind: string, filter?: (entity: T) => boolean): Promise<T[]>`

List all entities of a kind, optionally filtered.

**Parameters:**
- `kind` - Entity type
- `filter` - Optional filter function

**Returns:** Array of entities matching the filter

#### `storage.upsert<T>(kind: string, entity: T): Promise<T>`

Insert or update an entity. If an entity with the same ID exists, it's updated; otherwise, it's inserted.

**Parameters:**
- `kind` - Entity type
- `entity` - Entity to upsert (must have `id` field)

**Returns:** The upserted entity

#### `storage.updateWithVersion<T>(kind, entity, expectedUpdatedAt): Promise<T>`

Update an entity with optimistic concurrency control.

**Parameters:**
- `kind` - Entity type
- `entity` - Updated entity with `updatedAt` timestamp
- `expectedUpdatedAt` - Expected current `updatedAt` value (version check)

**Returns:** Updated entity

**Throws:** `ConflictError` if version mismatch detected

#### `storage.remove(kind: string, id: string): Promise<boolean>`

Remove an entity by kind and ID.

**Parameters:**
- `kind` - Entity type
- `id` - Entity ID to remove

**Returns:** true if removed, false if not found

### ConflictError

```typescript
class ConflictError extends Error {
  readonly kind: string;
  readonly id: string;
  readonly expectedUpdatedAt: string;
  readonly actualUpdatedAt: string;
  readonly latestEntity: any;
}
```

Thrown when optimistic concurrency check fails during `updateWithVersion`.

### Utility Functions

#### `getStorage(): Storage`

Get the current storage instance (Supabase or LocalJson based on configuration).

#### `getStorageInfo(): { mode, config }`

Get information about current storage mode and configuration.

#### `resetStorage(): void`

Reset storage instance to force re-initialization (useful for testing).

#### `resetToSupabase(): void`

Force storage to attempt Supabase connection again (useful after running migrations).

## Storage Modes

### Supabase Storage

When `SUPABASE_URL` and `SUPABASE_ANON_KEY` are configured in `.env`:

- Stores entities in PostgreSQL tables (one table per kind)
- Handles snake_case ↔ camelCase conversion automatically
- Supports all Supabase features (RLS, real-time, etc.)
- Automatically falls back to local storage if tables don't exist

**Requirements:**
- Run database migrations from `docs/supabase-migrations/`
- Tables must match entity kinds (e.g., "products" table for "products" kind)
- Columns should be snake_case versions of entity fields

### Local JSON Storage

When Supabase is not configured or as fallback:

- Stores entities in `.sb/data/<kind>.json` files
- No external dependencies required
- Perfect for development and testing
- Data persists across restarts
- Simple JSON files can be inspected and edited

**Data Location:** `.sb/data/` directory in project root

## Case Conversion

Storage automatically converts between TypeScript camelCase and database snake_case:

```typescript
// TypeScript (camelCase)
const product = {
  id: "prod_123",
  productName: "T-Shirt",
  priceInCents: 2999,
  updatedAt: "2025-12-31T00:00:00Z"
};

// Stored in Supabase (snake_case)
// {
//   id: "prod_123",
//   product_name: "T-Shirt",
//   price_in_cents: 2999,
//   updated_at: "2025-12-31T00:00:00Z"
// }
```

## Error Handling

```typescript
import { storage, ConflictError } from "@sb/storage";

try {
  await storage.upsert("products", product);
} catch (error) {
  if (error instanceof ConflictError) {
    // Handle version conflict
    console.log("Conflict:", error.latestEntity);
  } else if (error.message.includes("TABLE_NOT_FOUND")) {
    // Table doesn't exist (will auto-fallback to local)
    console.log("Falling back to local storage");
  } else {
    // Other errors
    throw error;
  }
}
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | No | Supabase project URL | - |
| `SUPABASE_ANON_KEY` | No | Supabase anonymous key | - |
| `STORAGE_MODE` | No | Force storage mode ("local" or "supabase") | Auto-detect |

Set in root `.env` file.

## Database Schema

For Supabase storage, tables should follow this pattern:

```sql
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  product_name TEXT,
  price_in_cents INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

See `docs/supabase-migrations/` for complete migration scripts.

## Testing

```bash
# Run tests
pnpm --filter @sb/storage test

# Test with local storage
STORAGE_MODE=local pnpm --filter @sb/storage test

# Test with Supabase
STORAGE_MODE=supabase pnpm --filter @sb/storage test
```

## Dependencies

- `@sb/db` - Supabase client configuration

## Used By

All major apps use `@sb/storage` for persistence:
- **Questboard** - 14+ entity kinds (goals, quests, tasks, team members, etc.)
- **Catalog** - Products, carts, orders, lookbooks
- **LeadScout** - Leads storage
- **Outreach** - Campaign management
- **SiteForge** - Projects and generation jobs
- **Worker** - Job run summaries
- **Console** - Settings and configurations (planned)

## Best Practices

### 1. Use the Repository Pattern

Create repository classes for each entity type to encapsulate storage logic:

```typescript
class ProductRepository {
  async getById(id: string) {
    return storage.get("products", id);
  }
  // ... more methods
}
```

### 2. Always Include `id` Field

All entities must have an `id` field:

```typescript
interface Product {
  id: string;  // Required!
  name: string;
  // ... other fields
}
```

### 3. Use `updatedAt` for Concurrency

For entities that might be updated concurrently, include `updatedAt`:

```typescript
interface Task {
  id: string;
  updatedAt: string;  // ISO timestamp
  // ... other fields
}
```

### 4. Handle ConflictError

When using `updateWithVersion`, always handle conflicts:

```typescript
try {
  await storage.updateWithVersion(kind, entity, expectedVersion);
} catch (error) {
  if (error instanceof ConflictError) {
    // Merge changes or retry with latest version
  }
}
```

### 5. Use Type Parameters

Always specify the entity type for type safety:

```typescript
const product = await storage.get<Product>("products", id);
// product is typed as Product | null
```

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
