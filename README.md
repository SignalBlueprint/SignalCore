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
  auth/            # JWT-based authentication and authorization
  rbac/            # Role-based access control
  notify/          # Notification system
  integrations-github/  # GitHub integration utilities

docs/              # Documentation
.github/           # GitHub workflows and templates
```

## Suite Apps

Each app has its own detailed README with comprehensive documentation. Click the app name to view full details.

### Production-Ready Apps

#### 🟢 [Questboard](apps/questboard/README.md) (Port 3000/5173)
**Status:** Fully Functional - Most mature app in the suite
**Description:** Questline task system with Working Genius team assignment and daily Questmaster orchestration

**Key Features:**
- Complete Express.js REST API with comprehensive endpoints
- Full React frontend with 9 page components (Today, Sprint, Goals, Team, Analytics, etc.)
- Analytics Dashboard with task/goal/quest statistics
- Hierarchical goal/questline/quest/task system
- AI-powered sprint planning with plan generation and comparison
- Progressive Web App (PWA) with offline support
- Comprehensive test suite (48 tests passing)

**See [Questboard README](apps/questboard/README.md) for complete documentation, API endpoints, and development guide.**

---

#### 🟢 [Catalog](apps/catalog/README.md) (Port 4023)
**Status:** Production Ready - Complete e-commerce platform with AI
**Description:** Full-featured product catalog and e-commerce platform with AI-powered management, shopping cart, and order processing

**Key Features:**
- Complete Express.js server with full CRUD operations
- Comprehensive admin web UI with product management dashboard
- AI-powered image analysis (GPT-4o Vision), description generation, and DALL-E 3 clean shots
- Vector embeddings for semantic search and product recommendations
- Shopping cart with session management
- Complete order processing workflow and customer storefront UI
- Analytics & Insights Dashboard with product performance, inventory analytics, and sales forecasting
- Lookbook & Collections system for visual merchandising
- CSV import/export for bulk data management

**See [Catalog README](apps/catalog/README.md) for complete documentation, API reference, and CATALOG_GUIDE.**

---

#### 🟢 [Console](apps/console/README.md) (Port 4000)
**Status:** Fully Functional - Admin hub with UI
**Description:** Unified admin console for suite management

**Key Features:**
- Complete Express.js API with frontend SPA
- Real-time health checks for all suite apps
- Event log aggregation (last 200 events)
- AI telemetry tracking (calls, costs, cache hits)
- Team member profiles with Working Genius (mock in-memory data)
- Dashboard statistics and metrics
- Active quests integration with Questboard

**See [Console README](apps/console/README.md) for complete documentation and API endpoints.**

---

#### 🟢 [Worker](apps/worker/README.md) (CLI Job Runner & Scheduler)
**Status:** Production Ready - Full scheduling system with 4 implemented jobs
**Description:** CLI-based job runner with automatic cron scheduling

**Key Features:**
- Cron Scheduler with automated job execution
- Daemon Mode running continuously
- YAML Configuration with simple scheduler.yaml
- Timezone support and manual execution
- Job Registry with extensible system
- Event publishing for integration
- 4 implemented jobs: daily.questmaster, weekly.sprintplanner, github.sync, daily.questmaster.dryrun

**See [Worker README](apps/worker/README.md) for detailed documentation, job creation guide, and deployment instructions.**

---

### Basic/Functional Apps

#### 🟢 [LeadScout](apps/leadscout/README.md) (Port 4021)
**Status:** Fully Functional - Complete API + UI with AI-powered scoring and intelligence
**Description:** Lead discovery and qualification system with automatic scoring and AI analysis

**Key Features:**
- Complete REST API with CRUD operations
- Persistent storage using @sb/storage
- Full web UI with lead management dashboard
- Lead Scoring Engine with configurable rules-based scoring
- AI-Powered Intelligence using OpenAI GPT-4o-mini
- Scoring Breakdown UI with visual indicators
- Intelligence-boosted scoring combining base + AI insights

**See [LeadScout README](apps/leadscout/README.md) for complete documentation and API reference.**

---

#### 🟢 [Outreach](apps/outreach/README.md) (Port 4025)
**Status:** Functional - Complete UI + campaign management with persistence, needs email sending
**Description:** Outreach campaign management and automation

**Key Features:**
- Complete REST API with campaign CRUD
- Persistent storage using @sb/storage
- Full web UI for campaign management
- Message template system with variable substitution
- Audience filtering by industry, score range, tags
- Template compilation and preview
- Campaign message preview

**See [Outreach README](apps/outreach/README.md) for complete documentation and API reference.**

---

### Early Stage Apps

#### 🟡 [SiteForge](apps/siteforge/README.md) (Port 4024)
**Status:** Basic - UI + persistent storage, needs generation pipeline
**Description:** Website generation and management platform

**Key Features:**
- Complete REST API with project CRUD
- Persistent storage using @sb/storage
- Full web UI for project management
- Project status tracking (draft, queued, generating, complete, failed)
- Generation job queue system (skeleton)

**See [SiteForge README](apps/siteforge/README.md) for complete documentation and roadmap.**

---

#### 🔴 [Demoapp](apps/demoapp/README.md)
**Status:** Placeholder - No functionality
**Description:** Purpose undefined - needs definition or removal

**Current State:** Minimal implementation with no defined purpose.

**See [Demoapp README](apps/demoapp/README.md) for potential use cases and decision points.**

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
- ✅ Outreach (campaigns)
- ✅ SiteForge (projects, generation jobs)
- ✅ Worker (job summaries)

**Apps with In-Memory Storage:**
- ⚠️ Console (team data is mock/in-memory)

## Current Status & Analysis

**Last Updated:** December 31, 2025

### Executive Summary

The Signal Blueprint suite has reached **significant maturity** with 5 production-ready applications and a robust foundation of shared packages. The suite demonstrates strong architectural consistency with comprehensive authentication, persistent storage across all major apps, AI-powered features, and growing mobile-first UX improvements.

**Suite Health Score: 7.5/10**
- ✅ Core Infrastructure: Excellent (9/10)
- ✅ App Functionality: Strong (8/10)
- ⚠️ Integration & Automation: Good (6/10)
- ⚠️ Production Readiness: Moderate (7/10)

### Key Metrics

- **Total Apps:** 8 (5 production-ready, 2 functional, 1 placeholder)
- **Shared Packages:** 15+ packages providing suite-wide utilities
- **Test Coverage:** 48 tests in Questboard, expanding to other apps
- **Authentication:** JWT-based system implemented, needs frontend rollout
- **Storage:** All major apps using persistent @sb/storage
- **AI Integration:** 4 apps with OpenAI integration (Questboard, Catalog, LeadScout, Outreach)

### Recent Achievements (Last 2 Weeks)

- ✅ **Catalog Analytics & Insights** (Dec 31) - NEW! #38
  - Comprehensive analytics dashboard with product views, conversions, revenue tracking
  - Product performance metrics and recommendations
  - Low stock alerts and inventory analytics
  - Sales forecasting and trend analysis
  - AI usage cost tracking and ROI metrics
  - Customer behavior insights and conversion funnels
  - 656 lines of analytics engine + database schema

- ✅ **Questboard Mobile & UX Enhancements** (Dec 31) - NEW! #37
  - Progressive Web App (PWA) with service worker and offline support
  - Mobile-responsive navigation with hamburger menu
  - Touch-optimized interactions and gestures
  - Improved loading states with spinner component
  - Enhanced mobile layouts across all pages
  - Installation prompt for native-like experience
  - Performance optimizations for mobile devices

- ✅ **Authentication System** (Dec 2025) #35, #36
  - Created `@sb/auth` package with JWT utilities, password hashing, and Express middleware
  - Added authentication endpoints to Console (signup, login, refresh, logout, me)
  - Created users table with RLS policies in Supabase
  - Multi-tenant support with org_id in JWT claims
  - Role-based access control (owner, admin, member)
  - Service account token support for background jobs
  - Password validation with complexity requirements
  - Token rotation for enhanced security

- ✅ **LeadScout Enhancements** #32
  - Scoring breakdown display to UI with visual progress bars for each scoring factor
  - AI-powered intelligence service using GPT-4o-mini for lead analysis
  - Intelligence-boosted scoring combines base score with AI insights

- ✅ **Outreach Persistence** #32
  - Migrated from in-memory to persistent storage using @sb/storage

- ✅ **Catalog Features** #30, #29
  - Complete lookbook and collections UI with visual management
  - Enhanced semantic search UI leveraging vector embeddings
  - Similar products recommendations and visual similarity search
  - Customer storefront UI with cart, checkout, and order tracking
  - Mobile-optimized responsive design

- ✅ **Questboard Testing**
  - Comprehensive test suite with 48 passing tests (31 schema + 17 AI function tests)
  - Monorepo-wide Vitest workspace configuration

**Earlier Major Updates:**
- ✅ **Worker**: Production-ready with full cron scheduling system
- ✅ **Catalog**: Complete e-commerce platform with shopping cart and order management
- ✅ **LeadScout**: Upgraded to fully functional with persistent storage and complete UI
- ✅ **SiteForge**: Persistent storage and complete project management UI

### Strategic Analysis & Gaps

**Strengths:**
- 🎯 **Strong Foundation**: 5 production-ready apps with full CRUD, persistence, and UIs
- 🔐 **Security**: Comprehensive JWT-based authentication system implemented
- 🤖 **AI Integration**: 4 apps using OpenAI for intelligent features (Questboard, Catalog, LeadScout, Outreach)
- 📊 **Data Persistence**: All major apps using @sb/storage abstraction layer
- 🧪 **Testing Culture**: Vitest framework established with 48 tests in Questboard
- 📱 **Mobile-First**: PWA implementation in Questboard, mobile UX improvements rolling out
- 📦 **Modular Architecture**: 15+ shared packages enable code reuse and consistency
- 🔄 **Automation**: Worker app provides robust job scheduling for all apps

**Weaknesses & Gaps:**
- ⚠️ **Payment Processing**: Catalog e-commerce missing payment gateway (critical gap for revenue)
- ⚠️ **Email Delivery**: Outreach campaigns cannot send emails yet (core functionality missing)
- ⚠️ **Website Generation**: SiteForge has no generation engine (app is incomplete)
- ⚠️ **Auth Rollout**: Backend auth complete but not integrated into app frontends
- ⚠️ **Monitoring**: No centralized error tracking or performance monitoring
- ⚠️ **Testing Coverage**: Only Questboard has comprehensive tests (needs expansion)
- ⚠️ **Real-time Features**: No WebSocket/SSE for live updates
- ⚠️ **Inter-app Integration**: Apps are isolated, no workflows connecting them

**Opportunities:**
- 💡 **App Workflows**: Connect LeadScout → Outreach → Catalog for complete sales funnel
- 💡 **Unified Analytics**: Centralize metrics from all apps into Console dashboard
- 💡 **AI Expansion**: Leverage existing AI infrastructure for more intelligent features
- 💡 **Mobile Suite**: Extend PWA implementation across all apps
- 💡 **Marketplace Ready**: With payments, several apps could be monetized (Catalog, SiteForge)
- 💡 **API Platform**: Expose APIs for third-party integrations

**Threats & Risks:**
- 🚨 **Production Blockers**: Missing payments and email sending prevent real-world usage
- 🚨 **Security Gaps**: Auth not enforced on frontends creates exposure
- 🚨 **Data Loss Risk**: No backup/recovery system implemented
- 🚨 **Quality Concerns**: Limited test coverage could lead to regressions
- 🚨 **Performance Unknown**: No monitoring means performance issues may go undetected
- 🚨 **Demoapp Confusion**: Placeholder app with no clear purpose adds confusion

---

## Comprehensive Roadmap: Next 30-90 Days

### 🔥 CRITICAL PATH (Weeks 1-2) - Remove Production Blockers

**Goal:** Make Catalog and Outreach production-ready for real customers

1. **Catalog Payment Integration** 🚀 HIGHEST PRIORITY
   - Week 1: Integrate Stripe checkout (3-4 days)
     - Add Stripe SDK and API keys configuration
     - Create payment intent endpoint
     - Build payment form component
     - Add payment confirmation flow
   - Week 1-2: Add PayPal option (2-3 days)
     - Integrate PayPal SDK
     - Add PayPal button to checkout
   - Week 2: Payment webhooks and reconciliation (2 days)
     - Handle payment.succeeded webhook
     - Update order status on payment
     - Build payment reconciliation dashboard
   - **Success Criteria:** Customers can complete purchases with real payments

2. **Outreach Email Service Integration** 🚀 HIGHEST PRIORITY
   - Week 1: Choose and integrate email provider (2-3 days)
     - Evaluate SendGrid vs AWS SES vs Postmark
     - Set up API credentials and domain verification
     - Create email sending service in @sb/notify
   - Week 2: Campaign execution (3-4 days)
     - Build email queue with rate limiting
     - Implement campaign sending job (integrate with Worker)
     - Add email delivery tracking
     - Handle bounces and complaints
   - **Success Criteria:** Campaigns can send real emails to recipients

3. **LeadScout AI Intelligence UI** 📊 HIGH PRIORITY
   - Week 2: Display AI insights in lead detail view (2-3 days)
     - Add "Analyze Lead" button
     - Show qualification level badges
     - Display recommended actions and risk factors
     - Show technology stack and company insights
   - **Success Criteria:** Users can see and act on AI-powered lead intelligence

### 🛡️ SECURITY & AUTH (Weeks 2-4) - Secure the Suite

**Goal:** Roll out authentication to all apps and secure data access

4. **Backend Auth Enforcement** (Week 2-3: 3-4 days)
   - Apply `requireAuth` middleware to all API routes
   - Apps: Questboard, LeadScout, SiteForge, Catalog, Outreach
   - Add service token support for Worker jobs
   - Test multi-tenant data isolation

5. **Frontend Auth Integration** (Week 3-4: 5-7 days)
   - Create shared login/signup components (@sb/ui)
   - Add auth state management (React Context/Zustand)
   - Update API clients to include JWT tokens
   - Build org switcher for multi-org users
   - Add session management UI

6. **Auth Testing & Security Hardening** (Week 4: 2-3 days)
   - Test multi-tenant isolation thoroughly
   - Add rate limiting to auth endpoints
   - Implement password reset flow
   - Add account security settings (2FA planning)

### 🔧 CORE FUNCTIONALITY (Weeks 3-6) - Complete App Features

**Goal:** Finish incomplete features and make all apps fully functional

7. **SiteForge Generation Pipeline** (Weeks 3-5: 10-12 days)
   - Week 3-4: Build generation engine (6-7 days)
     - Create AI content generation for pages
     - Build page structure generator
     - Add component library (hero, features, pricing, etc.)
     - Implement responsive design generation
   - Week 4-5: Template system (4-5 days)
     - Create 3-5 industry-specific templates
     - Add template customization engine
     - Build preview functionality
   - **Success Criteria:** Users can generate complete websites from business details

8. **Console Data Persistence** (Week 5: 2-3 days)
   - Migrate team data from in-memory to @sb/storage
   - Add settings/configuration persistence
   - Implement user preferences storage

9. **Catalog Product Variants** (Week 6: 4-5 days)
   - Implement size/color/style variants
   - Add variant-specific inventory tracking
   - Update UI for variant selection
   - **Benefit:** Enables fashion/apparel e-commerce use cases

### 🔗 INTEGRATION & AUTOMATION (Weeks 5-8) - Connect the Suite

**Goal:** Create workflows that span multiple apps

10. **LeadScout → Outreach Integration** (Week 5-6: 4-5 days)
    - Add "Send to Campaign" button in LeadScout
    - Create campaign from lead list
    - Build lead segmentation for targeting
    - Track campaign performance back to leads
    - **Benefit:** Complete sales funnel from discovery to outreach

11. **Worker Job Monitoring Dashboard** (Week 6-7: 5-6 days)
    - Build job execution history UI in Console
    - Add real-time job status monitoring
    - Create job performance metrics (duration, success rate)
    - Add job failure alerts
    - **Benefit:** Visibility into automated processes

12. **Lead Enrichment Automation** (Week 7: 3-4 days)
    - Create scheduled job for lead enrichment
    - Integrate with Hunter.io or Apollo for email finding
    - Add company data enrichment
    - **Benefit:** Automated lead qualification and data enhancement

13. **Real-time Updates (WebSocket/SSE)** (Week 8: 5-6 days)
    - Add WebSocket server to Console
    - Implement real-time event broadcasting
    - Update Questboard for live task updates
    - Add live notifications for key events
    - **Benefit:** Collaborative features and instant feedback

### 🧪 QUALITY & RELIABILITY (Weeks 6-10) - Production Hardening

**Goal:** Ensure suite is reliable, tested, and monitorable

14. **Expand Test Coverage** (Weeks 6-9: 8-10 days spread across weeks)
    - Week 6: Catalog tests (2-3 days)
    - Week 7: LeadScout tests (2 days)
    - Week 8: Outreach tests (2 days)
    - Week 9: Console & Worker tests (2-3 days)
    - Target: 70%+ code coverage for all apps
    - Add integration tests for critical flows

15. **Error Handling & Monitoring** (Week 9: 4-5 days)
    - Integrate Sentry or similar for error tracking
    - Add structured logging across all apps
    - Create error boundaries in React apps
    - Build error dashboard in Console
    - Set up alerting for critical errors

16. **Data Backup & Recovery** (Week 10: 3-4 days)
    - Implement automated Supabase backups
    - Create data export functionality
    - Build restore/rollback system
    - Test disaster recovery procedures

17. **CI/CD Pipeline** (Week 10: 3-4 days)
    - Set up GitHub Actions workflows
    - Automated testing on PR
    - Automated deployment to staging
    - Production deployment with approval gates

### 📱 USER EXPERIENCE (Weeks 8-12) - Polish & Delight

**Goal:** Create exceptional user experience across all apps

18. **Mobile PWA Rollout** (Weeks 8-10: 6-8 days)
    - Week 8: Catalog PWA (2-3 days)
    - Week 9: Console & LeadScout PWA (2-3 days)
    - Week 10: Outreach & SiteForge PWA (2 days)
    - Add offline support and caching
    - Implement installation prompts

19. **Dark Mode Support** (Week 11: 4-5 days)
    - Create theme system in @sb/ui
    - Add dark mode to all apps
    - Implement theme switcher
    - Store theme preference

20. **Onboarding & Documentation** (Week 11-12: 5-6 days)
    - Create interactive onboarding flows
    - Add in-app tooltips and guides
    - Build video tutorials for key features
    - Write comprehensive user documentation

21. **Analytics & User Tracking** (Week 12: 3-4 days)
    - Integrate PostHog or Mixpanel
    - Add event tracking for key actions
    - Build usage analytics dashboard
    - Set up conversion funnels

### 🎯 STRATEGIC INITIATIVES (Weeks 8-12+) - Future Growth

**Goal:** Position suite for scale and market fit

22. **Unified Analytics Dashboard** (Week 8-9: 5-6 days)
    - Centralize metrics from all apps in Console
    - Build cross-app analytics views
    - Add suite-wide KPI tracking
    - Create executive summary dashboard

23. **API Platform & Documentation** (Week 10-11: 5-6 days)
    - Document all API endpoints with OpenAPI/Swagger
    - Create API keys and authentication for external access
    - Build API usage tracking and rate limiting
    - Publish API documentation site

24. **Marketplace Preparation** (Week 12+)
    - Add subscription/billing for SiteForge
    - Create pricing tiers for Catalog
    - Build usage-based billing for API access
    - Add affiliate/referral system

25. **Demoapp Decision** (Week 8: 1 day)
    - Determine purpose or remove
    - Options: Keep as template app, convert to integration testing, or delete
    - Update documentation accordingly

---

## Success Metrics & Milestones

### 30-Day Milestone (End of Week 4)
- ✅ Catalog accepts real payments (Stripe + PayPal)
- ✅ Outreach sends real email campaigns
- ✅ All apps have authentication enforced (backend + frontend)
- ✅ LeadScout shows AI intelligence insights
- ✅ SiteForge generation pipeline 50% complete

### 60-Day Milestone (End of Week 8)
- ✅ SiteForge generates complete websites
- ✅ LeadScout → Outreach integration live
- ✅ Worker job monitoring dashboard complete
- ✅ Real-time updates in Console and Questboard
- ✅ Test coverage > 50% across all apps
- ✅ PWA enabled for 3+ apps

### 90-Day Milestone (End of Week 12)
- ✅ All 7 functional apps production-ready
- ✅ Test coverage > 70% with CI/CD
- ✅ Error monitoring and alerting active
- ✅ Data backup and recovery tested
- ✅ All apps have PWA support
- ✅ Dark mode across entire suite
- ✅ Onboarding flows and documentation complete
- ✅ API platform documented and accessible

### Key Performance Indicators (KPIs)
- **Reliability**: 99.5% uptime for all apps
- **Performance**: < 2s page load times
- **Quality**: < 5 critical bugs per month
- **Testing**: 70%+ code coverage
- **Security**: Zero auth bypass vulnerabilities
- **User Experience**: < 3 clicks to complete key tasks

---

## Immediate Actions (This Week)

1. **Start Catalog Payment Integration** (Day 1-2)
   - Set up Stripe account and API keys
   - Begin Stripe SDK integration

2. **Start Outreach Email Service Selection** (Day 1-2)
   - Evaluate SendGrid vs AWS SES
   - Set up trial account and test sending

3. **Plan SiteForge Generation Architecture** (Day 3)
   - Design generation pipeline
   - Choose AI models and prompts
   - Sketch template structure

4. **Add LeadScout Intelligence UI** (Day 4-5)
   - Create intelligence display components
   - Wire up to existing backend API

**By end of this week:** 2-3 critical gaps closed, clear momentum toward production readiness

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
- [Authentication Strategy](./docs/AUTHENTICATION_STRATEGY.md) - JWT-based authentication architecture
- [Jobs System](./docs/JOBS.md) - How to add and run scheduled jobs

## Architecture Principles

- **App Independence**: Apps cannot import from other apps
- **Package Sharing**: Apps import shared code from `@sb/*` packages
- **Schema-First**: Data contracts defined in `@sb/schemas`
- **Event-Driven**: Inter-app communication via events (future)


