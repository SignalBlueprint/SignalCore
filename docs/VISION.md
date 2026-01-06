---
repo: SignalBlueprint/SignalCore
scan_date: 2026-01-06
status: draft
---

# Signal Blueprint Vision

## Foundation Read

Signal Blueprint is an AI-powered business automation suite—a monorepo of seven independent applications (task management, job scheduling, lead discovery, email campaigns, website generation, e-commerce, and e-reading) sharing eighteen packages of infrastructure (auth, storage, AI, events, jobs). The core loop is this: humans define goals and leads, AI generates plans and content, and an autonomous worker executes scheduled jobs across the suite. Today, it delivers value through Questboard's sprint planning, LeadScout's lead intelligence, SiteForge's website generation, and Catalog's AI-powered product photography—each functional end-to-end but operating in isolation.

## Architecture Snapshot

**Stack**
- Languages: TypeScript everywhere (Node.js/Express backends, React/Vite frontends)
- Frameworks: Turbo monorepo, Vitest for testing, Zod for schemas
- Services: OpenAI (GPT-4o, DALL-E 3, embeddings), Supabase (PostgreSQL + pgvector), SendGrid, Stripe

**Data**
- Primary: Supabase with auto snake_case/camelCase conversion
- Fallback: Local JSON in `.sb/data/` for offline/dev
- Search: Vector embeddings via pgvector (currently Catalog-only)
- Models: Goals, Tasks, Leads, Campaigns, Products, Books, Jobs, Events, Teams

**Patterns**
- Monorepo with hard boundaries (apps cannot import each other, only @sb/* packages)
- Repository pattern via @sb/storage for persistence abstraction
- Event-driven via @sb/events (200-event timeline per org)
- Multi-tenant from day one (org-scoped JWT auth)
- Schema-first design (Zod → TypeScript types)

**Gaps**
- No CI/CD pipeline (tests don't run on PRs)
- Uneven test coverage (3/7 apps tested)
- Auth frontend missing in 5/7 apps (backend complete)
- No cross-app workflows (apps isolated)
- No real-time updates (polling only)
- Package build broken (missing .d.ts files)

## Latent Potential

**Event System**: The @sb/events package publishes events to a timeline with 200-event retention—but nothing subscribes. This is infrastructure for trigger-based automation sitting dormant.

**Vector Search at Scale**: Catalog uses pgvector for semantic product search with embeddings. The same infrastructure could power: similar goals in Questboard, lead clustering in LeadScout, campaign targeting in Outreach, book recommendations in Lexome.

**Working Genius Profiles**: Questboard assigns tasks based on team members' Working Genius profiles (Wonder, Invention, Discernment, Galvanizing, Enablement, Tenacity). This same matching logic could route leads to ideal salespeople or match vendors to customer preferences.

**AI Telemetry Dashboard**: Every AI call is tracked (tokens, cost, cache hits) but only displayed in a basic Console view. This data could drive intelligent model selection, cost optimization, and usage forecasting.

**Job Queue for Autonomous Workflows**: Worker has sophisticated job scheduling (cron, priority queues, dependency chains, dead letter queue, alerting) but only six simple jobs. The infrastructure is ready for orchestrating complex multi-step automation across all apps.

---

## Horizon 1: Quick Wins (Days)

### 1. The "Morning Brief" Job

Picture this: Every morning at 7 AM, a Slack message lands in #leadership. It shows yesterday's Questboard completions, today's sprint priorities, any stalled tasks, plus a one-line AI summary: "Team is 70% through Q1 goals—shipping pressure on auth frontend." The data already exists in events and tasks. Worker already has Slack notification capability. This is stitching existing pieces into a ritual that makes the suite feel alive.

### 2. Lead-to-Campaign One-Click Flow

A LeadScout user qualifies a batch of leads—clicks "Create Campaign"—and lands directly in Outreach with a pre-configured campaign, recipients populated, and an AI-drafted email based on lead intelligence data. No CSV export, no copy-paste. The Outreach app already has LeadScout import endpoints; this makes the connection seamless and visible. Users suddenly see the apps as one system, not seven.

### 3. Goal Similarity Finder

When creating a new goal in Questboard, the system quietly computes an embedding and shows: "Similar past goals: 'Launch payment integration' (completed in 3 weeks), 'Add Stripe to catalog' (took 4 weeks)." Users get instant estimation context. The vector search infrastructure from Catalog is reusable; goals already have descriptions. This surfaces organizational memory at the moment of planning.

---

## Horizon 2: System Expansions (Weeks)

### 1. The Workflow Canvas

A visual editor in Console where you wire apps together: "When a lead scores > 80 in LeadScout, create a Questboard task AND queue an Outreach campaign AND notify #sales on Slack." Nodes represent apps/actions; edges represent triggers. Under the hood, this generates event subscriptions and Worker job chains. The event system and job queue already exist—this is the UI that makes automation accessible to non-developers.

### 2. Unified Intelligence Layer

Every AI response across the suite—sprint plans, lead intelligence, website copy, product descriptions, book annotations—flows through a new @sb/intelligence package that maintains organizational context. It remembers: "This org prefers formal tone," "They're in B2B manufacturing," "Previous campaigns emphasized reliability." The org context improvement plan (ROOT-10-18) is already designed; this accelerates it into production.

### 3. Mobile Command Center

A React Native app (or enhanced Questboard PWA) that surfaces the morning brief, allows quick task status updates, shows lead alerts, and displays store orders. No desktop required. Questboard already has PWA infrastructure. The API layer is uniform across apps. This makes Signal Blueprint usable from anywhere, turning it from a desk tool into a pocket assistant.

---

## Horizon 3: Blue Sky

### 1. The Autonomous Business Unit

Imagine a mode where Signal Blueprint runs with minimal human intervention. Worker orchestrates: LeadScout discovers and qualifies leads → Outreach nurtures them with drip campaigns → when a lead replies positively, a Questboard task is created for human follow-up → Catalog handles product inquiries → SiteForge maintains an always-current marketing site. Humans set strategy; the system executes tactics. The job queue, event system, and AI integration are 80% of the way there—this is the vision they were built for.

### 2. The App Factory

Signal Blueprint becomes a platform. "Describe an app you need in 3 sentences." The system scaffolds it using @sb/storage, @sb/auth, @sb/ai, and @sb/schemas. First run: a basic CRUD app with AI assistance. Users iterate on it like they would a SiteForge website—describing changes in natural language. The 18 shared packages become the building blocks of infinite vertical apps: CRM for real estate, inventory for restaurants, booking for salons.

---

## Moonshot

**The Organization Mind**

Signal Blueprint becomes the external memory and executive function of an entire company. It knows every goal ever set, every task ever completed, every lead contacted, every email sent, every product sold, every book chapter discussed. When you ask "What did we learn from last year's product launch?" it synthesizes across apps: sprint velocity from Questboard, campaign performance from Outreach, sales data from Catalog, even annotations from Lexome if you researched competitors there.

But it goes further: it notices patterns you don't. "Your team's velocity drops 30% after major releases—consider scheduling recovery sprints." "Leads from manufacturing respond 2x better to case study emails." "Your SiteForge sites with customer testimonials convert 40% higher."

This is organizational intelligence that compounds—an AI that doesn't just execute tasks but learns what makes your specific organization succeed, then proactively suggests adjustments. The telemetry, event timeline, and vector search infrastructure are the foundation. The org context improvement plan sketches the architecture. This moonshot is the full realization: an AI partner that knows your business as well as you do.

---

## Next Move

### Most Promising Idea

**The Workflow Canvas** (Horizon 2.1) is the highest-leverage investment. It transforms Signal Blueprint from "seven useful apps" into "one automation platform." The underlying infrastructure (events, jobs, notifications) already works—what's missing is the visual interface that makes non-developers powerful. Once users can wire apps together visually, they'll discover workflows nobody anticipated. It's also a clear differentiator: most business tools don't let you build your own automation without code.

### First Experiment (< 1 day)

Build a single hardcoded workflow to prove the pattern: when a lead reaches score 80+ in LeadScout, automatically create a Questboard task titled "Follow up with [Lead Name]" assigned to the sales genius. Implement as:
1. Add event publishing in LeadScout's lead update endpoint
2. Create a new Worker job that listens for lead-scored events
3. Have the job call Questboard's API to create the task

This validates: event propagation works, cross-app API calls work, job triggering works. It's the primitive the Workflow Canvas would generate automatically.

### One Question That Would Sharpen the Vision

**"What does a successful user's week look like?"**

Not features—behaviors. Does the COO check the morning brief while commuting? Does the sales rep get a push notification when a hot lead comes in? Does the marketer preview campaigns in Outreach then adjust copy in SiteForge? Understanding the rhythm of usage would reveal which integrations are urgent (daily touch) versus nice-to-have (weekly touch). It would also surface whether the vision is a "single pane of glass" dashboard or a "background automation with occasional intervention" system—two very different product directions.
