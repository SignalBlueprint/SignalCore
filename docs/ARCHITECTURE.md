# Architecture Overview

## Monorepo Structure

This is a suite-first monorepo organized into `apps/` and `packages/`:

- **apps/** - Independent applications that can be deployed separately
- **packages/** - Shared libraries and utilities consumed by apps

## Package Structure

### `@sb/schemas`
The source of truth for all data contracts, types, and schemas. Apps should import types and schemas from here rather than defining their own.

### `@sb/ai`
AI-related utilities, integrations, and services.

### `@sb/ui`
Shared UI components and design system elements.

### `@sb/db`
Database utilities, models, migrations, and connection handling.

### `@sb/utils`
Shared utility functions and helpers used across the codebase.

## Architecture Principles

### App Independence
- Apps are independent entities that should not import from other apps
- Apps communicate via events (to be implemented later)
- Each app can be deployed and scaled independently

### Package Dependencies
- Apps can import from any package (`@sb/*`)
- Packages can depend on other packages
- Packages should not depend on apps

### Schema-First Development
- All data contracts are defined in `@sb/schemas`
- Apps and packages should import and extend schemas from `@sb/schemas`
- Schema changes require coordination across the team

### Event-Driven Communication (Future)
- Inter-app communication will be handled via events
- Event schemas will be defined in `@sb/schemas`
- This enables loose coupling between apps

## Import Rules

**Allowed:**
- Apps importing from packages: `import { something } from '@sb/schemas'`
- Packages importing from other packages: `import { util } from '@sb/utils'`
- Relative imports within the same app/package

**Forbidden:**
- Apps importing from other apps
- Packages importing from apps

These rules are enforced via ESLint configuration.

