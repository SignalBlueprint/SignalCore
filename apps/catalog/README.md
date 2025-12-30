# Catalog

AI-powered product catalog and inventory management system with automatic image analysis, product shot generation, vector search, and public storefront capabilities.

## Purpose

Catalog helps teams organize product information by simply taking photos on their phones. The system uses AI to automatically extract product metadata, generate clean product shots, enable semantic search, track inventory, and provide a customer-facing online store API.

## Features

### Core Functionality
- **Mobile-First Upload**: Take photos and upload via API
- **AI Vision Analysis**: Automatic metadata extraction using OpenAI Vision (GPT-4o)
- **Image Generation**: Generate clean product shots using DALL-E 3
- **Vector Search**: Semantic product search using OpenAI embeddings
- **Inventory Management**: Real-time stock tracking with auto-status updates
- **Public Storefront**: Customer-facing API for online stores
- **Lookbooks**: Organize products into curated collections

### AI-Powered Features
- Automatic product name detection
- Description generation
- Category classification
- Price suggestions
- Tag generation
- Color and material identification
- Clean product shot generation
- Semantic search with vector embeddings

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment (add OPENAI_API_KEY to root .env)
cp ../../.env.example ../../.env

# Run Supabase migrations (if using Supabase)
# See docs/supabase-migrations/002_catalog_tables.sql

# Start backend server (runs on port 4023)
pnpm --filter catalog dev

# Start frontend web app (runs on port 5174) - in a separate terminal
pnpm --filter catalog-web dev
```

- Backend API: `http://localhost:4023`
- Frontend UI: `http://localhost:5174`

## Usage Example

Upload a product photo and let AI do the work:

```bash
curl -X POST http://localhost:4023/api/products/upload \
  -F "image=@product-photo.jpg" \
  -F "autoAnalyze=true" \
  -F "generateClean=true"

# AI automatically:
# ✓ Extracts product name, description, category
# ✓ Suggests price
# ✓ Generates tags
# ✓ Creates vector embedding for search
# ✓ Generates clean product shot
```

## Documentation

See [CATALOG_GUIDE.md](./CATALOG_GUIDE.md) for complete API documentation, workflow examples, and advanced configuration.

## Architecture

- **Backend**: Express.js with Multer for file uploads
- **Frontend**: React 18 + TypeScript + Vite (in `web/` directory)
- **Storage**: Supabase Storage or local filesystem
- **Database**: Supabase (PostgreSQL + pgvector) or local JSON
- **AI**: OpenAI GPT-4o (Vision), DALL-E 3, text-embedding-3-small
- **Search**: Vector similarity (cosine) with 1536-dimensional embeddings

### Frontend Features

The React frontend (`web/` directory) provides:
- Product listing with search and category filtering
- AI-powered product upload with drag-and-drop
- Product detail pages with inline editing
- Inventory management dashboard
- Lookbook management
- Mobile-responsive design

## API Endpoints

- `POST /api/products/upload` - Upload and analyze product image
- `GET /api/products` - List products with filters
- `POST /api/products/search` - Semantic vector search
- `PUT /api/products/:id/inventory` - Update inventory
- `GET /api/store/:orgId/products` - Public storefront API

See [CATALOG_GUIDE.md](./CATALOG_GUIDE.md) for full API reference.

## Status

**Active Development** - Full MVP implementation complete

