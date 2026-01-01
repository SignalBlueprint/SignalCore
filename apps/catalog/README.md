# Catalog

**Status:** 🟢 Production Ready - Complete e-commerce platform with AI and payments
**Port:** 4023

AI-powered product catalog and e-commerce platform with automatic image analysis, product shot generation, vector search, shopping cart, order management, and payment processing.

## Purpose

Catalog is a complete e-commerce solution that lets you build an online store by simply taking photos on your phone. The system uses AI to automatically extract product metadata, generate clean product shots, enable semantic search, manage inventory, process orders, and provide a customer-facing storefront—all with minimal manual data entry.

## Features

### Core Functionality
- **Mobile-First Upload**: Take photos and upload via API or web UI
- **AI Vision Analysis**: Automatic metadata extraction using OpenAI Vision (GPT-4o)
- **Image Generation**: Generate clean product shots using DALL-E 3
- **Vector Search**: Semantic product search using OpenAI embeddings
- **Inventory Management**: Real-time stock tracking with auto-status updates
- **Customer Storefront**: Modern, responsive shopping experience with product browsing, search, cart, and checkout
- **Shopping Cart**: Full cart management with session support and real-time UI updates
- **Order Management**: Complete order processing and fulfillment workflow
- **Checkout**: Customer checkout with inventory validation and order tracking
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

### Analytics & Insights Dashboard ✨ NEW
Comprehensive analytics and reporting for data-driven decisions:
- **Revenue Analytics**: Daily revenue tracking, order trends, and sales forecasting
- **Product Performance**: Top selling products, views, conversions, and revenue by product
- **Inventory Analytics**: Low stock alerts, inventory turnover, and restock recommendations
- **Customer Insights**: Top customers, average order value, customer behavior patterns
- **Conversion Funnel**: Track views → cart adds → checkouts → orders
- **Search Analytics**: Top search queries, search patterns, and zero-result searches
- **AI Usage Tracking**: Monitor AI costs and ROI on AI-powered features
- **Data Export**: Export analytics to CSV for external reporting

## What Sets Catalog Apart

**Mobile-First Philosophy**: Unlike traditional product management systems that require desktop data entry, Catalog is designed for the modern workflow—take a photo on your phone, upload it, and let AI do the heavy lifting.

**AI as a Co-pilot**: Rather than forcing manual data entry, Catalog uses GPT-4o Vision to intelligently extract product details, suggest pricing, generate tags, and create clean product shots. You review and refine, not start from scratch.

**Semantic Search**: Traditional product search relies on exact keyword matches. Catalog uses vector embeddings to understand intent—search for "warm winter jacket" and find relevant products even if those exact words aren't in the description.

**Flexible Storage**: Works with Supabase for production-grade pgvector search, or local JSON storage for development and simple deployments.

## Typical User Journey

**For Store Owners:**
1. **Capture**: Take product photos on mobile device (or use existing images)
2. **Upload**: Use admin UI or API to upload images (single or batch)
3. **AI Analysis**: System automatically extracts name, description, category, price, tags, and generates embeddings
4. **Review**: Check AI-generated metadata in admin dashboard and make adjustments
5. **Enhance**: Optionally generate clean product shots with DALL-E 3
6. **Publish**: Set status to "active" to make products visible in public storefront
7. **Manage**: Track inventory, update stock levels, organize into lookbooks
8. **Fulfill**: Process orders, update shipping status, manage customer communications

**For Customers:**
1. **Discover**: Browse products or use semantic search to find items naturally
2. **Shop**: Add products to cart with automatic inventory validation
3. **Checkout**: Complete purchase with shipping information
4. **Track**: Receive order confirmation with order number and tracking info
5. **Receive**: Get notified when order ships and is delivered

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment (add API keys to root .env)
cp ../../.env.example ../../.env
# Edit .env and add:
#   OPENAI_API_KEY - for AI features
#   STRIPE_SECRET_KEY - for payment processing
#   STRIPE_PUBLISHABLE_KEY - for frontend payments
#   STRIPE_WEBHOOK_SECRET - for webhook verification (optional for development)

# Run Supabase migrations (if using Supabase)
# See docs/supabase-migrations/002_catalog_tables.sql

# Start server
pnpm dev
```

Server runs on `http://localhost:4023`

### Stripe Payment Setup

To enable payment processing:

1. **Create a Stripe Account** at https://stripe.com
2. **Get API Keys** from Stripe Dashboard → Developers → API keys
3. **Add to .env file**:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. **Test Payments** - Use Stripe test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - Use any future expiry date and any 3-digit CVC

5. **Webhook Setup (Optional for Development)**:
   - Install Stripe CLI: https://stripe.com/docs/stripe-cli
   - Forward webhooks: `stripe listen --forward-to localhost:4023/api/webhooks/stripe`
   - Copy webhook secret to `.env`: `STRIPE_WEBHOOK_SECRET=whsec_...`

6. **Production Setup**:
   - Replace test keys with live keys
   - Configure webhook endpoint in Stripe Dashboard
   - Set up webhook secret for production

### Accessing the Application

- **Customer Storefront**: `http://localhost:4023` or `http://localhost:4023/store`
- **Admin Dashboard**: `http://localhost:4023/admin`

## Usage Example

### Using the Customer Storefront

1. Open `http://localhost:4023` in your browser
2. Browse products in a modern, responsive grid layout
3. Use search and filters to find specific products
4. Click on any product to view detailed information and image gallery
5. Add products to your shopping cart
6. Proceed to checkout and complete your order
7. Track your order using the order number or email

### Using the Admin UI

1. Open `http://localhost:4023/admin` in your browser
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

### Using Semantic Search

The catalog automatically uses AI-powered semantic search for multi-word queries:

**In the Storefront UI:**
- Type a natural language query like "warm winter jacket" or "blue cotton shirt"
- The system automatically switches to semantic search for queries with 2+ words
- See relevance scores (0-100%) on each product card
- Visual indicator shows when AI search is active

**Via API:**

```bash
# Semantic search with advanced filters
curl -X POST http://localhost:4023/api/products/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "comfortable running shoes",
    "orgId": "default-org",
    "limit": 20,
    "threshold": 0.4,
    "category": "Footwear",
    "minPrice": 50,
    "maxPrice": 200
  }'

# Find similar products
curl http://localhost:4023/api/products/{productId}/similar?limit=5&threshold=0.6

# Get search analytics
curl http://localhost:4023/api/analytics/search?orgId=default-org&limit=100
```

**Search Parameters:**
- `query` (required): Natural language search query
- `limit`: Max results to return (default: 10)
- `threshold`: Similarity threshold 0-1 (default: 0.5, lower = more results)
- `category`: Filter by specific category
- `minPrice` / `maxPrice`: Price range filters
- `status`: Filter by product status
- `includeOutOfStock`: Include out of stock items (default: false)

**Understanding Results:**
- `_similarity`: Cosine similarity score (0-1)
- `_relevanceScore`: User-friendly percentage (0-100%)
- Results sorted by relevance automatically
- Similar products shown on product detail pages

## Documentation

See [CATALOG_GUIDE.md](./CATALOG_GUIDE.md) for complete API documentation, workflow examples, and advanced configuration.

## Architecture

- **Backend**: Express.js with Multer for file uploads
- **Storage**: Supabase Storage or local filesystem
- **Database**: Supabase (PostgreSQL + pgvector) or local JSON
- **AI**: OpenAI GPT-4o (Vision), DALL-E 3, text-embedding-3-small
- **Search**: Vector similarity (cosine) with 1536-dimensional embeddings

## API Endpoints

**Product Management**
- `POST /api/products/upload` - Upload and analyze product image
- `POST /api/products/upload/batch` - Batch upload multiple product images
- `GET /api/products` - List products with filters
- `POST /api/products/search` - Semantic vector search with advanced filters
- `GET /api/products/:id/similar` - Find similar products using AI embeddings
- `PUT /api/products/:id/inventory` - Update inventory
- `GET /api/products/export/csv` - Export products to CSV
- `POST /api/products/import/csv` - Import products from CSV

**Payment Processing** ✨ NEW
- `GET /api/payments/config` - Get Stripe publishable key for frontend
- `POST /api/payments/create-intent` - Create Stripe payment intent for an order
- `POST /api/payments/confirm` - Confirm payment and update order status
- `POST /api/webhooks/stripe` - Stripe webhook handler for payment events

**Analytics & Insights** ✨ NEW
- `GET /api/analytics/overview` - Get comprehensive analytics dashboard
- `GET /api/analytics/revenue` - Get revenue analytics and trends
- `GET /api/analytics/products` - Get top selling products and performance metrics
- `GET /api/analytics/products/:productId` - Get specific product analytics
- `GET /api/analytics/customers` - Get customer analytics and top customers
- `GET /api/analytics/funnel` - Get conversion funnel data
- `GET /api/analytics/search` - Get search analytics and top queries
- `GET /api/analytics/searches` - Get enhanced search analytics
- `POST /api/analytics/track` - Track custom analytics events
- `GET /api/analytics/export` - Export analytics data to CSV

**Shopping Cart**
- `GET /api/cart/:sessionId` - Get cart for a session
- `POST /api/cart/:sessionId/items` - Add item to cart
- `PUT /api/cart/:sessionId/items/:productId` - Update item quantity
- `DELETE /api/cart/:sessionId/items/:productId` - Remove item from cart
- `DELETE /api/cart/:sessionId` - Clear cart

**Order Management**
- `POST /api/orders` - Create order (checkout)
- `GET /api/orders` - List all orders (admin)
- `GET /api/orders/:id` - Get order by ID
- `GET /api/orders/number/:orderNumber` - Get order by order number
- `GET /api/orders/customer/:email` - Get customer orders
- `PUT /api/orders/:id/status` - Update order status
- `PUT /api/orders/:id` - Update order details

**Public Storefront**
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

**Customer Storefront** ✨ NEW
- Complete customer-facing web UI
- Responsive product grid with search and filters
- Product detail pages with image galleries
- Shopping cart sidebar with real-time updates
- Complete checkout flow with customer information
- Order confirmation and tracking
- Order history lookup by email or order number
- Mobile-optimized responsive design
- Public/private store toggle
- Store settings and branding

**Semantic Search & Recommendations** ✨ ENHANCED
- **AI-Powered Semantic Search**: Automatic semantic search for multi-word queries
- **Intelligent Search Mode**: Auto-switches between text and semantic search based on query complexity
- **Advanced Filtering**: Category, price range, and status filters work with semantic search
- **Relevance Scoring**: Visual relevance badges showing AI match percentage (0-100%)
- **Similar Products**: AI-powered product recommendations based on vector similarity
- **Search Analytics**: Track search queries, result counts, and search patterns
- **Real-time Search Indicators**: Visual feedback showing when AI search is active
- **Configurable Thresholds**: Adjustable similarity thresholds for precision control
- **Search Debouncing**: Optimized search performance with 300ms debounce
- **Fallback Handling**: Graceful degradation to text search if semantic search fails

**Lookbooks & Collections**
- Curated product collections
- Public/private lookbook toggle
- Product organization and showcasing

**E-commerce & Orders** ✨ ENHANCED
- Shopping cart with session management
- Complete order processing workflow
- **Stripe Payment Integration** - Secure payment processing with Stripe Elements
- Payment webhook handling for automated order updates
- Order status tracking (pending, confirmed, processing, shipped, delivered, cancelled, refunded)
- Payment status management (pending, paid, failed, refunded, processing, canceled)
- Automatic inventory deduction on orders
- Inventory restoration on cancellations and failed payments
- Customer order history
- Order lookup by order number or email
- Shipping and tracking number support

**Analytics & Insights** ✨ NEW (Dec 31, 2025)
- Comprehensive analytics dashboard with overview metrics
- Revenue analytics with daily trends and forecasting
- Product performance tracking (views, conversions, revenue)
- Customer analytics and behavior insights
- Conversion funnel analysis (views → cart → checkout → orders)
- Search analytics with top queries and patterns
- AI usage cost tracking and ROI metrics
- Low stock alerts and inventory recommendations
- CSV export for all analytics data
- Event tracking system for custom analytics

### 🚀 Next Steps & Roadmap

**✅ COMPLETED - Payment Integration** (Dec 31, 2025)
- ✅ Stripe payment processing integrated and tested
- ✅ Payment confirmation flow with real-time status updates
- ✅ Webhook handling for payment events (payment.succeeded, payment.failed)
- ✅ Complete payment status tracking throughout order lifecycle
- ✅ End-to-end checkout tested with real Stripe payments
- 🔲 PayPal as alternative payment option (planned for Q1 2026)
- **Status:** Production-ready! Customers can complete purchases with credit/debit cards via Stripe.

**Priority 1: Product Variants** (Next Month)
- [ ] Product variants (sizes, colors, options)
- [ ] Variant-specific inventory tracking
- [ ] Variant selection UI in storefront
- [ ] Bulk variant creation and management
- **Goal:** Support fashion/apparel e-commerce

**Priority 2: Multi-Currency & International** (Next 2 Months)
- [ ] Analytics dashboard UI in admin panel
- [ ] Real-time metrics visualization
- [ ] Low stock alert notifications
- [ ] Sales forecasting visualizations
- [ ] Customer segmentation reports
- **Goal:** Data-driven decision making

**Priority 3: Mobile & UX** (Next Quarter)
- [ ] Progressive Web App (PWA) for storefront
- [ ] Native mobile app for quick photo uploads
- [ ] Mobile barcode scanning for inventory
- [ ] Offline mode with sync capabilities
- [ ] Dark mode support
- **Goal:** Exceptional mobile experience

**Priority 4: Advanced Features** (Next Quarter)
- [ ] Product reviews and ratings
- [ ] Related products and recommendations (AI-powered)
- [ ] Bulk pricing and discount rules
- [ ] Coupon and promo code system
- [ ] Abandoned cart recovery
- [ ] Email marketing integration
- **Goal:** Complete e-commerce feature set

**Future Considerations:**
- AI-powered price optimization
- Background removal for product images
- Integration with e-commerce platforms (Shopify, WooCommerce)
- Multi-currency and international shipping
- Social media product catalog sync

