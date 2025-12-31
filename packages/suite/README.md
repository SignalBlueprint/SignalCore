# @sb/suite

Suite registry and metadata for all Signal Blueprint apps.

## Purpose

`@sb/suite` provides a central registry of all apps in the suite with metadata including status, ports, features, and health check endpoints.

## Features

- **App Registry** - Complete list of all suite apps
- **Metadata** - Status, description, ports, features
- **Health Checks** - Standardized health check endpoints
- **Discovery** - Apps can discover other apps programmatically

## Installation

```bash
# Already available as a workspace package
pnpm install
```

## Usage

### Get All Apps

```typescript
import { getApps } from "@sb/suite";

const apps = getApps();

apps.forEach(app => {
  console.log(`${app.name} - ${app.status}`);
  console.log(`  Port: ${app.port}`);
  console.log(`  URL: ${app.url}`);
});
```

### Get App by ID

```typescript
import { getApp } from "@sb/suite";

const catalog = getApp("catalog");
console.log(`Catalog runs on port ${catalog.port}`);
```

### App Metadata

```typescript
interface AppMetadata {
  id: string;
  name: string;
  status: "prod" | "beta" | "wip" | "skeleton";
  description: string;
  port?: number;
  url?: string;
  features: string[];
  healthCheck?: string;
}
```

## Testing

```bash
pnpm --filter @sb/suite test
```

## Dependencies

None - standalone package

## Used By

- **Console** - App registry display
- **Worker** - Service discovery

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines.
