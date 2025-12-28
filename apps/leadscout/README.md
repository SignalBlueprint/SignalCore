# LeadScout

Lead discovery and qualification system that helps teams identify and prioritize potential customers using structured data and intelligence gathering.

## Purpose

LeadScout automates lead discovery by aggregating data from multiple sources, applying qualification criteria, and ranking leads based on fit and engagement potential. The system enables sales and marketing teams to focus on high-value prospects.

## Near-Term MVP

- Lead data aggregation from multiple sources
- Basic qualification scoring and filtering
- Lead list management and export
- Simple dashboard for viewing and prioritizing leads

## Local Development

```bash
pnpm --filter leadscout dev
```

### Environment Variables

| Name | Description | Default |
| --- | --- | --- |
| `PORT` | Port for the LeadScout API server | `4021` |
| `NODE_ENV` | Enables dev-only seed endpoint when set to `development` | `undefined` |

## API Endpoints

### POST /leads
Create a new lead.

**Request body**

```json
{
  "orgId": "org-demo",
  "url": "https://acme.example.com",
  "companyName": "Acme Co",
  "source": "manual",
  "status": "new",
  "score": 82,
  "notes": "Inbound request for demo."
}
```

### GET /leads
List leads with optional filters.

**Query params**

- `status` (new, contacted, qualified, converted, lost)
- `source` (manual, import, scrape, referral, partner)
- `min_score` (number)

### GET /leads/:id
Fetch a single lead by id.

### PATCH /leads/:id
Update lead status, score, or notes.

**Request body**

```json
{
  "status": "contacted",
  "score": 90,
  "notes": "Followed up with pricing details."
}
```

### POST /dev/seed (development only)
Seed sample leads for local testing. Only available when `NODE_ENV=development`.
