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

1. **Email Service Integration** 🔥 HIGH PRIORITY
   - Integrate email service provider (SendGrid, AWS SES, Postmark)
   - Implement actual email sending functionality
   - Add email queue with rate limiting
   - Build email delivery tracking
   - Add bounce and complaint handling
   - Implement email warmup system

2. **Campaign Execution History**
   - Add campaign execution history storage
   - Store sent messages and delivery status
   - Implement campaign analytics data storage
   - Add persistent campaign schedules
   - Track campaign performance over time

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

