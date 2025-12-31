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

1. **AI Intelligence UI Integration**
   - Show AI intelligence insights in lead detail view
   - Add "Analyze Lead" button to trigger intelligence analysis
   - Display qualification level badges and visual indicators
   - Show recommended actions and risk factors in lead cards
   - Add technology stack and company insights display

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
