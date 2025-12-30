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

### Production-Ready Apps

#### 🟢 Questboard (Port 3000/5173)
**Status:** Fully Functional - Most mature app in the suite
**Description:** Questline task system with Working Genius team assignment and daily Questmaster orchestration

**Current State:**
- Complete Express.js REST API with comprehensive endpoints
- Full React frontend with 8 page components (Today, Sprint, Goals, Team, etc.)
- Hierarchical goal/questline/quest/task system
- AI-powered sprint planning with plan generation and comparison
- Daily deck generation for team members
- Task assignment with Working Genius-based AI explanations
- Event system integration for activity tracking
- Storage abstraction layer with template system

**Next Tasks:**
- Add comprehensive test coverage (unit + integration)
- Implement authentication/authorization
- Build real-time collaboration features
- Improve mobile-responsive design
- Create user onboarding flow
- Add data export/import functionality

---

#### 🟢 Catalog (Port 4023)
**Status:** Full MVP - AI-powered product management
**Description:** Product catalog and inventory management with AI capabilities

**Current State:**
- Complete Express.js server with full CRUD operations
- AI-powered image analysis using OpenAI GPT-4o Vision
- AI product description generation
- Vector embeddings for semantic search
- DALL-E 3 integration for clean product shots
- Inventory management with auto-status updates
- Lookbook/collection system
- Public storefront API
- Comprehensive documentation (README + CATALOG_GUIDE)

**Next Tasks:**
- Build React frontend for catalog management
- Create mobile-friendly upload interface
- Add batch upload and CSV import/export
- Implement payment processing integration
- Build order management system
- Create analytics dashboard
- Add category management

---

#### 🟢 Console (Port 4000)
**Status:** Fully Functional - Admin hub with UI
**Description:** Unified admin console for suite management

**Current State:**
- Complete Express.js API with frontend SPA
- Real-time health checks for all suite apps
- Event log aggregation (last 200 events)
- AI telemetry tracking (calls, costs, cache hits)
- Team member profiles with Working Genius
- Dashboard statistics and metrics
- Active quests integration with Questboard

**Next Tasks:**
- Connect team data to real database (currently mock)
- Add authentication/authorization
- Implement real-time updates (WebSocket/SSE)
- Add notification system
- Build team member CRUD operations
- Create role-based access control
- Add data export functionality

---

#### 🟢 Worker (CLI Job Runner)
**Status:** Functional - 4 implemented jobs
**Description:** CLI-based scheduled job runner

**Current State:**
- Job runner CLI with registration system
- 4 implemented jobs:
  - `daily.questmaster` - Quest unlocks, deck updates, stuck items
  - `weekly.sprintplanner` - Sprint planning and assignments
  - `github.sync` - Sync tasks to GitHub Issues
  - `daily.questmaster.dryrun` - Test mode
- Org-specific job execution
- Command-line interface for manual execution

**Next Tasks:**
- Add actual cron scheduler (currently manual)
- Implement job queue with retry logic
- Build job monitoring dashboard
- Add email notification jobs
- Create data backup/export jobs
- Add job execution history tracking
- Implement job failure alerts

---

### Basic/Functional Apps

#### 🟡 LeadScout (Port 4021)
**Status:** Basic - Functional API, needs UI and database
**Description:** Lead discovery and qualification system

**Current State:**
- Complete REST API with CRUD operations
- In-memory repository with filtering (status, source, score)
- Zod schema validation
- Filter support and seed endpoint
- Full API documentation

**Next Tasks:**
- Swap in-memory storage for persistent database (@sb/storage)
- Build React UI for lead management dashboard
- Add automatic lead scoring based on criteria
- Implement CSV import/export
- Add lead enrichment API integrations (email, contact info)
- Connect to Outreach app for campaign targeting
- Add web scraping for lead discovery

---

#### 🟡 Outreach (Port 4025)
**Status:** Basic - Campaign management, needs email sending and UI
**Description:** Outreach campaign management and automation

**Current State:**
- HTTP server with campaign management
- Message template system with variable substitution ({{business_name}}, etc.)
- Audience filtering: industry, score range, tags
- Template compilation engine with personalization
- Mock lead provider for testing

**Next Tasks:**
- Integrate email service provider (SendGrid, AWS SES, etc.)
- Build campaign management UI
- Add email template builder with WYSIWYG editor
- Implement campaign scheduling
- Add email tracking and analytics (opens, clicks)
- Build contact list import/management
- Add Loom video integration
- Implement A/B testing framework

---

### Early Stage Apps

#### 🔴 SiteForge (Port 4024)
**Status:** Skeleton - Basic project management only
**Description:** Website generation and management platform

**Current State:**
- Basic HTTP server with project CRUD
- In-memory storage (Map-based)
- Generation job queue skeleton (TODO)
- Basic project schema: businessName, domain, niche, status

**Next Tasks:**
- Implement actual website generation pipeline
- Build template library (React, Next.js, static HTML)
- Create frontend UI for project management
- Add visual page builder component
- Implement deployment to hosting platforms (Vercel, Netlify)
- Add preview/staging environments
- Create asset upload and management
- Add custom domain configuration

---

#### 🔴 Demoapp
**Status:** Placeholder - No functionality
**Description:** Purpose undefined

**Current State:**
- Minimal package.json
- Single index.ts with console.log only
- Empty README template

**Next Tasks:**
- Define purpose of this app or remove if not needed
- Update README with description
- Implement functionality based on defined purpose

---

## Suite Status Summary

**Fully Functional:** Questboard, Catalog, Console, Worker
**Basic/Functional:** LeadScout, Outreach
**Skeleton/Early:** SiteForge, Demoapp

**Critical Next Steps for Suite Completeness:**
1. Add persistent database layer to apps using in-memory storage (LeadScout, SiteForge)
2. Build frontend UIs for apps missing them (LeadScout, SiteForge, Outreach, Catalog)
3. Implement core website generation in SiteForge
4. Add email sending to Outreach
5. Add authentication/authorization across all apps
6. Create integration points between apps (LeadScout → Outreach flow)
7. Add comprehensive testing across all apps
8. Implement proper scheduling for Worker jobs

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


