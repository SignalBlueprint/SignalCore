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

docs/              # Documentation
.github/           # GitHub workflows and templates
```

## Quick Start

```bash
# Install dependencies
pnpm install

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

- [Contributing Guide](./docs/CONTRIBUTING.md) - How to contribute
- [Architecture](./docs/ARCHITECTURE.md) - Architecture principles and guidelines
- [Environment Variables](./docs/ENV.md) - Environment setup

## Architecture Principles

- **App Independence**: Apps cannot import from other apps
- **Package Sharing**: Apps import shared code from `@sb/*` packages
- **Schema-First**: Data contracts defined in `@sb/schemas`
- **Event-Driven**: Inter-app communication via events (future)

