# Signal Blueprint Monorepo

Suite-first monorepo structure with independent apps and shared packages.

## Structure

```
apps/              # Independent applications
  questboard/      # Questline task system + Working Genius assignment

packages/          # Shared libraries
  schemas/         # Data contracts and type definitions
  ai/              # AI utilities and integrations
  ui/              # Shared UI components
  db/              # Database utilities
  utils/           # Shared utilities
  suite/           # Suite registry and metadata

docs/              # Documentation
.github/           # GitHub workflows and templates
```

## Suite Apps

This monorepo contains the Signal Blueprint suite of applications:
- **Questboard** - Questline task system + Working Genius assignment
- **LeadScout** - Lead discovery and qualification
- **SiteForge** - Website generation and management
- **Catalog** - Product catalog and inventory
- **Outreach** - Outreach campaign management
- **Console** - Unified admin console

For detailed information about each app and the suite architecture, see [SUITE_MAP.md](./docs/SUITE_MAP.md).

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env
# Edit .env and add your API keys (OPENAI_API_KEY, etc.)

# Run all apps and packages in dev mode
pnpm dev

# Run a specific app
pnpm --filter questboard dev

# Build everything
pnpm build

# Lint everything
pnpm lint

# Type check everything
pnpm typecheck
```

## Documentation

- [Suite Map](./docs/SUITE_MAP.md) - Complete suite overview and app registry
- [Contributing Guide](./docs/CONTRIBUTING.md) - How to contribute
- [Architecture](./docs/ARCHITECTURE.md) - Architecture principles and guidelines
- [Environment Variables](./docs/ENV.md) - Environment setup
- [Jobs System](./docs/JOBS.md) - How to add and run scheduled jobs

## Architecture Principles

- **App Independence**: Apps cannot import from other apps
- **Package Sharing**: Apps import shared code from `@sb/*` packages
- **Schema-First**: Data contracts defined in `@sb/schemas`
- **Event-Driven**: Inter-app communication via events (future)


