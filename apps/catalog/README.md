# Catalog

AI-powered product catalog and inventory management system with automatic image analysis, product shot generation, vector search, and public storefront capabilities.

## Purpose

Catalog helps teams organize product information by simply taking photos on their phones. The system uses AI to automatically extract product metadata, generate clean product shots, enable semantic search, track inventory, and provide a customer-facing online store API.

## Features

### Core Functionality
- **Mobile-First Upload**: Take photos and upload via API or web UI
- **AI Vision Analysis**: Automatic metadata extraction using OpenAI Vision (GPT-4o)
- **Image Generation**: Generate clean product shots using DALL-E 3
- **Vector Search**: Semantic product search using OpenAI embeddings
- **Inventory Management**: Real-time stock tracking with auto-status updates
- **Public Storefront**: Customer-facing API for online stores
- **Lookbooks**: Organize products into curated collections
- **Admin UI**: Comprehensive web interface for product management

### AI-Powered Features
- Automatic product name detection
- Description generation
- Category classification
- Price suggestions
- Tag generation
- Color and material identification
- Clean product shot generation
- Semantic search with vector embeddings

### Admin UI Features
- **Product Dashboard**: View all products with real-time statistics (total, active, draft, out of stock)
- **Advanced Filtering**: Search by name, description, tags; filter by status and category
- **Product Management**: Add, edit, and delete products through intuitive modal forms
- **Image Upload**: Drag-and-drop or click-to-upload interface with multi-image support
- **AI Integration**: Toggle AI vision analysis and clean shot generation directly from the UI
- **Visual Product Cards**: Grid layout with images, pricing, status badges, and inventory indicators
- **Responsive Design**: Mobile-friendly interface for catalog management on any device

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment (add OPENAI_API_KEY to root .env)
cp ../../.env.example ../../.env

# Run Supabase migrations (if using Supabase)
# See docs/supabase-migrations/002_catalog_tables.sql

# Start server
pnpm dev
```

Server runs on `http://localhost:4023`

## Usage Example

### Using the Admin UI

1. Open `http://localhost:4023` in your browser
2. Click "Add Product" button
3. Upload product images (drag-and-drop or click to upload)
4. Enable AI features:
   - ✓ Auto-analyze with AI Vision (extracts name, description, category, price, tags)
   - ✓ Generate clean product shot (creates professional DALL-E 3 image)
5. Review or edit AI-generated details
6. Save product

### Using the API

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
- **Storage**: Supabase Storage or local filesystem
- **Database**: Supabase (PostgreSQL + pgvector) or local JSON
- **AI**: OpenAI GPT-4o (Vision), DALL-E 3, text-embedding-3-small
- **Search**: Vector similarity (cosine) with 1536-dimensional embeddings

## API Endpoints

- `POST /api/products/upload` - Upload and analyze product image
- `GET /api/products` - List products with filters
- `POST /api/products/search` - Semantic vector search
- `PUT /api/products/:id/inventory` - Update inventory
- `GET /api/store/:orgId/products` - Public storefront API

See [CATALOG_GUIDE.md](./CATALOG_GUIDE.md) for full API reference.

## Status

**Production Ready** - Complete backend API + comprehensive admin UI + AI capabilities

