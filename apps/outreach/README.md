# Outreach

**Status:** 🟢 Functional - Complete UI + campaign management with persistence
**Port:** 4025

Outreach campaign management and automation platform for coordinating email campaigns with template personalization and audience targeting.

## Purpose

Outreach enables teams to create, manage, and execute communication campaigns at scale. The platform provides campaign planning, template management with variable substitution, audience filtering, and campaign preview capabilities to improve outreach effectiveness and efficiency.

## Features

### Core Campaign Management
- **Complete REST API** with campaign CRUD operations
- **Persistent storage** using `@sb/storage` (StorageCampaignRepository)
- **Full web UI** for campaign management
- **Campaign creation wizard** with step-by-step flow
- **Campaign listing** with status badges and filtering

### Message Templates
- **Template system** with variable substitution:
  - `{{business_name}}` - Company name
  - `{{domain}}` - Website domain
  - `{{pain_point}}` - Industry pain point
  - `{{industry}}` - Industry classification
- **Template compilation** - Preview personalized messages
- **Campaign message preview** - See how messages will look to recipients

### Audience Targeting
- **Audience filtering** by:
  - Industry (technology, healthcare, finance, etc.)
  - Score range (minimum/maximum lead score)
  - Tags (custom lead tags)
- **Mock lead provider** for testing
- **Dynamic audience selection** - Automatically targets matching leads

### Campaign Management
- **Campaign status tracking** - Draft, active, paused, completed
- **Campaign statistics** - Track sent count, open rate, click rate
- **Campaign editing** - Update templates and targeting
- **Campaign deletion** - Clean up old campaigns

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables (for future email integration)
cp ../../.env.example ../../.env

# Run the development server
pnpm --filter outreach dev
```

Then open `http://localhost:4025` in your browser.

## Architecture

- **Backend**: Express.js REST API
- **Frontend**: Static HTML/CSS/JavaScript with modern UI
- **Storage**: Supabase via `@sb/storage` abstraction layer (persistent)
- **Templates**: Custom template engine with variable substitution
- **Lead Integration**: Mock lead provider (will integrate with LeadScout)

## API Endpoints

### Campaign Management
- `POST /api/campaigns` - Create a new campaign
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update a campaign
- `DELETE /api/campaigns/:id` - Delete a campaign

### Campaign Execution
- `POST /api/campaigns/:id/preview` - Preview campaign messages
- `POST /api/campaigns/:id/send` - Send campaign (not yet implemented)

### Template Testing
- `POST /api/templates/compile` - Test template compilation with variables

## Usage Examples

### Creating a Campaign

```json
POST /api/campaigns
{
  "orgId": "default-org",
  "name": "Q1 Outreach - Tech Startups",
  "subject": "Help {{business_name}} scale faster",
  "body": "Hi,\n\nI noticed {{business_name}} is in the {{industry}} space...",
  "targeting": {
    "industry": "technology",
    "minScore": 70,
    "tags": ["startup", "saas"]
  },
  "status": "draft"
}
```

### Previewing Campaign Messages

```bash
POST /api/campaigns/:id/preview
```

Returns personalized messages for each targeted lead showing how variables will be substituted.

## Current Status

### ✅ Production-Ready Features
- Complete REST API with campaign CRUD
- Persistent storage using `@sb/storage` (StorageCampaignRepository)
- Full web UI for campaign management
- Message template system with variable substitution
- Audience filtering by industry, score range, tags
- Template compilation and preview
- Campaign message preview showing personalized messages
- Mock lead provider for testing
- Campaigns persist across server restarts

### ⚠️ Missing Core Functionality
- **Email sending** - Campaigns cannot send emails yet (critical gap)
- **Email service integration** - No SendGrid/AWS SES/Postmark integration
- **Campaign execution history** - No tracking of sent messages
- **Analytics** - No open/click tracking

### Next Steps

**Priority 1 (Next 2-4 Weeks):** 🔥 CRITICAL - CORE FUNCTIONALITY

1. **Email Service Integration** ⚠️ BLOCKING PRODUCTION USE
   - Week 1-2: Choose and integrate email provider
     - Evaluate SendGrid vs AWS SES vs Postmark (cost, features, deliverability)
     - Set up provider account and API keys
     - Complete domain verification and DNS setup (SPF, DKIM, DMARC)
   - Week 2-3: Implement email sending
     - Create email service wrapper in @sb/notify
     - Implement email queue with rate limiting (respect provider limits)
     - Add email template rendering engine
     - Build campaign execution job (integrate with Worker app)
   - Week 3-4: Delivery tracking and handling
     - Implement basic delivery tracking (sent, delivered, failed)
     - Add bounce and complaint webhook handling
     - Store email send history and status
     - Build retry logic for failed sends
   - **Goal:** Enable real email campaign execution
   - **Success Criteria:** Can send 1000+ emails per campaign with tracking
   - **Current Blocker:** Cannot send emails - core functionality missing!

**Priority 2 (Next 1-2 Months):**

2. **Campaign Execution & Analytics** 📊 MEASUREMENT
   - Store campaign execution history in database
   - Track sent messages count and delivery status per campaign
   - Add email open tracking (tracking pixel implementation)
   - Implement click tracking with link wrapping and redirect endpoint
   - Build campaign analytics dashboard in UI
   - Show campaign performance metrics (sent, delivered, opened, clicked, bounced)
   - Calculate open rate, click rate, click-to-open rate
   - Add recipient-level activity tracking
   - **Goal:** Track and measure campaign effectiveness with detailed metrics
   - **Benefit:** Data-driven campaign optimization

3. **LeadScout Integration** 🔗 CROSS-APP WORKFLOW
   - Connect to LeadScout API for lead import
   - Add "Import from LeadScout" button in campaign creation
   - Build lead list selection UI with filters (score, status, tags)
   - Auto-populate campaign targeting from lead segments
   - Map lead fields to email template variables
   - Track campaign performance metrics back to LeadScout
   - Update lead status when contacted via campaign
   - Show "Last Contacted" date in LeadScout
   - **Goal:** Seamless lead-to-campaign workflow
   - **Benefit:** Complete sales automation from discovery to outreach

**Priority 3 (Next Quarter):**

4. **Template Builder & Scheduling**
   - Build rich text email editor
   - Add pre-built template library
   - Implement campaign scheduling (send now, schedule later)
   - Add drip campaign sequences
   - Create follow-up automation rules
   - **Goal:** Professional campaign creation and automation

5. **Contact Management**
   - Build contact list management
   - Add contact segmentation
   - Implement CSV import/export
   - Add contact tagging system
   - Build unsubscribe management
   - **Goal:** Complete contact database

**Future Considerations:**
- A/B testing framework
- AI-powered subject line generation
- Send time optimization
- Loom video integration
- Email warmup and deliverability monitoring
- Sender reputation tracking

## Integration with Suite

Outreach integrates with other Signal Blueprint apps:
- **LeadScout** - Import leads for campaigns (coming soon)
- **Console** - Campaign activity monitoring
- **Worker** - Scheduled campaign sending jobs (coming soon)
- **Events** - Activity tracking for campaign actions

## Documentation

- [Main Suite README](../../README.md) - Complete suite overview
- [Suite Map](../../docs/SUITE_MAP.md) - App registry and architecture

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines and best practices.

