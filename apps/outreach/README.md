# Outreach

## TL;DR
Email campaign management with SendGrid integration, template personalization, and LeadScout integration. Production-ready with real email sending and delivery tracking.

## Product Goal
- Enable teams to create and execute email campaigns at scale
- Provide template personalization with variable substitution
- Target audiences with configurable filtering
- Track email delivery, opens, clicks, and bounces
- Integrate with LeadScout for lead→campaign workflow

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Campaign CRUD**: Campaigns persist to Supabase via @sb/storage
- **Template system**: Variable substitution (business_name, domain, AI insights from LeadScout, etc.)
- **Audience targeting**: Filter by industry, score range, tags
- **SendGrid email sending**: Real emails with rate limiting and queue management
- **Delivery tracking**: Webhooks for delivered, opened, clicked, bounced events
- **LeadScout integration**: Fetches leads from LeadScout API, marks as "contacted"
- **Campaign statistics**: Sent count, failed count, last sent date
- **Web UI**: Campaign management dashboard

### 🟡 Partial (Works but Incomplete)
- **Analytics UI**: Backend tracks metrics, no analytics dashboard yet
- **Template builder**: Plain text templates, no rich HTML editor

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **No analytics dashboard**: Can't see open/click rates in UI
- **No drip campaigns**: Can't schedule multi-step sequences
- **No A/B testing**: Can't test subject lines or content variants

## How to Run

### Install
```bash
pnpm install
```

### Dev
```bash
pnpm --filter outreach dev
```

### Test
```bash
# No tests yet
pnpm --filter outreach test
```

### Build
```bash
pnpm --filter outreach build
```

### Env Vars
Required in root `.env`:
- `SENDGRID_API_KEY` - For email sending
- `FROM_EMAIL` - Sender email address (must be verified in SendGrid)
- `FROM_NAME` - Sender name
- `NOTIFY_EMAIL_ENABLED=true` - Enable email sending
- `DATABASE_URL` - Supabase connection
- `LEADSCOUT_URL` - LeadScout API URL (default: http://localhost:4021)

### URLs/Ports
- **Outreach**: http://localhost:4025

## Architecture (Short)

### Stack
- **Backend**: Express.js REST API (TypeScript)
- **Frontend**: Static HTML/CSS/JavaScript
- **Storage**: Supabase via @sb/storage (StorageCampaignRepository, EmailSendHistoryRepository)
- **Email**: SendGrid with rate limiting
- **Integration**: LeadScout API for lead import

### Key Modules
- `src/server.ts` - Express API server
- `src/routes.ts` - Campaign CRUD + send + webhook endpoints
- `src/template-engine.ts` - Variable substitution
- `src/email-sender.ts` - SendGrid integration with queue
- `src/leadscout-client.ts` - LeadScout API client
- `web/` - Static frontend files

### Data Flow
- User creates campaign → stored in Supabase
- Trigger send → fetch leads from LeadScout → compile templates → SendGrid queue
- SendGrid sends → webhooks update delivery status
- Leads marked "contacted" in LeadScout

## Known Issues

### No Analytics Dashboard UI
- **Repro**: Send campaign → want to see open/click rates → no dashboard exists
- **Root cause**: Backend tracks metrics via webhooks, no frontend display
- **Workaround**: Query database directly for metrics
- **Fix needed**: Build analytics dashboard showing open rate, click rate, bounces

### No Drip Campaigns
- **Repro**: Want to send follow-up emails 3 days later → can't schedule sequences
- **Root cause**: Only single-shot campaigns implemented
- **Fix needed**: Add drip campaign builder with delays and triggers

### No Rich HTML Templates
- **Repro**: Want professional HTML email → only plain text supported
- **Root cause**: Template system is plain text with variable substitution
- **Fix needed**: Add HTML template editor with WYSIWYG

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| OR-1 | Analytics dashboard UI | P1 | TODO | `web/analytics.html`, `src/analytics-routes.ts` | **What**: Build analytics dashboard showing campaign performance metrics<br>**Why**: Backend tracks data but no UI to view it<br>**Where**: New analytics page<br>**AC**: Charts show open rate, click rate, bounce rate, recipient activity timeline | |
| OR-2 | Enhanced LeadScout integration UI | P2 | TODO | `web/js/import-leads.js` | **What**: Add "Import from LeadScout" button in campaign creation<br>**Why**: Manual filtering is tedious<br>**Where**: Campaign creation wizard<br>**AC**: Click import → show LeadScout leads → select → add to campaign, preview intelligence data | |
| OR-3 | Drip campaign sequences | P2 | TODO | `src/drip-campaigns.ts`, `web/drip.html` | **What**: Build drip campaign builder with multi-step sequences<br>**Why**: Follow-ups are manual<br>**Where**: New drip campaign type<br>**AC**: Define sequence (email 1 → wait 3 days → email 2), schedule execution, track progression | |
| OR-4 | Rich HTML template editor | P2 | TODO | `web/js/template-builder.js` | **What**: WYSIWYG HTML email editor with drag-and-drop blocks<br>**Why**: Plain text emails look unprofessional<br>**Where**: Template editor page<br>**AC**: Drag blocks (header, text, image, button), preview, save as template, supports variables | |
| OR-5 | A/B testing for subject lines | P3 | TODO | `src/ab-testing.ts` | **What**: Create variants with different subjects/content, split traffic<br>**Why**: Want to optimize open/click rates<br>**Where**: Campaign creation with variants<br>**AC**: Create variants → split sends 50/50 → track metrics → declare winner | |
| OR-6 | Test suite for Outreach | P1 | TODO | `__tests__/campaign.test.ts`, `__tests__/templates.test.ts` | **What**: Add tests for campaign CRUD + template compilation + email sending<br>**Why**: No tests = high regression risk<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ coverage, mock SendGrid, test variable substitution | |
| OR-7 | Contact list management | P3 | TODO | `src/contacts.ts`, `web/contacts.html` | **What**: Build contact database separate from leads<br>**Why**: Need persistent contact list for non-lead recipients<br>**Where**: New contacts table + UI<br>**AC**: Add contacts manually, import CSV, segment by tags, unsubscribe management | |
| OR-8 | Email warmup scheduler | P3 | TODO | `src/warmup.ts` | **What**: Gradually increase send volume to improve deliverability<br>**Why**: Sudden high volume triggers spam filters<br>**Where**: Warmup job in Worker<br>**AC**: Configure warmup plan, sends increase daily, monitors bounce rate | |
| OR-9 | Loom video integration | P3 | TODO | `src/loom-integration.ts` | **What**: Embed Loom videos in email templates<br>**Why**: Video increases engagement<br>**Where**: Template variable for Loom URL<br>**AC**: Add Loom URL → auto-embeds with thumbnail, tracks video views | |
| OR-10 | Unsubscribe management | P2 | TODO | `src/unsubscribe.ts`, `web/unsubscribe.html` | **What**: One-click unsubscribe links, global suppression list<br>**Why**: Legal requirement (CAN-SPAM)<br>**Where**: Unsubscribe endpoint + preference center<br>**AC**: Unsubscribe link in emails, preference center for opt-out, suppression list honored | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

```bash
# All tests pass (once written)
pnpm --filter outreach test

# No TypeScript errors
pnpm --filter outreach typecheck

# No linting errors
pnpm --filter outreach lint

# Builds successfully
pnpm --filter outreach build

# Manual smoke test:
# - Create campaign → template compiles correctly
# - Send campaign → emails delivered via SendGrid
# - Webhook received → delivery status updated
# - LeadScout integration → leads imported and marked contacted
```
