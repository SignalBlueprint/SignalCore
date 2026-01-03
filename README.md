# Signal Blueprint Monorepo

## TL;DR
Suite-first monorepo with 7 production-ready apps and 18 shared packages for building AI-powered business automation tools. Workers run unattended to execute tasks autonomously.

## Product Goal
- Build a cohesive suite of apps that work together to automate business workflows
- Provide shared infrastructure (auth, storage, AI, events) to accelerate app development
- Enable autonomous worker execution of tasks across the suite without human intervention

## Suite Status Matrix

| App | Status | Port | How to Run |
|-----|--------|------|------------|
| [Questboard](apps/questboard/README.md) | ✅ Production | 3000/5173 | `pnpm --filter questboard dev` |
| [Console](apps/console/README.md) | 🟡 Functional | 4000 | `pnpm --filter console dev` |
| [Worker](apps/worker/README.md) | ✅ Production | CLI | `pnpm --filter worker dev -- daemon` |
| [LeadScout](apps/leadscout/README.md) | ✅ Production | 4021 | `pnpm --filter leadscout dev` |
| [SiteForge](apps/siteforge/README.md) | ✅ Production | 4024 | `pnpm --filter siteforge dev` |
| [Outreach](apps/outreach/README.md) | ✅ Production | 4025 | `pnpm --filter outreach dev` |
| [Lexome](apps/lexome/README.md) | ✅ Production | 4026 | `pnpm --filter lexome dev` |

**Status Legend:**
- ✅ **Production** = End-to-end working, can ship to users
- 🟡 **Functional** = Core features work but has gaps (e.g., missing persistence)
- ❌ **Broken** = Can't run or core flows broken

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **7 apps running**: All apps serve HTTP/have working CLIs
- **Full CRUD**: Create/read/update/delete works for all entities
- **Persistent storage**: All apps using @sb/storage (Supabase or local JSON)
- **Authentication**: JWT backend complete, frontend integrated in Questboard
- **AI integration**: 6 apps with GPT-4o/GPT-4o-mini (Questboard, LeadScout, SiteForge, Outreach, Lexome)
- **Email sending**: Outreach sends real emails via SendGrid
- **Worker jobs**: Cron scheduling, job queue, alerting, dependency chains
- **Mobile PWA**: Questboard has offline support and installable app
- **AI features working**: Sprint planning, lead intelligence, website generation, archaic translation

### 🟡 Partial (Works but Incomplete)
- **Auth frontend**: Backend complete, only Questboard has frontend integration
- **Testing**: Only Questboard has 48 tests, other apps untested
- **LeadScout AI UI**: Backend intelligence complete, frontend display missing
- **Build infrastructure**: Package type declarations missing, blocking `pnpm build` for apps

### ❌ Broken/Missing (Blocking "Full Fledged + Shiny")
- **No cross-app workflows**: LeadScout→Outreach→payment funnel not connected
- **No error monitoring**: No Sentry/centralized logging, errors invisible
- **No CI/CD pipeline**: Tests don't run on PRs automatically
- **Limited test coverage**: Only 1 of 7 apps has tests
- **No unified analytics**: Each app tracks separately, no suite-wide view

## How to Run

### Install
```bash
pnpm install
```

### Dev
```bash
# Run all apps concurrently
pnpm dev

# Run specific app
pnpm --filter questboard dev
pnpm --filter console dev
pnpm --filter worker dev -- daemon
pnpm --filter leadscout dev
pnpm --filter siteforge dev
pnpm --filter outreach dev
pnpm --filter lexome dev
```

### Test
```bash
# Run all tests (currently only Questboard)
pnpm test

# Run specific app tests
pnpm --filter questboard test
```

### Build
```bash
# Build everything
pnpm build

# Build specific app
pnpm --filter questboard build
```

### Env Vars
Copy `.env.example` to `.env` and configure:
- `OPENAI_API_KEY` - Required for AI features (all apps)
- `JWT_SECRET` - Required for authentication
- `DATABASE_URL` - Required, Supabase PostgreSQL connection
- `SENDGRID_API_KEY` - Required for Outreach email sending
- `GITHUB_TOKEN` - Optional, for Worker GitHub sync job

### URLs/Ports
- **Questboard**: http://localhost:5173 (Web), http://localhost:3000 (API)
- **Console**: http://localhost:4000
- **Worker**: CLI only (no web interface)
- **LeadScout**: http://localhost:4021
- **SiteForge**: http://localhost:4024
- **Outreach**: http://localhost:4025
- **Lexome**: http://localhost:4026

## Architecture (Short)

### Apps (7 Independent Applications)
Apps cannot import from each other, only from `@sb/*` packages:

1. **Questboard** - Task management with AI sprint planning and Working Genius assignment
2. **Console** - Admin dashboard with health checks, events, telemetry, worker monitoring
3. **Worker** - CLI job runner with cron scheduling, alerting, and queue management
4. **LeadScout** - Lead discovery and AI-powered scoring/intelligence
5. **SiteForge** - AI website generator with templates and color schemes
6. **Outreach** - Email campaign management with SendGrid integration
7. **Lexome** - AI e-reader for Project Gutenberg classics with annotations

### Packages (18 Shared Libraries)
Shared infrastructure used by apps:

- **@sb/storage** - Supabase abstraction layer for persistence
- **@sb/auth** - JWT authentication, password hashing, RBAC
- **@sb/ai** - OpenAI integration with caching and telemetry
- **@sb/events** - Event system for inter-app communication
- **@sb/jobs** - Scheduled job system (used by Worker)
- **@sb/telemetry** - AI usage and cost tracking
- **@sb/logger** - Centralized logging
- **@sb/cache** - Redis/in-memory caching utilities
- **@sb/notify** - Notifications (Slack, Email, Discord)
- **@sb/schemas** - Zod schemas and TypeScript types
- **@sb/ui** - Shared React components
- **@sb/rbac** - Role-based access control
- Others: suite, assignment, utils, config, integrations-github, db

### Data Flow & State
- **Persistence**: Apps use `@sb/storage` → Supabase PostgreSQL
- **Events**: Apps publish via `@sb/events` → Console aggregates
- **AI calls**: Apps call `@sb/ai` → OpenAI with caching + telemetry
- **Jobs**: Worker executes scheduled jobs via `@sb/jobs`
- **Auth**: JWT tokens from `@sb/auth` with orgId for multi-tenancy

## Known Issues

### Console Team Data In-Memory
- **Repro**: Add team member → restart server → data lost
- **Root cause**: Team data stored in-memory Map, not persisted
- **Fix needed**: Migrate to @sb/storage TeamRepository

### Auth Frontend Missing
- **Repro**: Open Console/LeadScout/etc → no login page, API calls unauthenticated
- **Root cause**: Backend JWT complete, frontend integration only in Questboard
- **Fix needed**: Add login/signup UI to remaining apps

### No Error Monitoring
- **Repro**: Production error occurs → invisible, no alerts
- **Root cause**: No Sentry or centralized error tracking
- **Fix needed**: Integrate Sentry across all apps

### Apps Are Isolated
- **Repro**: Find lead in LeadScout → can't send to Outreach campaign
- **Root cause**: No cross-app API integrations built
- **Fix needed**: Add "Send to Campaign" button calling Outreach API

### Limited Test Coverage
- **Repro**: Make code change → no tests catch regressions (except Questboard)
- **Root cause**: Only Questboard has tests (48 tests)
- **Fix needed**: Add test suites for remaining 6 apps

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| ROOT-1 | Console team data persistence | P1 | DONE | `apps/console/src/routes/team.ts`, `apps/console/src/seed.ts` | **What**: Migrate Console team data from in-memory Map to @sb/storage<br>**Why**: Team profiles lost on server restart<br>**Where**: Console team management routes<br>**AC**: Team CRUD persists to Supabase via TeamRepository, server restart preserves data, existing API works unchanged | ✅ Implemented in PR #95. Uses @sb/storage, persists to .sb/data/members.json or Supabase. |
| ROOT-2 | LeadScout test suite | P1 | TODO | `apps/leadscout/__tests__/`, `apps/leadscout/src/*.ts` | **What**: Add comprehensive test suite for LeadScout (API routes + scoring engine + AI intelligence)<br>**Why**: No tests = high regression risk on critical app<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ code coverage, tests for CRUD/scoring/AI, all tests pass in CI | |
| ROOT-3 | Outreach test suite | P1 | TODO | `apps/outreach/__tests__/`, `apps/outreach/src/*.ts` | **What**: Add test suite for Outreach (campaign CRUD + template compilation + email sending)<br>**Why**: Email sending is critical, needs testing<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ coverage, mock SendGrid API, test template variable substitution | |
| ROOT-4 | Sentry error monitoring | P2 | TODO | `root .env`, `apps/*/src/server.ts`, `packages/logger/src/index.ts` | **What**: Integrate Sentry for centralized error tracking across all 7 apps<br>**Why**: Production errors invisible without monitoring<br>**Where**: Suite-wide initialization in each app server<br>**AC**: All errors logged to Sentry with stack traces, source maps uploaded, alert rules configured for critical errors | |
| ROOT-5 | LeadScout→Outreach integration | P2 | TODO | `apps/leadscout/src/routes.ts`, `apps/leadscout/web/`, `apps/outreach/src/campaigns.ts` | **What**: Add "Send to Campaign" button in LeadScout UI that calls Outreach API to create campaign<br>**Why**: Enable lead→outreach workflow, currently manual copy/paste<br>**Where**: LeadScout lead detail page + Outreach campaign creation endpoint<br>**AC**: Select leads in LeadScout → click button → campaign created in Outreach with leads, leads marked "contacted" | |
| ROOT-6 | GitHub Actions CI/CD | P2 | TODO | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` | **What**: Set up CI pipeline running tests/lint/typecheck on every PR<br>**Why**: Prevent regressions from merging<br>**Where**: GitHub Actions workflow<br>**AC**: All tests run on PR, PR blocked if failing, pnpm cache enabled for speed | |
| ROOT-7 | Console unified analytics | P3 | TODO | `apps/console/src/analytics-routes.ts`, `apps/console/web/analytics.html` | **What**: Aggregate metrics from all 7 apps into single Console dashboard<br>**Why**: No single view of suite health/usage<br>**Where**: New Console analytics page<br>**AC**: Dashboard shows metrics from all apps (requests, errors, AI costs), charts for trends, filters by date/app | |
| ROOT-8 | OpenAPI documentation | P3 | TODO | `apps/*/src/openapi.ts`, `apps/*/src/server.ts` | **What**: Generate OpenAPI/Swagger docs for all app APIs<br>**Why**: Easier integration, debugging, and external API usage<br>**Where**: Each app's server.ts adds `/api/docs` endpoint<br>**AC**: Interactive Swagger UI on each app, accurate request/response schemas, try-it-now functionality | |
| ROOT-9 | Fix package type declarations | P0 | TODO | `packages/*/tsup.config.ts`, `packages/*/package.json` | **What**: Fix tsup configs to emit .d.ts type declaration files for all @sb/* packages<br>**Why**: Console and other apps fail to build with "Cannot find module '@sb/storage'" errors<br>**Where**: Package build configs (tsup.config.ts, package.json exports)<br>**AC**: `pnpm build` succeeds for all apps, typecheck passes, all @sb/* imports resolve with types | Blocks Console CON-11, critical for dev workflow |
| ROOT-10 | Org Profile for AI context | P0 | TODO | `packages/schemas/src/identity.ts`, `packages/ai/src/org-context.ts`, Supabase | **What**: Add organizational profile schema and storage to provide AI with company DNA context<br>**Why**: AI needs to understand org's identity (mission, values, tech stack) for culturally-aligned suggestions<br>**Where**: New `org_profiles` table, `/settings/org-profile` UI, `buildOrgContext()`<br>**AC**: OrgProfile interface implemented, Supabase table created, UI to edit profile, profile included in org context | Phase 1 per org_context_improvement_plan.md |
| ROOT-11 | Enhanced Pattern Learning | P0 | TODO | `packages/ai/src/pattern-extraction.ts`, `packages/schemas/src/patterns.ts` | **What**: Add AI-powered pattern extraction when goals complete (success patterns, antipatterns, process insights)<br>**Why**: Current pattern extraction is keyword-matching only, need AI analysis of actual execution<br>**Where**: New `patterns` table, extraction runs on goal completion<br>**AC**: ExtractedPattern interface, patterns table in Supabase, auto-extraction on goal completion, UI to view/edit patterns | Phase 1 per org_context_improvement_plan.md |
| ROOT-12 | Relevance-Based Context Selection | P0 | TODO | `packages/ai/src/org-context.ts` | **What**: Add semantic filtering to `buildOrgContext()` with contextHint, tags, and relevance scoring<br>**Why**: Recency ≠ Relevance - marketing questions should get marketing context<br>**Where**: Modify `buildOrgContext()` signature, add scoring logic<br>**AC**: contextHint parameter works, items scored by relevance not just recency, tag filtering works | Phase 1 per org_context_improvement_plan.md |
| ROOT-13 | Team Context in Org Context | P1 | TODO | `packages/ai/src/org-context.ts`, `packages/schemas/src/team.ts` | **What**: Add team context (capacity, skills, bottlenecks) to OrgContext for realistic planning<br>**Why**: Understanding who can do what is critical for AI task assignment<br>**Where**: New TeamContext interface, buildTeamContext() function<br>**AC**: Team capacity calculated, skill matrix built, bottlenecks identified, included in org context | Phase 2 per org_context_improvement_plan.md |
| ROOT-14 | Time & Cadence Awareness | P1 | TODO | `packages/ai/src/org-context.ts`, `packages/schemas/src/cadence.ts` | **What**: Add cadence context (current cycle, velocity, deadlines, seasonality) to OrgContext<br>**Why**: Understanding cycles and timing improves AI planning suggestions<br>**Where**: New CadenceContext interface, included in OrgContext<br>**AC**: Current sprint/cycle tracked, velocity calculated, upcoming deadlines surfaced, AI warns about capacity | Phase 2 per org_context_improvement_plan.md |
| ROOT-15 | Relationship Graph | P1 | TODO | `packages/ai/src/relationship-graph.ts` | **What**: Build relationship graph for goal clusters, quest chains, output usage, and knowledge connections<br>**Why**: Context isn't flat - things relate to each other; enables avoiding duplication<br>**Where**: New RelationshipGraph interface and builder functions<br>**AC**: Goals clustered by theme, quest chains identified, output usage tracked, knowledge web mapped | Phase 3 per org_context_improvement_plan.md |
| ROOT-16 | Semantic Search with Embeddings | P2 | TODO | `packages/ai/src/embeddings.ts`, Supabase pgvector | **What**: Add OpenAI embeddings for semantic search across goals, quests, outputs, knowledge cards<br>**Why**: True semantic understanding, not just keyword matching<br>**Where**: New `embeddings` table with pgvector, generate on entity create/update<br>**AC**: Embeddings generated for entities, cosine similarity search works, semantic relevance in buildOrgContext | Phase 3 per org_context_improvement_plan.md |
| ROOT-17 | Token Budget Optimization | P2 | TODO | `packages/ai/src/org-context.ts` | **What**: Add tokenBudget and prioritize (breadth/depth) options to buildOrgContext<br>**Why**: Different prompts need different context depth, maximize relevance within constraints<br>**Where**: Extend buildOrgContext options, iterative context building<br>**AC**: tokenBudget parameter respected, breadth mode includes more items with less detail, depth mode fewer with more | Phase 4 per org_context_improvement_plan.md |
| ROOT-18 | Context Caching | P2 | TODO | `packages/ai/src/org-context.ts`, `packages/cache/` | **What**: Cache org context snapshots with TTL and invalidation on changes<br>**Why**: Building context is expensive, cache for performance<br>**Where**: CachedContext interface, cache integration in buildOrgContext<br>**AC**: Context cached for 5 minutes, invalidated on org changes, cache hit rate tracked | Phase 4 per org_context_improvement_plan.md |

**Priority Levels:**
- **P0** = Blocks core functionality, fix immediately
- **P1** = Prevents production readiness, fix this sprint
- **P2** = Important for quality/UX, fix this quarter
- **P3** = Nice to have, backlog

## Release Gates

All of these must pass before releasing to production:

```bash
# All tests pass
pnpm test

# No TypeScript errors
pnpm typecheck

# No linting errors
pnpm lint

# All apps build successfully
pnpm build

# Manual smoke tests pass:
# - Create task in Questboard → appears in Console events
# - Create lead in LeadScout → score calculated correctly
# - Generate website in SiteForge → preview renders
# - Send campaign in Outreach → email delivered
# - Open book in Lexome → AI features work
# - Worker jobs execute on schedule
```

## Quick Links

- [Suite Map](./docs/SUITE_MAP.md) - Complete suite overview
- [Contributing](./docs/CONTRIBUTING.md) - Development guidelines
- [Architecture](./docs/ARCHITECTURE.md) - Architecture principles
- [Authentication](./docs/AUTHENTICATION_STRATEGY.md) - JWT auth implementation
- [Jobs System](./docs/JOBS.md) - Worker jobs documentation
