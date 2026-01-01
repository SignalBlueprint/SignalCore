# AI BACKLOG - Signal Blueprint Monorepo

**Last Updated:** 2026-01-01
**Status:** Active Development
**Auto-Merge:** Enabled for `claude/**` branches

---

## 📊 REPO MAP

### App Overview & How to Run

**Questboard** (Port 3000/5173)
Task management system with hierarchical goals/questlines/quests/tasks, Working Genius team assignment, daily Questmaster orchestration, and AI-powered sprint planning. Most mature app in suite with 48 tests, PWA support, and complete React frontend. Run: `pnpm --filter questboard dev:all`

**Catalog** (Port 4023)
E-commerce platform with AI-powered product management (GPT-4o Vision + DALL-E 3), vector semantic search, shopping cart, order processing, Stripe payments, lookbooks, and analytics dashboard. Complete storefront UI with mobile-first design. Run: `pnpm --filter catalog dev`

**Console** (Port 4000)
Unified admin hub providing real-time health monitoring of all suite apps, team member profiles, event log aggregation, AI telemetry tracking, Worker job monitoring, and JWT authentication endpoints. Central command center. Run: `pnpm --filter console dev`

**Worker** (CLI)
Background job scheduler with cron automation, daemon mode, YAML configuration, and 4 implemented jobs (daily.questmaster, weekly.sprintplanner, github.sync, dry-run variants). Enables suite-wide automation. Run: `pnpm --filter worker dev`

**LeadScout** (Port 4021)
Lead discovery and qualification with configurable rules-based scoring (source, recency, URL quality, company name), AI-powered intelligence via GPT-4o-mini (company analysis, tech stack detection, qualification reasoning), and full management UI with scoring breakdowns. Run: `pnpm --filter leadscout dev`

**SiteForge** (Port 4024)
AI-powered website generation platform with GPT-4o-mini content creation, component-based HTML templating (hero, features, pricing, testimonials, etc.), background job processing, and site preview/export. Currently supports single responsive template. Run: `pnpm --filter siteforge dev`

**Outreach** (Port 4025)
Campaign management and email automation with SendGrid integration, template system with variable substitution (including LeadScout intelligence variables), audience filtering by industry/score/tags, real email sending with rate limiting, and webhook-based delivery tracking. Run: `pnpm --filter outreach dev`

**Lexome** (Port 4026)
AI-enhanced e-reader connecting to Project Gutenberg's 70,000+ books with 7 AI features (text explanation, archaic translation, definitions, summarization, character analysis, comprehension questions, recommendations), annotations system, reading sessions, bookmarks, and comprehensive React UI with keyboard navigation and customizable settings. Run: `pnpm --filter lexome dev`

---

## 🏥 CURRENT HEALTH

### Build Status
✅ **All apps buildable** - TypeScript compilation configured for all 8 apps
⚠️ **Dependencies not installed in CI** - Would require `pnpm install` to validate

### Test Coverage
✅ **Questboard** - 48 tests passing (31 schema + 17 AI function tests)
✅ **Lexome** - 11 test files covering services, routes, and repositories
⚠️ **Catalog** - Basic server tests only (server.test.ts)
❌ **Console** - No tests
❌ **Worker** - No tests
❌ **LeadScout** - No tests
❌ **SiteForge** - No tests
❌ **Outreach** - No tests

**Target:** 70%+ code coverage across all apps

### Linting & Type Safety
✅ **ESLint configured** - All apps have lint scripts
✅ **TypeScript strict mode** - Type safety enforced
⚠️ **Not validated** - Need to run `pnpm typecheck` and `pnpm lint` after install

### Runtime Status
✅ **All 8 apps functional** - Can start and serve traffic
✅ **All apps use persistent storage** - Supabase via @sb/storage (except Console team data)
✅ **6 apps have AI integration** - OpenAI GPT-4o/GPT-4o-mini
✅ **1 app has PWA** - Questboard mobile-optimized

### Data Persistence
✅ **Questboard** - 14+ entity kinds
✅ **Catalog** - Products, carts, orders, lookbooks, analytics
✅ **LeadScout** - Leads with AI intelligence
✅ **Outreach** - Campaigns, send history
✅ **SiteForge** - Projects, generation jobs
✅ **Lexome** - Books, library, annotations, sessions, bookmarks
✅ **Worker** - Job summaries
⚠️ **Console** - Team data in-memory (NEEDS FIX)

---

## ✨ SHINY PRODUCT CHECKLIST

### What Makes Each App "Production Shiny"

#### Must-Haves (Blockers)
- [ ] **Frontend authentication** - JWT auth backend exists but not integrated into app UIs
- [ ] **Test coverage expansion** - Only 2/8 apps have comprehensive tests
- [ ] **Console data persistence** - Team/settings data currently in-memory
- [ ] **Error monitoring** - No centralized error tracking or alerting
- [ ] **SiteForge template variety** - Only 1 template, needs 5+ options

#### High-Value Adds
- [ ] **LeadScout → Outreach integration** - Complete sales funnel workflow
- [ ] **PWA rollout** - Questboard has it, expand to Catalog/Console/LeadScout
- [ ] **Catalog product variants** - Size/color/style options for e-commerce
- [ ] **API documentation** - OpenAPI/Swagger for all endpoints
- [ ] **Dark mode suite-wide** - Consistent theming across apps

#### Nice-to-Haves
- [ ] **Real-time updates** - WebSocket/SSE for live collaboration
- [ ] **Advanced analytics** - Unified dashboard in Console
- [ ] **Data backup/recovery** - Automated Supabase backups
- [ ] **CI/CD pipeline** - GitHub Actions with auto-deployment

### Recent Wins (Already Shiny! ✅)
- ✅ **Outreach email sending** - SendGrid integration with webhooks (PR #90)
- ✅ **Catalog payments** - Stripe SDK integrated, checkout ready
- ✅ **Questboard PWA** - Offline support, mobile-optimized (PR #89)
- ✅ **Lexome launch** - Complete AI e-reader (PRs #52-54)
- ✅ **Catalog analytics** - Comprehensive insights dashboard (PR #38)
- ✅ **Worker job system** - Production-ready scheduling
- ✅ **Auth backend** - JWT system with refresh tokens (PRs #35-36)

---

## 🎯 TOP 12 PRIORITIES (Ranked by Impact)

### P1: Frontend Authentication Integration
**App:** Console, Questboard, Catalog, LeadScout, SiteForge, Outreach
**Why:** Backend JWT auth exists but frontends don't enforce it. Critical security gap for production. Users can access all data without login.
**Acceptance Criteria:**
- Create shared login/signup React components in @sb/ui
- Add auth state management (Context or Zustand)
- Update API clients to include JWT tokens in headers
- Implement protected routes with redirect to login
- Add "My Account" / logout UI
- Test multi-tenant data isolation

**Primary Paths:**
- `packages/ui/src/auth/` - Shared auth components
- `apps/*/web/src/auth/` - App-specific auth integration
- `apps/*/web/src/api/` - API client token management

**Risk:** MEDIUM (widespread changes, requires frontend testing)

---

### P2: Expand Test Coverage (Catalog, LeadScout, Outreach, SiteForge)
**App:** Multiple (Catalog, LeadScout, Outreach, SiteForge)
**Why:** Only Questboard and Lexome have tests. Lack of test coverage blocks confident iteration and risks regressions during auto-merge PR workflow.
**Acceptance Criteria:**
- Catalog: 50%+ coverage (routes, AI vision, cart/order logic)
- LeadScout: 50%+ coverage (scoring engine, AI intelligence)
- Outreach: 50%+ coverage (template compilation, SendGrid integration)
- SiteForge: 50%+ coverage (generation pipeline, HTML templating)
- All apps: Integration tests for critical flows
- CI pipeline runs tests on every PR

**Primary Paths:**
- `apps/catalog/src/__tests__/`
- `apps/leadscout/src/__tests__/`
- `apps/outreach/src/__tests__/`
- `apps/siteforge/src/__tests__/`
- `vitest.workspace.ts` - Monorepo test config

**Risk:** LOW (additive, no breaking changes)

---

### P3: SiteForge Template Variations
**App:** SiteForge
**Why:** Currently only 1 responsive template. Customers need choices (modern/classic/minimal, industry-specific). Blocks real-world adoption.
**Acceptance Criteria:**
- Add 4+ visual template styles (modern, classic, minimal, bold)
- Add 5+ industry templates (SaaS, E-commerce, Portfolio, Agency, Restaurant)
- Implement theme customization (colors, fonts, layouts)
- Add template preview gallery in UI
- Allow template selection during project creation
- Document template structure for future additions

**Primary Paths:**
- `apps/siteforge/src/services/generator/templates/`
- `apps/siteforge/src/services/generator/themes/`
- `apps/siteforge/web/` - Template selection UI

**Risk:** LOW (isolated to SiteForge, well-defined scope)

---

### P4: Console Data Persistence
**App:** Console
**Why:** Team member data is currently in-memory mock data. Lost on restart. Blocks production use for team management.
**Acceptance Criteria:**
- Migrate team member data to @sb/storage
- Create Team entity schema in @sb/schemas
- Add CRUD endpoints for team members
- Add Working Genius profile management
- Persist user preferences and settings
- Migrate existing in-memory data structure

**Primary Paths:**
- `apps/console/src/repositories/teamRepository.ts`
- `apps/console/src/routes/team.ts`
- `packages/schemas/src/team.ts`
- `packages/storage/src/repositories/teamRepository.ts`

**Risk:** LOW (straightforward migration, isolated to Console)

---

### P5: LeadScout → Outreach Integration
**App:** LeadScout, Outreach
**Why:** Sales funnel is disconnected. Users discover leads in LeadScout but must manually create campaigns in Outreach. Automation unlocks value.
**Acceptance Criteria:**
- Add "Send to Campaign" button in LeadScout lead detail view
- Create campaign from selected leads
- Support bulk lead selection for campaigns
- Pre-populate campaign with lead-specific variables
- Add campaign performance tracking back to LeadScout
- Show which campaigns a lead is part of

**Primary Paths:**
- `apps/leadscout/web/` - "Send to Campaign" UI
- `apps/outreach/src/routes/campaigns.ts` - Accept lead IDs
- `apps/outreach/src/services/leadService.ts` - Fetch from LeadScout API

**Risk:** MEDIUM (cross-app integration, requires API coordination)

---

### P6: Error Monitoring & Centralized Logging
**App:** All apps
**Why:** No visibility into production errors. Cannot detect/diagnose issues. Blocks production readiness.
**Acceptance Criteria:**
- Integrate Sentry or similar error tracking
- Add structured logging with @sb/logger enhancements
- Create error dashboard in Console
- Set up alerting for critical errors (email/Slack)
- Add error boundaries in React apps
- Track error rates, response times, and availability

**Primary Paths:**
- `packages/logger/src/` - Enhanced logging
- `.github/workflows/monitoring.yml` - Monitoring config
- `apps/console/web/errors.html` - Error dashboard
- `apps/*/src/middleware/errorHandler.ts` - Centralized error handling

**Risk:** LOW (additive, improves observability)

---

### P7: PWA Rollout (Catalog, Console, LeadScout)
**App:** Catalog, Console, LeadScout
**Why:** Questboard has excellent PWA experience (offline, installable, mobile-optimized). Other apps should match for consistent mobile UX.
**Acceptance Criteria:**
- Add service worker with Workbox to each app
- Implement offline support and caching strategies
- Add "Add to Home Screen" prompts
- Mobile-responsive navigation (hamburger menus)
- Touch-optimized interactions
- Performance optimizations for mobile

**Primary Paths:**
- `apps/catalog/web/sw.js` - Service worker
- `apps/console/web/sw.js` - Service worker
- `apps/leadscout/web/sw.js` - Service worker
- `apps/*/web/manifest.json` - PWA manifest

**Risk:** MEDIUM (requires frontend build config changes)

---

### P8: Catalog Product Variants
**App:** Catalog
**Why:** E-commerce stores need size/color/style variants. Blocks fashion, apparel, and multi-option product use cases.
**Acceptance Criteria:**
- Add variant schema (SKU, size, color, style, material)
- Variant-specific inventory tracking
- Variant-specific pricing (optional price overrides)
- Variant selection UI in storefront
- Admin UI for managing variants
- Update cart/order system to handle variants

**Primary Paths:**
- `packages/schemas/src/product.ts` - Variant schema
- `apps/catalog/src/repositories/productRepository.ts` - Variant storage
- `apps/catalog/web/product-detail.html` - Variant selection UI
- `apps/catalog/src/routes/products.ts` - Variant endpoints

**Risk:** MEDIUM (requires schema changes, cart logic updates)

---

### P9: Worker Job Monitoring UI Enhancement
**App:** Console, Worker
**Why:** Console has basic job monitoring. Enhance with detailed execution history, performance metrics, and failure alerts for better operations visibility.
**Acceptance Criteria:**
- Job execution timeline with filtering
- Job performance metrics (avg duration, p95, p99)
- Success rate by job type
- Detailed error logs for failed executions
- Ability to manually trigger jobs from Console
- Job configuration editor

**Primary Paths:**
- `apps/console/web/jobs.html` - Enhanced job dashboard
- `apps/console/src/routes/jobs.ts` - Job management API
- `apps/worker/src/scheduler.ts` - Job metadata collection
- `packages/jobs/src/registry.ts` - Job schema

**Risk:** LOW (UI enhancements, no core logic changes)

---

### P10: API Documentation (OpenAPI/Swagger)
**App:** All apps
**Why:** 8 apps with 100+ endpoints but no centralized API docs. Blocks third-party integrations, internal development, and developer adoption.
**Acceptance Criteria:**
- Generate OpenAPI 3.0 specs for all apps
- Add Swagger UI endpoint (e.g., /api/docs)
- Document request/response schemas
- Add authentication requirements
- Include example requests/responses
- Publish unified API docs site

**Primary Paths:**
- `apps/*/src/openapi.ts` - OpenAPI spec generation
- `apps/*/src/routes/docs.ts` - Swagger UI endpoint
- `docs/API_REFERENCE.md` - Unified API documentation
- `packages/schemas/` - Leverage existing Zod schemas

**Risk:** LOW (additive, no breaking changes)

---

### P11: Dark Mode Suite-Wide
**App:** All apps
**Why:** Modern UX expectation. Many users prefer dark mode for reduced eye strain. Questboard/Lexome have custom theming; should be consistent.
**Acceptance Criteria:**
- Create theme system in @sb/ui with dark/light modes
- Add theme switcher component
- Update all apps to use theme system
- Store theme preference in localStorage
- Respect system preference (prefers-color-scheme)
- Ensure accessibility (WCAG contrast ratios)

**Primary Paths:**
- `packages/ui/src/theme/` - Theme system
- `apps/*/web/styles/` - App-specific theme overrides
- `apps/*/web/index.html` - Theme initialization

**Risk:** LOW (visual changes, no logic impact)

---

### P12: Real-time Updates (WebSocket/SSE)
**App:** Console, Questboard
**Why:** Enable collaborative features and instant feedback. Console dashboard should update live; Questboard tasks should sync in real-time.
**Acceptance Criteria:**
- Add WebSocket server to Console
- Implement event broadcasting for key actions
- Update Questboard for live task updates
- Add live notifications for events
- Handle connection management (reconnect, heartbeat)
- Add presence indicators (who's online)

**Primary Paths:**
- `apps/console/src/websocket.ts` - WebSocket server
- `packages/events/src/broadcaster.ts` - Event broadcasting
- `apps/questboard/web/src/websocket.ts` - WebSocket client
- `apps/console/web/dashboard.html` - Live updates UI

**Risk:** HIGH (complex architecture, requires state management)

---

## 📋 BACKLOG TABLE

| ID | App | Title | Priority | Status | LOCKED | FILES | Acceptance Criteria | Notes/PR |
|----|-----|-------|----------|--------|--------|-------|---------------------|----------|
| P1 | Console, Questboard, Catalog, LeadScout, SiteForge, Outreach | Frontend Authentication Integration (Parent) | 🔥 CRITICAL | In Progress | 🔓 | `packages/ui/src/auth/`, `apps/*/web/src/auth/`, `apps/*/web/src/api/` | - Shared login/signup components<br>- Auth state management<br>- JWT tokens in API calls<br>- Protected routes<br>- Logout UI | **Blocks:** Production security<br>**Effort:** 5-7 days total<br>**Impact:** Enables secure multi-tenant use<br>✅ **Questboard:** PR #89 |
| P1.1 | Questboard | Questboard Frontend Auth | 🔥 CRITICAL | DONE | 🔓 | `apps/questboard/web/src/auth/`, `apps/questboard/web/src/api/`, `apps/questboard/web/src/App.tsx` | - Login/signup UI<br>- Auth context provider<br>- Protected routes<br>- JWT in API calls<br>- Logout functionality | PR #89 |
| P1.2 | Console | Console Frontend Auth | 🔥 CRITICAL | READY | 🔓 | `apps/console/web/src/auth/`, `apps/console/web/src/api/`, `apps/console/web/index.html`, `apps/console/web/dashboard.html` | - Login/signup pages<br>- Auth state management<br>- Protect dashboard routes<br>- JWT in API client<br>- User menu with logout | **Effort:** 1 day<br>**Impact:** Secure Console access |
| P1.3 | Catalog | Catalog Frontend Auth | 🔥 CRITICAL | READY | 🔓 | `apps/catalog/web/src/auth/`, `apps/catalog/web/src/api/`, `apps/catalog/web/admin.html`, `apps/catalog/web/index.html` | - Login/signup for admin panel<br>- Auth context provider<br>- Protect admin routes<br>- JWT in product/order APIs<br>- User dropdown with logout | **Effort:** 1 day<br>**Impact:** Secure e-commerce admin |
| P1.4 | LeadScout | LeadScout Frontend Auth | 🔥 CRITICAL | READY | 🔓 | `apps/leadscout/web/src/auth/`, `apps/leadscout/web/src/api/`, `apps/leadscout/web/index.html` | - Login/signup UI<br>- Auth state in React<br>- Protect lead management<br>- JWT in lead API calls<br>- Account menu | **Effort:** 1 day<br>**Impact:** Secure lead data |
| P1.5 | SiteForge | SiteForge Frontend Auth | 🔥 CRITICAL | READY | 🔓 | `apps/siteforge/web/src/auth/`, `apps/siteforge/web/src/api/`, `apps/siteforge/web/index.html` | - Login/signup pages<br>- Auth state provider<br>- Protect project routes<br>- JWT in generation APIs<br>- User account UI | **Effort:** 1 day<br>**Impact:** Secure site projects |
| P1.6 | Outreach | Outreach Frontend Auth | 🔥 CRITICAL | READY | 🔓 | `apps/outreach/web/src/auth/`, `apps/outreach/web/src/api/`, `apps/outreach/web/index.html` | - Login/signup interface<br>- Auth context setup<br>- Protect campaign routes<br>- JWT in campaign APIs<br>- Logout button | **Effort:** 1 day<br>**Impact:** Secure campaign data |
| P2 | Catalog, LeadScout, Outreach, SiteForge | Expand Test Coverage | 🔥 CRITICAL | Open | 🔓 | `apps/catalog/src/__tests__/`, `apps/leadscout/src/__tests__/`, `apps/outreach/src/__tests__/`, `apps/siteforge/src/__tests__/` | - 50%+ coverage per app<br>- Integration tests for critical flows<br>- CI runs tests on PR | **Blocks:** Quality confidence<br>**Effort:** 8-10 days spread<br>**Impact:** Safe iteration |
| P3 | SiteForge | SiteForge Template Variations | 🔥 HIGH | READY | 🔓 | `apps/siteforge/src/services/generator/templates/`, `apps/siteforge/src/services/generator/themes/`, `apps/siteforge/web/src/components/TemplateGallery.tsx`, `apps/siteforge/web/src/pages/NewProject.tsx`, `apps/siteforge/src/routes/templates.ts` | - 4+ visual styles<br>- 5+ industry templates<br>- Theme customization<br>- Template preview gallery | **Blocks:** Customer choice<br>**Effort:** 6-8 days<br>**Impact:** Unlocks sales |
| P4 | Console | Console Data Persistence | 🔥 HIGH | DONE | 🔓 | `apps/console/src/repositories/teamRepository.ts`, `apps/console/src/routes/team.ts`, `packages/schemas/src/team.ts`, `packages/storage/src/repositories/teamRepository.ts`, `apps/console/src/routes/settings.ts` | - Migrate team data to @sb/storage<br>- CRUD endpoints<br>- Settings persistence | **PR:** #TBD<br>**Files:** packages/schemas/src/identity.ts, apps/console/src/routes/team.ts, apps/console/src/seed.ts, apps/console/src/server.ts<br>**Notes:** Extended Member schema with name/avatar/workload fields. Created full CRUD API for team members. Added seed function for initial data. Migrated from in-memory mock to persistent storage using @sb/storage. |
| P5 | LeadScout, Outreach | LeadScout → Outreach Integration | ⚡ MEDIUM | Open | 🔓 | `apps/leadscout/web/`, `apps/outreach/src/routes/campaigns.ts`, `apps/outreach/src/services/leadService.ts` | - "Send to Campaign" button<br>- Bulk lead selection<br>- Campaign performance tracking | **Unlocks:** Sales funnel<br>**Effort:** 4-5 days<br>**Impact:** Workflow automation |
| P6 | All | Error Monitoring & Logging | ⚡ MEDIUM | Open | 🔓 | `packages/logger/src/`, `apps/console/web/errors.html`, `apps/*/src/middleware/errorHandler.ts` | - Sentry integration<br>- Error dashboard<br>- Alerting setup<br>- Error boundaries | **Blocks:** Production visibility<br>**Effort:** 4-5 days<br>**Impact:** Reliability |
| P7 | Catalog, Console, LeadScout | PWA Rollout | ⚡ MEDIUM | Open | 🔓 | `apps/catalog/web/sw.js`, `apps/console/web/sw.js`, `apps/leadscout/web/sw.js` | - Service worker per app<br>- Offline support<br>- Install prompts<br>- Mobile optimization | **Enhances:** Mobile UX<br>**Effort:** 6-8 days<br>**Impact:** User experience |
| P8 | Catalog | Catalog Product Variants | ⚡ MEDIUM | READY | 🔓 | `packages/schemas/src/product.ts`, `apps/catalog/src/repositories/productRepository.ts`, `apps/catalog/web/product-detail.html`, `apps/catalog/src/routes/products.ts`, `apps/catalog/web/admin-products.html`, `apps/catalog/src/services/cartService.ts` | - Variant schema<br>- Variant inventory<br>- Selection UI<br>- Cart/order updates | **Unlocks:** E-commerce features<br>**Effort:** 4-5 days<br>**Impact:** Product flexibility |
| P9 | Console, Worker | Worker Job Monitoring Enhancement | 💡 LOW | Open | 🔓 | `apps/console/web/jobs.html`, `apps/console/src/routes/jobs.ts`, `apps/worker/src/scheduler.ts` | - Execution timeline<br>- Performance metrics<br>- Manual trigger<br>- Config editor | **Enhances:** Operations visibility<br>**Effort:** 3-4 days<br>**Impact:** DevOps efficiency |
| P10 | All | API Documentation (OpenAPI) | 💡 LOW | Open | 🔓 | `apps/*/src/openapi.ts`, `apps/*/src/routes/docs.ts`, `docs/API_REFERENCE.md` | - OpenAPI 3.0 specs<br>- Swagger UI<br>- Example requests<br>- Unified docs site | **Unlocks:** Developer adoption<br>**Effort:** 5-6 days<br>**Impact:** Integration ease |
| P11 | All | Dark Mode Suite-Wide | 💡 LOW | Open | 🔓 | `packages/ui/src/theme/`, `apps/*/web/styles/` | - Theme system<br>- Theme switcher<br>- All apps support<br>- Accessibility | **Enhances:** User experience<br>**Effort:** 4-5 days<br>**Impact:** Modern UX |
| P12 | Console, Questboard | Real-time Updates (WebSocket) | 💡 LOW | Open | 🔓 | `apps/console/src/websocket.ts`, `packages/events/src/broadcaster.ts`, `apps/questboard/web/src/websocket.ts` | - WebSocket server<br>- Event broadcasting<br>- Live task updates<br>- Notifications | **Unlocks:** Collaboration<br>**Effort:** 5-6 days<br>**Impact:** Real-time features |

---

## 🚀 EXECUTION STRATEGY

### Parallel Work Tracks (Minimize File Overlap)

**Track 1: Security & Auth**
- P1 (Frontend Auth) → Can run standalone, touches frontend only

**Track 2: Quality & Testing**
- P2 (Test Coverage) → Isolated per app, run in parallel
  - Worker 1: Catalog tests
  - Worker 2: LeadScout tests
  - Worker 3: Outreach tests
  - Worker 4: SiteForge tests

**Track 3: Feature Completion**
- P3 (SiteForge Templates) → Isolated to SiteForge
- P4 (Console Persistence) → Isolated to Console
- P8 (Product Variants) → Isolated to Catalog

**Track 4: Integration & Observability**
- P5 (LeadScout → Outreach) → Cross-app, coordinate API contracts
- P6 (Error Monitoring) → Touches all apps but non-invasive middleware

**Track 5: UX & Polish**
- P7 (PWA Rollout) → Per-app, can parallelize
- P9 (Job Monitoring) → Isolated to Console
- P11 (Dark Mode) → Start with @sb/ui, then per-app

**Track 6: Platform & Docs**
- P10 (API Docs) → Per-app, can parallelize
- P12 (WebSocket) → Complex, single-worker task

### Small PR Guidelines
- **Target:** < 500 lines changed per PR
- **Scope:** Single app or single package preferred
- **Testing:** Include tests with implementation
- **Docs:** Update README if user-facing changes

### Safe Auto-Merge Requirements
- ✅ All tests pass
- ✅ TypeScript compiles
- ✅ Linter passes
- ✅ Changes isolated to declared FILES scope
- ✅ No breaking API changes without migration plan

---

## 📈 SUCCESS METRICS

### 30-Day Milestone
- ✅ Frontend auth integrated (P1)
- ✅ Test coverage > 50% in 4 apps (P2)
- ✅ SiteForge has 5+ templates (P3)
- ✅ Console data persistence (P4)

### 60-Day Milestone
- ✅ LeadScout → Outreach workflow (P5)
- ✅ Error monitoring live (P6)
- ✅ 3 apps have PWA (P7)
- ✅ Catalog product variants (P8)

### 90-Day Milestone
- ✅ All 12 priorities complete
- ✅ Test coverage > 70% suite-wide
- ✅ API docs published
- ✅ Real-time features in Console and Questboard

### Key Performance Indicators (KPIs)
- **Reliability:** 99.5% uptime
- **Performance:** < 2s page load
- **Quality:** < 5 critical bugs/month
- **Security:** Zero auth bypass vulnerabilities
- **Developer Experience:** < 3 clicks to complete key tasks

---

## 🔒 LOCKING MECHANISM

**LOCKED** column indicates when a worker is actively working on a priority:
- 🔓 = Available for assignment
- 🔒 = Currently assigned to a worker session
- 🔗 = Blocked by dependency (show blocker in Notes)

**How to Lock:**
1. Worker session claims task by updating LOCKED to 🔒
2. Add session ID or PR link to Notes column
3. Update Status to "In Progress"
4. Update LOCKED to 🔓 when PR merged or session ends

---

## 📝 NOTES

### Recent Completed Work (Last 7 days)
- ✅ PR #91: Implement priority features for SiteForge
- ✅ PR #90: Add Send Campaign UI functionality to Outreach
- ✅ PR #89: Complete frontend authentication integration for Questboard
- ✅ PR #88: Add comprehensive next steps roadmap for Lexome
- ✅ PR #87: Add comprehensive next steps plan for SiteForge

### Architecture Constraints
- **No cross-app imports:** Apps cannot import from other apps
- **Package sharing only:** Use @sb/* packages for shared code
- **Event-driven communication:** Use @sb/events for inter-app messaging
- **Schema-first:** Define data contracts in @sb/schemas

### Auto-Merge Configuration
- **Branch pattern:** `claude/**`
- **Auto-approve:** GitHub Actions workflow
- **Auto-merge:** Squash merge after approval
- **Success rate:** 100% (10+ PRs successfully auto-merged)

---

**End of Backlog Document**
