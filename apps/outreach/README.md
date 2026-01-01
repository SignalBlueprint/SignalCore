# Outreach

**Status:** 🟢 Production Ready - Complete campaign management with email sending via SendGrid
**Port:** 4025

Outreach campaign management and automation platform for coordinating email campaigns with template personalization, audience targeting, and real email delivery via SendGrid.

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
  - `{{score}}` - Lead score
  - `{{company_size}}` - Company size (from LeadScout intelligence)
  - `{{funding_status}}` - Funding status (from LeadScout intelligence)
  - `{{qualification_reason}}` - Qualification reason (from LeadScout intelligence)
  - `{{key_insight}}` - Key insight (from LeadScout intelligence)
  - `{{opportunity}}` - Opportunity (from LeadScout intelligence)
  - `{{recommended_action}}` - Recommended action (from LeadScout intelligence)
  - `{{tech_stack}}` - Technology stack (from LeadScout intelligence)
- **Template compilation** - Preview personalized messages
- **Campaign message preview** - See how messages will look to recipients

### Audience Targeting
- **Audience filtering** by:
  - Industry (technology, healthcare, finance, etc.)
  - Score range (minimum/maximum lead score)
  - Tags (custom lead tags)
- **LeadScout integration** - Fetch real leads from LeadScout API
- **Mock lead provider** for testing (fallback option)
- **Dynamic audience selection** - Automatically targets matching leads

### Campaign Management & Execution ✨ NEW
- **Campaign status tracking** - Draft, active, paused, completed
- **Campaign statistics** - Track sent count, failed count, last sent date
- **Real email sending** - SendGrid integration with rate limiting and queue management
- **Email send history** - Complete delivery tracking per campaign and lead
- **Webhook handling** - Automatic delivery status updates (delivered, opened, clicked, bounced)
- **Campaign editing** - Update templates and targeting
- **Campaign deletion** - Clean up old campaigns

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env
# Edit .env and add:
#   SENDGRID_API_KEY - Your SendGrid API key for email sending
#   FROM_EMAIL - Email address to send from (e.g., campaigns@yourdomain.com)
#   FROM_NAME - Sender name (e.g., "Your Company")
#   NOTIFY_EMAIL_ENABLED=true - Enable email sending
#   EMAIL_RATE_LIMIT=10 - Max emails per second (default: 10)
#   LEADSCOUT_URL - LeadScout API URL (default: http://localhost:4021)
#   LEADSCOUT_ORG_ID - Organization ID for LeadScout (optional)
#   USE_LEADSCOUT - Enable LeadScout integration (default: true)

# Run the development server
pnpm --filter outreach dev
```

Then open `http://localhost:4025` in your browser.

### SendGrid Email Setup

To enable actual email sending:

1. **Create a SendGrid Account** at https://sendgrid.com
2. **Get API Key** from SendGrid Dashboard → Settings → API Keys
3. **Verify Sender Identity**:
   - Go to Settings → Sender Authentication
   - Verify a single sender email OR authenticate your domain
4. **Add to .env file**:
   ```bash
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   FROM_EMAIL=campaigns@yourdomain.com
   FROM_NAME="Your Company"
   NOTIFY_EMAIL_ENABLED=true
   ```
5. **Configure Webhooks** (Optional for delivery tracking):
   - In SendGrid Dashboard → Settings → Mail Settings → Event Webhook
   - Enable webhook and add URL: `https://yourdomain.com/webhooks/sendgrid`
   - Select events: Delivered, Opened, Clicked, Bounced, Dropped
6. **Test**: Create a campaign and click "Send" to send real emails!

## Architecture

- **Backend**: Express.js REST API
- **Frontend**: Static HTML/CSS/JavaScript with modern UI
- **Storage**: Supabase via `@sb/storage` abstraction layer (persistent)
- **Templates**: Custom template engine with variable substitution
- **Lead Integration**: LeadScout API integration with fallback to mock provider

## API Endpoints

### Campaign Management
- `POST /api/campaigns` - Create a new campaign
- `GET /api/campaigns` - List all campaigns
- `GET /api/campaigns/:id` - Get campaign details
- `PUT /api/campaigns/:id` - Update a campaign
- `DELETE /api/campaigns/:id` - Delete a campaign

### Campaign Execution ✨ NEW
- `POST /api/campaigns/:id/preview` - Preview campaign messages
- `POST /api/campaigns/:id/send` - Send campaign emails to all matched leads
- `GET /api/campaigns/:id/history` - Get email send history for a campaign

### Webhooks ✨ NEW
- `POST /webhooks/sendgrid` - SendGrid webhook handler for delivery events

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
- **✨ SendGrid email integration** - Real email sending with queue management
- **✨ Email send history** - Complete tracking of sent messages
- **✨ Delivery tracking** - Webhook handling for delivery, open, click, bounce events
- **✨ Rate limiting** - Configurable emails per second to respect provider limits
- **✨ Campaign statistics** - Sent count, failed count, last sent date
- **✨ LeadScout integration** - Fetch leads from LeadScout API with intelligence data
- **✨ Lead status updates** - Automatically mark leads as "contacted" after campaign sent
- **✨ Rich template variables** - Support for company size, funding status, tech stack, and AI insights

### 🎯 Ready for Production Use
The Outreach app is now fully functional and ready to send real email campaigns!

### Next Steps

**✅ COMPLETED (Jan 2026):** Email Service Integration
- ✅ SendGrid integration with API client
- ✅ Email queue with rate limiting (configurable per-second limit)
- ✅ Campaign execution endpoint (`POST /api/campaigns/:id/send`)
- ✅ Email send history tracking in database
- ✅ Webhook handler for delivery events (delivered, opened, clicked, bounced)
- ✅ Campaign statistics (sent count, failed count, last sent date)
- **Status:** Production-ready! ✨

**Priority 1 (Next 2-4 Weeks):** Enhanced Analytics & Tracking

1. **Campaign Analytics Dashboard** 📊 UI ENHANCEMENT
   - Build analytics dashboard in web UI
   - Show campaign performance metrics (sent, delivered, opened, clicked, bounced)
   - Calculate and display open rate, click rate, click-to-open rate
   - Add charts for campaign performance over time
   - Show recipient-level activity tracking
   - Add email open tracking improvements (tracking pixel)
   - Implement click tracking with link wrapping and redirect endpoint
   - **Goal:** Visual analytics and data-driven campaign optimization
   - **Benefit:** Better insights into campaign effectiveness

**✅ COMPLETED (Jan 2026):** LeadScout Integration 🔗 CROSS-APP WORKFLOW
- ✅ Connect to LeadScout API for lead import
- ✅ Fetch leads with filters (industry, score, tags)
- ✅ Map lead fields to email template variables
- ✅ Support LeadScout intelligence data in templates (company size, funding, tech stack, etc.)
- ✅ Update lead status to "contacted" when campaign emails are sent
- ✅ Automatic email derivation from lead URLs
- **Status:** Production-ready! ✨

**Priority 2 (Next 1-2 Months):**

3. **Enhanced LeadScout Integration** 🔗 UI ENHANCEMENT
   - Add "Import from LeadScout" button in campaign creation UI
   - Build lead list selection UI with preview
   - Show lead intelligence data in campaign preview
   - Display "Last Contacted" date in LeadScout UI
   - Add bidirectional sync for campaign metrics
   - **Goal:** Seamless lead-to-campaign workflow with rich UI
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

