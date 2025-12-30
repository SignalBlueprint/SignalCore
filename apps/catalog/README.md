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
- **Batch Upload**: Upload up to 20 product images at once with AI analysis and progress tracking
- **CSV Import/Export**:
  - Export entire catalog to CSV for spreadsheet editing
  - Import products from CSV with validation and error reporting
  - Automatic embedding generation for imported products
  - Line-by-line error tracking for failed imports
- **AI Integration**: Toggle AI vision analysis and clean shot generation directly from the UI
- **Visual Product Cards**: Grid layout with images, pricing, status badges, and inventory indicators
- **Responsive Design**: Mobile-friendly interface for catalog management on any device

## What Sets Catalog Apart

**Mobile-First Philosophy**: Unlike traditional product management systems that require desktop data entry, Catalog is designed for the modern workflow—take a photo on your phone, upload it, and let AI do the heavy lifting.

**AI as a Co-pilot**: Rather than forcing manual data entry, Catalog uses GPT-4o Vision to intelligently extract product details, suggest pricing, generate tags, and create clean product shots. You review and refine, not start from scratch.

**Semantic Search**: Traditional product search relies on exact keyword matches. Catalog uses vector embeddings to understand intent—search for "warm winter jacket" and find relevant products even if those exact words aren't in the description.

**Flexible Storage**: Works with Supabase for production-grade pgvector search, or local JSON storage for development and simple deployments.

## Typical User Journey

1. **Capture**: Take product photos on mobile device (or use existing images)
2. **Upload**: Use admin UI or API to upload images (single or batch)
3. **AI Analysis**: System automatically extracts name, description, category, price, tags, and generates embeddings
4. **Review**: Check AI-generated metadata in admin dashboard and make adjustments
5. **Enhance**: Optionally generate clean product shots with DALL-E 3
6. **Publish**: Set status to "active" to make products visible in public storefront
7. **Manage**: Track inventory, update stock levels, organize into lookbooks
8. **Discover**: Customers use semantic search to find products naturally

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
- `POST /api/products/upload/batch` - Batch upload multiple product images
- `GET /api/products` - List products with filters
- `POST /api/products/search` - Semantic vector search
- `PUT /api/products/:id/inventory` - Update inventory
- `GET /api/products/export/csv` - Export products to CSV
- `POST /api/products/import/csv` - Import products from CSV
- `GET /api/store/:orgId/products` - Public storefront API

See [CATALOG_GUIDE.md](./CATALOG_GUIDE.md) for full API reference.

## Current Implementation Status

### ✅ Production-Ready Features

**Core Product Management**
- Complete CRUD operations for products
- Product status management (draft, active, out_of_stock)
- Multi-image support per product
- Category and tag organization

**AI-Powered Intelligence**
- GPT-4o Vision for automatic metadata extraction
- DALL-E 3 for clean product shot generation
- Semantic vector search with 1536-dimensional embeddings
- Automatic name, description, category, price, and tag detection

**Bulk Operations**
- Batch upload up to 20 product images at once
- CSV import with error reporting
- CSV export for spreadsheet management
- Automatic embedding generation on import

**Inventory & Stock Management**
- Real-time stock level tracking
- Low stock threshold alerts
- Automatic status updates (out_of_stock when inventory hits 0)
- SKU and location tracking

**Admin Web Interface**
- Product dashboard with real-time statistics
- Advanced search and filtering (by name, description, tags, status, category)
- Drag-and-drop image upload
- Batch upload interface
- CSV import/export UI
- Visual product cards with images, pricing, and status badges
- Mobile-responsive design

**Public Storefront API**
- Customer-facing product API
- Public/private store toggle
- Active products filtering
- Store settings and branding

**Lookbooks & Collections**
- Curated product collections
- Public/private lookbook toggle
- Product organization and showcasing

### 🚀 Next Steps & Roadmap

**Phase 1: Mobile Experience**
- [ ] Native mobile app for quick photo uploads
- [ ] Mobile barcode scanning for inventory
- [ ] Offline mode with sync capabilities
- [ ] Mobile-optimized upload flow

**Phase 2: E-commerce Integration**
- [ ] Shopping cart functionality
- [ ] Payment gateway integration (Stripe, PayPal)
- [ ] Order management system
- [ ] Customer checkout flow
- [ ] Order tracking and fulfillment

**Phase 3: Advanced Product Features**
- [ ] Product variants (sizes, colors, options)
- [ ] Variant-specific inventory tracking
- [ ] Bulk pricing and discount rules
- [ ] Related products and recommendations
- [ ] Product reviews and ratings

**Phase 4: Analytics & Insights**
- [ ] Sales analytics dashboard
- [ ] Inventory turnover reports
- [ ] Popular products tracking
- [ ] Search analytics
- [ ] Low stock alerts and notifications

**Phase 5: Enhanced Automation**
- [ ] Automated restock notifications
- [ ] AI-powered price optimization
- [ ] Smart categorization improvements
- [ ] Automated product bundling suggestions
- [ ] Background removal for product images

**Phase 6: Multi-channel Support**
- [ ] Integration with e-commerce platforms (Shopify, WooCommerce)
- [ ] Social media product catalog sync
- [ ] Multi-currency support enhancements
- [ ] International shipping management

