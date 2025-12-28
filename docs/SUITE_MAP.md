# Suite Map

## Suite Vision

Signal Blueprint is a suite of integrated applications that work together to provide a complete platform for business operations, customer engagement, and team collaboration. Each app serves a distinct purpose while sharing common infrastructure, schemas, and design patterns through shared packages.

## Apps

### Questboard
**Status:** Skeleton  
**Purpose:** Questline task system combined with Working Genius team assignment, orchestrated by daily Questmaster role  
**Owners:** @signal-blueprint/questboard-owners

### LeadScout
**Status:** Skeleton  
**Purpose:** Lead discovery and qualification system  
**Owners:** @signal-blueprint/platform

### SiteForge
**Status:** Skeleton  
**Purpose:** Website generation and management platform  
**Owners:** @signal-blueprint/platform

### Catalog
**Status:** Skeleton  
**Purpose:** Product catalog and inventory management  
**Owners:** @signal-blueprint/platform

### Outreach
**Status:** Skeleton  
**Purpose:** Outreach campaign management and automation  
**Owners:** @signal-blueprint/platform

### Console
**Status:** Skeleton  
**Purpose:** Unified admin console for suite management  
**Owners:** @signal-blueprint/platform

## Shared Packages

### `@sb/schemas`
The source of truth for all data contracts, types, and schemas. All apps and packages should import types and schemas from here.

### `@sb/ai`
AI-related utilities, integrations, and services shared across the suite.

### `@sb/ui`
Shared UI components and design system elements for consistent user experiences.

### `@sb/db`
Database utilities, models, migrations, and connection handling.

### `@sb/utils`
Shared utility functions and helpers used across the codebase.

### `@sb/suite`
Suite registry and metadata - provides the single source of truth for app definitions and suite-wide information.

## Rules

### App Independence
- **Apps never import from other apps** - Apps are independent entities that should not directly depend on each other
- **Apps communicate via events** - Inter-app communication should be handled through events (to be implemented)
- **Apps only import from `@sb/*` packages** - All shared code lives in packages

### Schema-First Development
- All data contracts are defined in `@sb/schemas`
- Apps and packages should import and extend schemas from `@sb/schemas`
- Schema changes require coordination across the team

### Package Dependencies
- Apps can import from any package (`@sb/*`)
- Packages can depend on other packages
- Packages should not depend on apps

## Roadmap

### Phase 1: Skeleton → MVPs
- Create minimal app scaffolds
- Define core schemas in `@sb/schemas`
- Build foundational packages
- Develop each app to MVP status independently

### Phase 2: MVPs → Integrations
- Establish event system for inter-app communication
- Build shared authentication and user management
- Integrate apps via events and shared schemas
- Develop Console for unified management

### Phase 3: Production
- Move apps from beta to production status
- Scale infrastructure
- Add advanced features and integrations
- Optimize performance and reliability

## Suite Registry

The suite registry (`@sb/suite`) provides programmatic access to app metadata:

```typescript
import { SUITE_APPS, AppId } from "@sb/suite";

// Get all apps
const apps = SUITE_APPS;

// Filter by status
const productionApps = SUITE_APPS.filter((app) => app.status === "prod");
```

This registry is used for:
- CI/CD filtering and automation
- Documentation generation
- Future routing and navigation
- Suite-wide tooling and scripts

