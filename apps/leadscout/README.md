# LeadScout

**Status:** 🟢 Fully Functional - Complete API + UI with AI
**Port:** 4021

Lead discovery and qualification system with automatic scoring and AI-powered intelligence that helps teams identify and prioritize potential customers.

## Purpose

LeadScout automates lead discovery by aggregating data from multiple sources, applying qualification criteria, and ranking leads based on fit and engagement potential. The system uses configurable rules-based scoring combined with AI-powered intelligence to help sales and marketing teams focus on high-value prospects.

## Features

### Core Lead Management
- **Complete REST API** with CRUD operations for leads
- **Persistent storage** using `@sb/storage` (StorageLeadRepository)
- **Full web UI** with lead management dashboard
- **Filtering** by status, source, and score
- **Lead statistics** - Total leads, average score, status breakdowns
- **Add/edit lead forms** with validation
- **Zod schema validation** for data integrity
- **Seed endpoint** for demo data (development only)

### AI-Powered Lead Scoring
- **Configurable rules-based scoring system** with multiple factors:
  - **Source-based scoring** - Customizable weights (manual, import, scrape, referral, partner)
  - **Recency scoring** - Newer leads valued higher with decay over time
  - **URL quality scoring** - Custom domains, HTTPS, professional TLDs
  - **Company name presence** - Bonus points for having company name
- **Scoring breakdown** - Transparent display of how scores are calculated
- **Visual score indicators** - Color-coded score badges and progress bars

### AI-Powered Intelligence
- **OpenAI GPT-4o-mini** lead analysis with:
  - Company size and industry classification
  - Estimated revenue and funding status
  - Qualification level (high/medium/low) with reasoning
  - Technology stack detection
  - Risk factors and opportunities identification
  - Recommended sales actions
- **Intelligence-boosted scoring** - Combines base score with AI insights
- **Caching and telemetry** - Efficient AI usage tracking

### Scoring Breakdown UI
- **Visual breakdown** with progress bars for each scoring factor
- **Score components** displayed:
  - Source Quality (0-40 points)
  - Recency (0-30 points)
  - URL Quality (0-20 points)
  - Company Name (0-10 points)
- **Color-coded bars** - Green/yellow/red based on score thresholds
- **Transparent scoring** for better lead prioritization

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env
# Add OPENAI_API_KEY to .env

# Run the development server
pnpm --filter leadscout dev
```

Then open `http://localhost:4021` in your browser.

## Architecture

- **Backend**: Express.js REST API
- **Frontend**: Static HTML/CSS/JavaScript with modern UI
- **Storage**: Supabase via `@sb/storage` abstraction layer
- **AI**: OpenAI GPT-4o-mini for lead intelligence
- **Validation**: Zod schemas from `@sb/schemas`
- **Events**: Integration with `@sb/events` for activity tracking

## API Endpoints

### Lead Management
- `POST /api/leads` - Create a new lead
- `GET /api/leads` - List leads with optional filters
- `GET /api/leads/:id` - Fetch a single lead by ID
- `PATCH /api/leads/:id` - Update lead status, score, or notes
- `DELETE /api/leads/:id` - Delete a lead

### Lead Scoring
- `POST /api/leads/:id/score` - Recalculate lead score
- `GET /api/leads/:id/score/breakdown` - Get detailed score breakdown

### AI Intelligence
- `POST /api/leads/:id/intelligence` - Analyze lead with AI
- `GET /api/leads/:id/intelligence` - Get cached AI intelligence

### Development
- `POST /api/dev/seed` - Seed sample leads (development only, requires `NODE_ENV=development`)

### Query Parameters for GET /api/leads
- `status` - Filter by status (new, contacted, qualified, converted, lost)
- `source` - Filter by source (manual, import, scrape, referral, partner)
- `min_score` - Minimum score threshold
- `max_score` - Maximum score threshold
- `orgId` - Organization ID (required)

## Environment Variables

| Name | Description | Default |
| --- | --- | --- |
| `PORT` | Port for the LeadScout API server | `4021` |
| `NODE_ENV` | Enables dev-only seed endpoint when set to `development` | `undefined` |
| `OPENAI_API_KEY` | OpenAI API key for AI-powered intelligence | Required |

## Usage Examples

### Creating a Lead

```json
POST /api/leads
{
  "orgId": "default-org",
  "url": "https://acme.example.com",
  "companyName": "Acme Co",
  "source": "manual",
  "status": "new",
  "notes": "Inbound request for demo."
}
```

The system will automatically calculate an initial score based on the lead data.

### Updating a Lead

```json
PATCH /api/leads/:id
{
  "status": "contacted",
  "notes": "Followed up with pricing details."
}
```

### Getting Lead Intelligence

```bash
POST /api/leads/:id/intelligence
```

Returns AI-powered insights about the lead including company size, industry, qualification level, risks, opportunities, and recommended actions.

## Current Status

### ✅ Production-Ready Features
- Complete REST API with CRUD operations
- Persistent storage using `@sb/storage`
- Full web UI with lead management dashboard
- Filtering by status, source, and score
- Lead statistics (total leads, average score)
- Add/edit lead forms with validation
- Zod schema validation
- Seed endpoint for demo data
- Lead Scoring Engine with configurable rules
- AI-Powered Intelligence using GPT-4o-mini
- Scoring Breakdown UI with visual indicators
- Intelligence-boosted scoring
- Caching and telemetry integration

### Next Steps

**Priority 1 (Next 2-4 Weeks):** 🔥 HIGH PRIORITY

1. **AI Intelligence UI Integration**
   - Add "Analyze Lead" button to lead detail view in UI
   - Display AI intelligence insights panel with expandable sections
   - Show qualification level badges (high/medium/low) with color coding
   - Display recommended actions list and risk factors
   - Show detected technology stack and company insights
   - Add loading states during AI analysis and error handling
   - Cache AI results and show "last analyzed" timestamp
   - **Goal:** Make AI intelligence visible and actionable in the UI (backend already complete)
   - **Status:** Backend AI service fully implemented, needs frontend integration

**Priority 2 (Next 1-2 Months):**

2. **Outreach Integration** 🔗 CROSS-APP WORKFLOW
   - Add "Send to Campaign" button in lead detail view and bulk actions
   - Connect to Outreach app API for campaign creation
   - Build lead list selection UI with filters
   - Export qualified leads to Outreach campaigns
   - Map lead data to campaign template variables
   - Create campaign targeting based on lead segments (industry, score, tags)
   - Track campaign performance metrics back to leads
   - Add "Last Contacted" field to leads
   - **Goal:** Complete sales funnel from lead discovery to outreach
   - **Benefit:** Seamless workflow connecting two apps

3. **Lead Enrichment Automation** 🤖 AUTOMATION
   - Integrate email finding API (Hunter.io or Apollo.io)
   - Add company data enrichment service (Clearbit or similar)
   - Implement automated enrichment worker job (scheduled via Worker app)
   - Add manual "Enrich Lead" button for on-demand enrichment
   - Show enrichment status badge and last updated timestamp
   - Store enrichment history and data sources
   - Add enrichment cost tracking
   - **Goal:** Automatic lead data enhancement with minimal manual effort
   - **Benefit:** Higher quality lead data for outreach

**Priority 3 (Next Quarter):**

4. **Data Import/Export**
   - CSV import with field mapping
   - CSV export with filters
   - Bulk upload from URLs/lists
   - API integration for CRM sync
   - **Goal:** Easy data migration and integration

5. **Advanced Features**
   - Lead deduplication system
   - Lead lifecycle tracking (new → qualified → customer)
   - Lead assignment to team members
   - Activity timeline and notes
   - Lead scoring refinements based on conversion data
   - **Goal:** Complete lead management workflow

**Future Considerations:**
- Web scraping engine for automated lead discovery
- LinkedIn Sales Navigator integration
- Competitor analysis and market research tools
- Custom scraping rules builder

## Integration with Suite

LeadScout integrates with other Signal Blueprint apps:
- **Outreach** - Export leads to campaigns (coming soon)
- **Console** - Lead discovery metrics and monitoring
- **Worker** - Scheduled lead enrichment jobs (coming soon)
- **Events** - Activity tracking for lead actions

## Documentation

- [Main Suite README](../../README.md) - Complete suite overview
- [Suite Map](../../docs/SUITE_MAP.md) - App registry and architecture

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines and best practices.
