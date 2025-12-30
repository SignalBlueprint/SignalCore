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
  storage/         # Storage abstraction layer
  utils/           # Shared utilities
  suite/           # Suite registry and metadata
  assignment/      # Task assignment and Working Genius logic
  events/          # Event system for inter-app communication
  jobs/            # Scheduled job system
  telemetry/       # AI and system telemetry tracking
  logger/          # Centralized logging
  cache/           # Caching utilities
  config/          # Configuration management
  rbac/            # Role-based access control
  notify/          # Notification system
  integrations-github/  # GitHub integration utilities

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
- Full React frontend with 9 page components (Today, Sprint, Goals, Team, Analytics, etc.)
- Analytics Dashboard with task/goal/quest statistics, Working Genius distribution, completion metrics, and activity timeline
- Hierarchical goal/questline/quest/task system
- AI-powered sprint planning with plan generation and comparison
- Daily deck generation for team members
- Task assignment with Working Genius-based AI explanations
- Event system integration for activity tracking
- Storage abstraction layer with template system
- ✅ **Test Suite** - Comprehensive testing with Vitest (48 tests passing)
  - Monorepo-wide Vitest workspace configuration
  - 31 schema tests (@sb/schemas) covering all type definitions, Working Genius types, Quest/Questline/Goal entities, Strategic Packets, GoalSpec, DailyDeck, SprintPlan, and JobRunSummary
  - 17 AI function tests (@sb/ai) covering runClarifyGoal, runDecomposeGoal, runExpandTask, runLevelUpGoal, and runImproveGoal with mocked OpenAI calls
  - Full test coverage for caching, org context, team snapshots, error handling, and edge cases

**Next Steps:**
1. **Testing & Quality**
   - Add integration tests for API endpoints
   - Add E2E tests for critical user flows (create quest, assign tasks, review sprint)
   - Add tests for questmaster and sprint planner business logic
   - Set up CI/CD pipeline with automated testing

2. **Authentication & Security**
   - Implement user authentication (JWT or session-based)
   - Add role-based access control (admin, team lead, member)
   - Secure API endpoints with auth middleware
   - Add org/team isolation for multi-tenancy

3. **Real-time Collaboration**
   - Add WebSocket/SSE for live updates
   - Show when other users are viewing/editing
   - Real-time task status updates
   - Live notifications for assignments and completions

4. **Mobile & UX**
   - Improve mobile-responsive layouts for all pages
   - Add touch-optimized interactions
   - Create PWA manifest for installable app
   - Improve loading states and error handling

5. **Onboarding & Documentation**
   - Create interactive onboarding flow for new users
   - Add in-app tooltips and guides
   - Build admin setup wizard
   - Create video tutorials

6. **Data Management**
   - Add bulk data export (CSV, JSON)
   - Add data import from other tools
   - Implement data backup and restore
   - Add data archival for completed quests

---

#### 🟢 Catalog (Port 4023)
**Status:** Production Ready - Complete e-commerce platform with AI
**Description:** Full-featured product catalog and e-commerce platform with AI-powered management, shopping cart, and order processing

**Current State:**
- Complete Express.js server with full CRUD operations
- Comprehensive admin web UI with product management dashboard
  - Product listing with real-time statistics and filtering
  - Add/edit/delete products with modal forms
  - Drag-and-drop image upload with multi-image support
  - Batch upload (up to 20 products at once) with progress tracking
  - CSV import/export for bulk data management
  - AI feature toggles (auto-analyze, generate clean shots)
  - Responsive design for mobile and desktop
- AI-powered image analysis using OpenAI GPT-4o Vision
- AI product description generation
- Vector embeddings for semantic search
- DALL-E 3 integration for clean product shots
- Inventory management with auto-status updates
- Lookbook/collection system
- Public storefront API
- **E-commerce & Order Management:**
  - Shopping cart with session management
  - Complete order processing workflow
  - Order status tracking (pending → confirmed → processing → shipped → delivered)
  - Payment status management
  - Automatic inventory deduction on orders
  - Inventory restoration on cancellations/refunds
  - Customer order history and lookup (by order number or email)
  - Shipping and tracking number support
- ✅ **Customer Storefront UI** - Modern, responsive shopping experience
  - Product browsing with responsive grid layout
  - Advanced search and filtering (category, price range, text search)
  - Product detail pages with image galleries and zoom
  - Shopping cart sidebar with real-time updates
  - Complete checkout flow with customer information form
  - Order confirmation with order number and tracking
  - Order lookup system (by email or order number)
  - Mobile-optimized responsive design
  - Clean, modern UI with smooth animations
  - Routes: / or /store for customers, /admin for management
- Comprehensive documentation (README + CATALOG_GUIDE)

**Next Steps:**
1. **Payment Integration** 🔥 HIGH PRIORITY
   - Integrate Stripe payment processing
   - Add PayPal checkout option
   - Implement secure payment flow
   - Add payment webhooks for order confirmation
   - Build payment reconciliation and reporting
   - Connect payment processing to checkout UI

2. **Semantic Search UI**
   - Build search UI leveraging existing vector embeddings
   - Implement "similar products" recommendations
   - Add visual similarity search using images
   - Create saved searches and search history

3. **Lookbook & Collections UI**
   - Build visual lookbook/collection builder interface
   - Add drag-and-drop product organization
   - Create public lookbook gallery view
   - Implement collection sharing and embedding

4. **Analytics & Insights**
   - Create analytics dashboard (product views, conversions, revenue)
   - Add product performance metrics and recommendations
   - Build inventory alerts (low stock, reorder points)
   - Generate sales and inventory reports
   - Track AI usage costs and ROI
   - Add sales forecasting and trends

5. **Advanced Product Management**
   - Implement product variants (size, color, style) with variant-specific inventory
   - Build category management with hierarchy
   - Add advanced tag management and auto-tagging
   - Create SKU/barcode management
   - Add product relationships (bundles, related items, upsells)
   - Implement bulk edit capabilities for multiple products

---

#### 🟢 Console (Port 4000)
**Status:** Fully Functional - Admin hub with UI
**Description:** Unified admin console for suite management

**Current State:**
- Complete Express.js API with frontend SPA
- Real-time health checks for all suite apps
- Event log aggregation (last 200 events)
- AI telemetry tracking (calls, costs, cache hits)
- Team member profiles with Working Genius (mock in-memory data)
- Dashboard statistics and metrics
- Active quests integration with Questboard

**Next Steps:**
1. **Data Persistence**
   - Migrate team data from mock to persistent storage (@sb/storage)
   - Add settings/configuration persistence
   - Implement user preferences storage
   - Add audit log storage for admin actions

2. **Authentication & Authorization**
   - Implement admin authentication system
   - Add role-based access control (super admin, admin, viewer)
   - Create API key management for apps
   - Add session management and security

3. **Real-time Monitoring**
   - Add WebSocket/SSE for live updates
   - Build real-time app status monitoring
   - Create live event stream viewer
   - Add real-time metrics dashboard (CPU, memory, requests)

4. **Notification System**
   - Build notification center with alerts
   - Add email notifications for critical events
   - Implement Slack/Discord webhook integrations
   - Create configurable alert rules (app down, high AI costs, errors)

5. **Team Management**
   - Build complete team member CRUD interface
   - Add team member invitation system
   - Implement Working Genius assessment flow
   - Add team analytics and insights
   - Create team calendar and availability

6. **Suite Orchestration**
   - Add ability to start/stop apps from Console
   - Build deployment management interface
   - Add environment variable management
   - Create suite-wide configuration panel
   - Implement backup and restore functionality

7. **Reporting & Analytics**
   - Build comprehensive analytics dashboard
   - Add cost tracking and forecasting
   - Create usage reports per app
   - Add data export (CSV, JSON, PDF reports)
   - Build custom report builder

---

#### 🟢 Worker (CLI Job Runner & Scheduler)
**Status:** Production Ready - Full scheduling system with 4 implemented jobs
**Description:** CLI-based job runner with automatic cron scheduling

**Current State:**
- ✅ **Cron Scheduler** - Automated job execution using cron expressions
- ✅ **Daemon Mode** - Runs continuously executing jobs on schedule
- ✅ **YAML Configuration** - Simple `scheduler.yaml` config file
- ✅ **Timezone Support** - Schedule jobs in different timezones
- ✅ **Manual Execution** - Run any job on-demand via CLI
- ✅ **Job Registry** - Extensible job registration system
- ✅ **Event Publishing** - Jobs publish events for integration
- ✅ **Signal Handling** - Graceful shutdown on SIGINT/SIGTERM

**Implemented Jobs (4):**
- `daily.questmaster` - Quest unlocks, deck updates, stuck items detection
- `weekly.sprintplanner` - Sprint planning and task assignments
- `github.sync` - Sync tasks to GitHub Issues (requires GITHUB_TOKEN)
- `daily.questmaster.dryrun` - Test mode

**Commands:**
- `daemon` - Start scheduler daemon with automatic job execution
- `job <id>` - Run a specific job once
- `list` - List all registered jobs
- `schedules` - Show configured schedules

**See:** [Worker README](apps/worker/README.md) for detailed documentation

**Next Steps:**
1. **Scheduling Enhancements**
   - Implement job dependency chains
   - Add conditional execution rules
   - Support dynamic schedule adjustments

2. **Job Queue & Reliability**
   - Build persistent job queue with @sb/storage
   - Implement retry logic with exponential backoff
   - Add dead letter queue for failed jobs
   - Create job priority system
   - Add job cancellation capability

3. **Monitoring & Observability**
   - Build job monitoring dashboard (integrate with Console)
   - Add job execution history tracking
   - Create job performance metrics (duration, success rate)
   - Implement detailed logging with log levels
   - Add job output/result storage

4. **Alerting & Notifications**
   - Implement job failure alerts (email, Slack, Discord)
   - Add success/completion notifications
   - Create custom alert rules per job
   - Build escalation policies for critical failures
   - Add health check endpoint for monitoring tools

5. **New Jobs to Implement**
   - Email notification jobs (digest, alerts, reports)
   - Data backup/export jobs for all apps
   - Database cleanup/archival jobs
   - Analytics aggregation jobs
   - Report generation jobs (weekly summaries, metrics)
   - Lead enrichment jobs (for LeadScout)
   - Campaign sending jobs (for Outreach)

6. **Developer Experience**
   - Create job template/generator CLI
   - Add job testing framework
   - Build job debugging tools
   - Implement job preview/dry-run mode for all jobs
   - Add job documentation generator

---

### Basic/Functional Apps

#### 🟢 LeadScout (Port 4021)
**Status:** Fully Functional - Complete API + UI with AI-powered scoring and intelligence
**Description:** Lead discovery and qualification system with automatic scoring and AI analysis

**Current State:**
- Complete REST API with CRUD operations
- Persistent storage using @sb/storage (StorageLeadRepository)
- Full web UI with lead management dashboard
- Filtering by status, source, and score
- Lead statistics (total leads, average score)
- Add/edit lead forms with validation
- Zod schema validation
- Seed endpoint for demo data
- ✅ **Lead Scoring Engine** - Configurable rules-based scoring system
  - Source-based scoring with customizable weights (manual, import, scrape, referral, partner)
  - Recency scoring (newer leads valued higher with decay over time)
  - URL quality scoring (custom domains, HTTPS, professional TLDs)
  - Company name presence scoring
  - Scoring breakdown and transparency features
- ✅ **AI-Powered Intelligence** - OpenAI GPT-4o-mini lead analysis
  - Company size and industry classification
  - Estimated revenue and funding status
  - Qualification level (high/medium/low) with reasoning
  - Technology stack detection
  - Risk factors and opportunities identification
  - Recommended sales actions
  - Intelligence-boosted scoring combining base + AI insights
  - Caching and telemetry integration

**Next Steps:**
1. **UI Integration for Scoring & Intelligence**
   - Add scoring breakdown display in lead detail view
   - Show AI intelligence insights in UI
   - Add "Analyze Lead" button to trigger intelligence analysis
   - Display qualification level badges and visual indicators
   - Show recommended actions in lead cards

2. **Lead Enrichment**
   - Integrate email finding APIs (Hunter.io, Apollo)
   - Add company data enrichment (Clearbit, FullContact)
   - Implement social profile discovery
   - Add contact information validation
   - Build automated enrichment workflow with scheduled jobs

3. **Data Import/Export**
   - Implement CSV import with field mapping
   - Add CSV export with filters
   - Create bulk upload from URLs/lists
   - Add integration with LinkedIn Sales Navigator
   - Build import from CRM systems (HubSpot, Salesforce)

4. **Web Scraping & Discovery**
   - Build web scraping engine for lead discovery
   - Add Google/Bing search integration for prospecting
   - Implement competitor analysis scraping
   - Create custom scraping rules builder
   - Add LinkedIn company discovery

5. **Campaign Integration**
   - Connect to Outreach app for campaign targeting
   - Add "Send to Campaign" functionality
   - Build lead list exports for outreach
   - Create segmentation for targeted campaigns
   - Add campaign performance tracking back to leads

6. **Advanced Features**
   - Build lead deduplication system
   - Add lead lifecycle tracking (new → qualified → customer)
   - Implement lead assignment to team members
   - Create lead activity timeline
   - Add notes and collaboration on leads
   - Build lead recommendations engine

---

#### 🟡 Outreach (Port 4025)
**Status:** Functional - Complete UI + campaign management, needs email sending & storage
**Description:** Outreach campaign management and automation

**Current State:**
- Complete REST API with campaign CRUD
- Full web UI for campaign management
- Message template system with variable substitution ({{business_name}}, {{domain}}, {{pain_point}}, {{industry}})
- Audience filtering by industry, score range, tags
- Template compilation and preview
- Campaign message preview showing personalized messages
- Mock lead provider for testing
- ⚠️ **In-memory campaign storage** (data not persisted - lost on restart)

**Next Steps:**
1. **Email Service Integration**
   - Integrate email service provider (SendGrid, AWS SES, Postmark)
   - Implement actual email sending functionality
   - Add email queue with rate limiting
   - Build email delivery tracking
   - Add bounce and complaint handling
   - Implement email warmup system

2. **Data Persistence**
   - Migrate from in-memory to @sb/storage
   - Add campaign execution history storage
   - Store sent messages and delivery status
   - Implement campaign analytics data storage
   - Add persistent campaign schedules

3. **Template Builder**
   - Build rich text WYSIWYG email editor
   - Add pre-built template library
   - Create template preview with live variable substitution
   - Implement HTML email templates
   - Add plain text fallback generation
   - Build template versioning system

4. **Campaign Scheduling & Automation**
   - Implement campaign scheduling (send now, schedule, recurring)
   - Add drip campaign sequences
   - Build follow-up automation rules
   - Create trigger-based campaigns
   - Add send time optimization (best time to send)
   - Implement campaign pausing and resuming

5. **Analytics & Tracking**
   - Add email open tracking
   - Implement click tracking with link wrapping
   - Build reply detection and tracking
   - Create campaign analytics dashboard
   - Add A/B testing framework
   - Generate campaign performance reports

6. **Contact & Lead Integration**
   - Connect to LeadScout for lead import
   - Build contact list management
   - Add contact segmentation
   - Implement contact import from CSV
   - Add contact deduplication
   - Create contact tagging system

7. **Advanced Features**
   - Add Loom video integration for personalized videos
   - Implement AI-powered subject line generation
   - Build email warmup and deliverability monitoring
   - Add unsubscribe management
   - Create email validation and verification
   - Implement sender reputation monitoring

---

### Early Stage Apps

#### 🟡 SiteForge (Port 4024)
**Status:** Basic - UI + persistent storage, needs generation pipeline
**Description:** Website generation and management platform

**Current State:**
- Complete REST API with project CRUD
- Persistent storage using @sb/storage (ProjectRepository, GenerationJobRepository)
- Full web UI for project management
- Project creation with business details (name, domain, niche, notes)
- Project status tracking (draft, queued, generating, complete, failed)
- Project statistics dashboard
- Generation job queue system (skeleton)
- Generation job endpoint (queued, not implemented)

**Next Steps:**
1. **Website Generation Pipeline**
   - Implement actual website generation engine
   - Build AI-powered content generation (copy, images)
   - Create page structure generator based on niche
   - Add component library for common sections
   - Implement responsive design generation
   - Add SEO optimization (meta tags, structure)

2. **Template System**
   - Build template library (React, Next.js, static HTML, WordPress)
   - Create industry-specific templates (SaaS, E-commerce, Portfolio, etc.)
   - Add template customization engine
   - Implement theme system (colors, fonts, layout)
   - Build template preview functionality
   - Add template versioning

3. **Visual Builder**
   - Create drag-and-drop page builder
   - Add component palette (hero, features, pricing, testimonials)
   - Implement real-time preview
   - Build section customization (text, images, styles)
   - Add undo/redo functionality
   - Create mobile responsive preview

4. **Deployment & Hosting**
   - Integrate with Vercel for deployment
   - Add Netlify deployment option
   - Implement static file hosting (S3, Cloudflare)
   - Build preview/staging environments
   - Add production deployment workflow
   - Implement rollback functionality

5. **Asset Management**
   - Build asset upload system (images, videos, files)
   - Add image optimization and CDN
   - Implement stock photo integration (Unsplash, Pexels)
   - Create favicon generator
   - Add logo upload and management
   - Build media library

6. **Domain & DNS**
   - Add custom domain configuration
   - Implement DNS management
   - Add SSL certificate provisioning
   - Build domain verification workflow
   - Add subdomain support
   - Create domain health monitoring

7. **Advanced Features**
   - Implement multi-page site generation
   - Add blog/CMS functionality
   - Build contact form generation
   - Add analytics integration (Google Analytics, Plausible)
   - Implement A/B testing for landing pages
   - Create performance optimization (lazy loading, minification)

---

#### 🔴 Demoapp
**Status:** Placeholder - No functionality
**Description:** Purpose undefined - needs definition or removal

**Current State:**
- Minimal package.json
- Single index.ts with console.log only
- Empty README template

**Next Steps:**
1. **Define Purpose**
   - Determine if this app is needed or should be removed
   - If keeping, define clear purpose and use case
   - Update package.json with proper metadata

2. **Potential Use Cases** (if keeping):
   - Demo/sandbox app for testing suite features
   - Example app for documentation/tutorials
   - Template app for creating new suite apps
   - Integration testing playground

3. **Implementation** (if purpose defined):
   - Implement core functionality based on defined purpose
   - Add proper README with documentation
   - Create example code and usage patterns
   - Add to suite registry with proper metadata

---

## Suite Status Summary

**🟢 Fully Functional (Production-Ready):** Questboard, Catalog, Console, Worker, LeadScout
**🟡 Basic/Functional (Needs Core Features):** Outreach, SiteForge
**🔴 Placeholder/Early Stage:** Demoapp

### Data Persistence Status

**Apps with Persistent Storage (@sb/storage):**
- ✅ Questboard (14+ entity kinds)
- ✅ Catalog (products, carts, orders, lookbooks)
- ✅ LeadScout (leads)
- ✅ SiteForge (projects, generation jobs)
- ✅ Worker (job summaries)

**Apps with In-Memory Storage:**
- ⚠️ Console (team data is mock/in-memory)
- ⚠️ Outreach (campaigns not persisted - lost on restart)

### Progress Since Last Update
- ✅ **LeadScout**: Implemented lead scoring engine with configurable rules-based scoring (source, recency, URL quality, company name)
- ✅ **LeadScout**: Added AI-powered intelligence service using GPT-4o-mini for lead analysis, qualification, and recommendations
- ✅ **LeadScout**: Intelligence-boosted scoring combines base score with AI insights for better lead prioritization
- ✅ **Questboard**: Added comprehensive test suite with 48 passing tests (31 schema tests + 17 AI function tests) using Vitest
- ✅ **Questboard**: Set up monorepo-wide Vitest workspace configuration for testing framework
- ✅ **Catalog**: Implemented complete customer storefront UI with product browsing, search, cart, checkout, and order tracking
- ✅ **Catalog**: Mobile-optimized responsive design with modern UI and smooth animations

**Previous Updates:**
- ✅ **Worker**: Production-ready with full cron scheduling system - daemon mode, YAML configuration, timezone support, automated job execution
- ✅ **Catalog**: Complete e-commerce platform - shopping cart, order management, checkout flow, batch upload, CSV import/export
- ✅ **Catalog**: Comprehensive admin UI with product management dashboard, drag-and-drop uploads, AI feature integration
- ✅ **LeadScout**: Upgraded to fully functional - persistent storage (@sb/storage) and complete UI
- ✅ **Outreach**: Complete campaign management UI with message preview
- ✅ **SiteForge**: Persistent storage (@sb/storage) and complete project management UI

### Critical Next Steps for Suite Completeness

**Priority 1 - Core Functionality:**
1. **Catalog Payment Integration**: Integrate Stripe/PayPal for payment processing and connect to checkout UI (e-commerce foundation is complete)
2. **Outreach Email Integration**: Integrate email service provider (SendGrid/AWS SES) for actual email sending
3. **Outreach Persistence**: Migrate Outreach from in-memory to @sb/storage
4. **SiteForge Generation Pipeline**: Implement actual website generation engine with templates
5. **LeadScout UI Integration**: Add scoring breakdown and AI intelligence insights display in lead management UI

**Priority 2 - Integration & Automation:**
6. Create LeadScout → Outreach integration flow (lead to campaign)
7. Build job monitoring dashboard in Console
8. Add lead enrichment job for automated data enhancement (integrate with Worker)
9. Add real-time updates (WebSocket/SSE) to Console and Questboard

**Priority 3 - Authentication & Security:**
10. Add authentication/authorization across all apps
11. Implement API key management and app-to-app security
12. Add role-based access control for multi-user support

**Priority 4 - Quality & Reliability:**
13. ✅ ~~Add comprehensive testing for Questboard~~ **COMPLETED** - expand to other apps (unit, integration, E2E)
14. Implement error handling and monitoring across all apps
15. Add data backup and recovery systems
16. Build CI/CD pipelines with automated testing

**Priority 5 - User Experience:**
17. Build semantic search UI for Catalog to leverage vector embeddings
18. Improve mobile responsiveness across all UIs (Questboard, Console, Admin dashboards)
19. Add onboarding flows and in-app documentation
20. Implement user analytics and tracking

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


