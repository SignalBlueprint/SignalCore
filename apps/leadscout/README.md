# LeadScout

## TL;DR
Lead discovery and qualification system with configurable scoring engine and AI-powered intelligence. Production-ready with persistent storage and full web UI.

## Product Goal
- Automate lead discovery by aggregating data from multiple sources
- Apply intelligent scoring to rank leads by fit and engagement potential
- Use AI to analyze companies and provide qualification insights
- Enable sales teams to focus on high-value prospects

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Complete CRUD**: Leads persist to Supabase via @sb/storage
- **Scoring engine**: Configurable rules (source, recency, URL quality, company name)
- **AI intelligence (backend)**: GPT-4o-mini analyzes company size, industry, tech stack, risks, opportunities
- **AI intelligence UI**: Full frontend display with analyze button, qualification badges, insights panels, risk/opportunity analysis
- **Web UI**: Lead management dashboard with filtering and statistics
- **Scoring breakdown UI**: Visual progress bars showing score factors
- **Intelligence-boosted scoring**: Combines base score with AI insights
- **Lead detail modal**: Comprehensive view with company insights, tech stack, recommended actions

### 🟡 Partial (Works but Incomplete)
- **No LeadScout→Outreach workflow**: Can't send leads to campaigns yet

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **No lead enrichment**: Missing email finding, company data lookup
- **No import/export**: Can't bulk import CSVs or export to CRM
- **No deduplication**: Same company can appear multiple times

## How to Run

### Install
```bash
pnpm install
```

### Dev
```bash
pnpm --filter leadscout dev
```

### Test
```bash
# No tests yet
pnpm --filter leadscout test
```

### Build
```bash
pnpm --filter leadscout build
```

### Env Vars
Required in root `.env`:
- `OPENAI_API_KEY` - For AI intelligence features
- `DATABASE_URL` - Supabase connection

### URLs/Ports
- **LeadScout**: http://localhost:4021

## Architecture (Short)

### Stack
- **Backend**: Express.js REST API (TypeScript)
- **Frontend**: Static HTML/CSS/JavaScript
- **Storage**: Supabase via @sb/storage (StorageLeadRepository)
- **AI**: OpenAI GPT-4o-mini for lead intelligence
- **Validation**: Zod schemas from @sb/schemas

### Key Modules
- `src/server.ts` - Express API server
- `src/routes.ts` - Lead CRUD + scoring + intelligence endpoints
- `src/scoring-engine.ts` - Configurable rules-based scoring
- `src/ai-intelligence.ts` - AI lead analysis service
- `web/` - Static frontend files

### Data Flow
- Frontend → API → StorageLeadRepository → Supabase
- Scoring triggered on create/update → calculate score
- Intelligence endpoint → GPT-4o-mini → enriched lead data

## Known Issues

### No Lead Enrichment
- **Repro**: Add lead with domain → no email/company data fetched
- **Root cause**: No integration with Hunter.io/Apollo/Clearbit
- **Fix needed**: Add enrichment service + scheduled Worker job

### No CSV Import
- **Repro**: Have 1000 leads in CSV → can't bulk import
- **Root cause**: Import functionality not implemented
- **Fix needed**: Add CSV upload + parsing + bulk create endpoint

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| LS-1 | AI intelligence UI integration | P1 | DONE | `public/app.js`, `public/index.html` | **What**: Add "Analyze Lead" button and display AI insights in lead detail page<br>**Why**: Backend complete but invisible to users<br>**Where**: Lead detail view<br>**AC**: Click button → AI analyzes → show qualification, risks, tech stack, recommended actions with nice formatting | ✅ VERIFIED: UI already fully implemented with analyze button, qualification badges, insights panels, tech stack display, risk/opportunity analysis, and recommended actions. Updated README to reflect reality. Completed: 2026-01-02 |
| LS-2 | LeadScout→Outreach integration | P1 | TODO | `web/js/send-to-campaign.js`, `src/outreach-integration.ts` | **What**: Add "Send to Campaign" button that creates Outreach campaign<br>**Why**: Manual copy/paste to Outreach is tedious<br>**Where**: Lead list + detail view<br>**AC**: Select leads → click → campaign created in Outreach, leads marked "contacted" | |
| LS-3 | Lead enrichment with Hunter.io/Apollo | P2 | TODO | `src/enrichment-service.ts`, `src/jobs/enrich-leads.ts` | **What**: Integrate email finder + company data APIs<br>**Why**: Manual research is slow<br>**Where**: Enrichment service + Worker job<br>**AC**: Click "Enrich" → fetch email/company data, update lead, track API costs | |
| LS-4 | CSV import/export | P2 | TODO | `src/import.ts`, `web/import.html` | **What**: Bulk import leads from CSV, export filtered leads<br>**Why**: Can't move data in/out easily<br>**Where**: New import/export endpoints + UI<br>**AC**: Upload CSV → parse → create leads, export filtered leads to CSV download | |
| LS-5 | Lead deduplication | P2 | TODO | `src/deduplication.ts` | **What**: Detect duplicate leads by domain/company name<br>**Why**: Same company appears multiple times<br>**Where**: Dedup service + merge UI<br>**AC**: Auto-detect dupes on create, suggest merges, merge preserves best data | |
| LS-6 | Test suite for LeadScout | P1 | TODO | `__tests__/scoring.test.ts`, `__tests__/intelligence.test.ts` | **What**: Add tests for scoring engine + AI intelligence + CRUD<br>**Why**: No tests = high regression risk<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ coverage, test scoring rules, mock AI calls, test API endpoints | |
| LS-7 | Lead lifecycle tracking | P3 | TODO | `src/lifecycle.ts`, `web/js/lifecycle.js` | **What**: Track lead stages (new → qualified → customer)<br>**Why**: Don't know where leads are in funnel<br>**Where**: Lead schema + status field<br>**AC**: Leads have status, UI shows funnel view, conversion metrics calculated | |
| LS-8 | Lead assignment to team members | P3 | TODO | `src/assignment.ts`, `web/js/assign-lead.js` | **What**: Assign leads to specific team members<br>**Why**: Need ownership for follow-up<br>**Where**: Lead schema + assignment UI<br>**AC**: Assign lead → team member notified, "My Leads" filter works | |
| LS-9 | Activity timeline and notes | P3 | TODO | `src/activity.ts`, `web/js/activity.js` | **What**: Log lead interactions (calls, emails, meetings) with notes<br>**Why**: Need history of engagement<br>**Where**: Activity log table + timeline UI<br>**AC**: Add note → appears in timeline, filter by activity type | |
| LS-10 | Custom scoring rules UI | P3 | TODO | `web/scoring-config.html` | **What**: Configure scoring weights/rules in UI instead of code<br>**Why**: Scoring rules hardcoded in TypeScript<br>**Where**: New admin page for scoring config<br>**AC**: Edit weights, add custom rules, preview score changes, save to DB | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

```bash
# All tests pass (once written)
pnpm --filter leadscout test

# No TypeScript errors
pnpm --filter leadscout typecheck

# No linting errors
pnpm --filter leadscout lint

# Builds successfully
pnpm --filter leadscout build

# Manual smoke test:
# - Create lead → score calculated correctly
# - Analyze lead → AI intelligence returned
# - Filter leads → results correct
# - Lead persists after restart
```
