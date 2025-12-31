# SiteForge

**Status:** 🟢 Functional - Complete generation pipeline with AI-powered content
**Port:** 4024

Website generation and management platform that enables teams to quickly create, customize, and deploy demonstration sites and landing pages using AI-powered content generation.

## Purpose

SiteForge provides a streamlined way to build and manage demo sites for products, services, or campaigns. The platform aims to offer templates, AI-powered content generation, customization tools, and deployment automation to reduce the time and effort required to create professional websites.

## Features

### Core Project Management
- **Complete REST API** with project CRUD operations
- **Persistent storage** using `@sb/storage` (ProjectRepository, GenerationJobRepository)
- **Full web UI** for project management
- **Project creation** with business details:
  - Business name
  - Domain name
  - Niche/industry
  - Project notes
- **Project status tracking** - Draft, queued, generating, ready, failed
- **Project statistics dashboard** - Total projects, active, completed, failed
- **Generation job queue system** - Fully functional background processing

### AI-Powered Generation Pipeline ✨ NEW
- **AI Content Generation** - OpenAI GPT-4o-mini powered content creation
  - Automatic copywriting tailored to business niche
  - SEO-optimized metadata generation
  - Industry-specific content adaptation
  - Smart keyword integration
- **Component-Based Generation** - Modular page structure
  - Hero sections with compelling CTAs
  - About/mission sections
  - Features/services showcases
  - Pricing tiers (when applicable)
  - Customer testimonials
  - Call-to-action sections
  - Professional footers
- **HTML Template Engine** - Modern, responsive HTML generation
  - Mobile-first responsive design
  - Clean, semantic HTML5
  - Inline CSS with professional styling
  - Accessibility-friendly markup
  - Fast loading performance
- **Background Job Processing** - Asynchronous generation
  - Non-blocking job queue
  - Real-time status updates
  - Error handling and retry logic
  - Progress tracking
- **Site Preview & Export** - View and download generated sites
  - Live HTML preview
  - Complete site metadata
  - Component-level access
  - JSON export capability

### Project Status Management
- **Draft** - Initial project setup
- **Queued** - Ready for generation
- **Generating** - AI generation in progress
- **Complete** - Website generated and ready
- **Failed** - Generation failed with error details

### User Interface
- **Project dashboard** with visual status indicators
- **Add/edit project forms** with validation
- **Project cards** with key information display
- **Status badges** with color coding
- **Generation trigger** - Queue projects for generation

## Quick Start

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env
# Add OPENAI_API_KEY for future AI generation

# Run the development server
pnpm --filter siteforge dev
```

Then open `http://localhost:4024` in your browser.

## Architecture

- **Backend**: Node.js HTTP server with TypeScript
- **Frontend**: Static HTML/CSS/JavaScript with modern UI
- **Storage**: Supabase via `@sb/storage` abstraction layer
- **AI**: OpenAI GPT-4o-mini for content generation (with caching via `@sb/cache`)
- **Job Processing**: In-memory queue with background processor
- **Events**: Suite-wide event publishing via `@sb/events`
- **Telemetry**: AI usage tracking via `@sb/telemetry`
- **Generated Output**: Responsive HTML with inline CSS (mobile-first)

## API Endpoints

### Project Management
- `POST /projects` - Create a new project
- `GET /projects` - List all projects
- `GET /projects/:id` - Get project details
- `PUT /projects/:id` - Update a project
- `DELETE /projects/:id` - Delete a project

### Generation & Preview
- `POST /projects/:id/generate` - Queue project for AI-powered generation
- `GET /projects/:id/status` - Get generation status and job history
- `GET /projects/:id/preview` - View generated HTML site (live preview)
- `GET /projects/:id/site` - Get generated site data (JSON with components)
- `GET /jobs` - List all generation jobs

## Usage Example

```bash
# 1. Create a new project
curl -X POST http://localhost:4024/projects \
  -H "Content-Type: application/json" \
  -d '{
    "businessName": "TechFlow Solutions",
    "domain": "techflow.com",
    "niche": "SaaS project management",
    "notes": "Focus on team collaboration and productivity"
  }'

# 2. Trigger generation
curl -X POST http://localhost:4024/projects/{PROJECT_ID}/generate

# 3. Check status
curl http://localhost:4024/projects/{PROJECT_ID}/status

# 4. View generated site
curl http://localhost:4024/projects/{PROJECT_ID}/preview > site.html
```

## Current Status

### ✅ Implemented Features (v1.0)
- ✅ Complete REST API with project CRUD
- ✅ Persistent storage using `@sb/storage`
- ✅ Full web UI for project management
- ✅ Project creation with business details
- ✅ Project status tracking (draft → queued → generating → ready/failed)
- ✅ Project statistics dashboard
- ✅ **Website Generation Pipeline** - Fully functional AI-powered engine
- ✅ **AI Content Generation** - GPT-4o-mini integration with caching
- ✅ **Component-Based Templates** - 8 component types (hero, features, about, pricing, testimonials, CTA, contact, footer)
- ✅ **HTML Generation Engine** - Responsive, mobile-first templates
- ✅ **Background Job Processing** - Async generation with queue management
- ✅ **Site Preview & Export** - Live HTML preview and JSON export
- ✅ **Event Publishing** - Integration with suite event system

### ⚠️ Future Enhancements
- **Multiple Templates** - Currently single responsive template, add variations
- **Visual Builder** - Drag-and-drop customization UI
- **Deployment** - Vercel, Netlify, or static hosting integration
- **Asset Management** - Image upload and stock photo integration
- **Multi-page Sites** - Currently single-page, expand to full sites

## Technical Architecture

### Generation Pipeline Flow

```
1. User creates project → Stored in Supabase
2. User triggers generation → Job queued
3. Job Processor picks up job → Status: "processing"
4. AI Content Generator → GPT-4o-mini generates content
   ├─ Hero section content
   ├─ About section content
   ├─ Features/services (3-4 items)
   ├─ Pricing tiers (if applicable)
   ├─ Testimonials (2-3)
   └─ SEO metadata
5. HTML Generator → Converts components to HTML
   ├─ Responsive CSS
   ├─ Mobile-first design
   └─ Accessibility markup
6. Store generated site → Project updated with GeneratedSite
7. Publish events → Suite-wide notification
8. User views preview → Render HTML or download
```

### Key Files

- `src/ai-content-generator.ts` - AI content generation with OpenAI
- `src/html-generator.ts` - Component-to-HTML templating engine
- `src/generation-engine.ts` - Orchestrates AI + HTML generation
- `src/job-processor.ts` - Background job queue processor
- `src/repository.ts` - Data persistence layer
- `src/server.ts` - Express API server with endpoints

### Next Steps (Roadmap v2.0)

**Priority 1 (Next 2 Weeks):** 🔥

1. **Template Variations**
   - Add 2-3 different visual templates (modern, minimal, bold)
   - Implement template selection in UI
   - Add basic color scheme customization
   - Industry-specific styling (SaaS, E-commerce, Portfolio)
   - **Goal:** Give users visual template choices

**Priority 2 (Next Month):**

2. **Visual Customization**
   - Add color picker for theme colors
   - Implement font selection (3-5 options)
   - Allow section reordering
   - Add image upload for hero/background
   - Basic text editing for generated content
   - **Goal:** Allow basic visual customization

3. **Multi-page Generation**
   - Add About page generation
   - Add Contact page with form
   - Add simple blog/news section
   - Generate navigation between pages
   - **Goal:** Complete multi-page websites

**Priority 3 (Next Quarter):**

4. **Visual Builder**
   - Drag-and-drop component builder
   - Live preview with instant editing
   - Component palette
   - Section customization (text, images, styles)
   - Undo/redo functionality
   - **Goal:** WYSIWYG editing experience

5. **Deployment Integration**
   - One-click Vercel deployment
   - Netlify integration
   - Static file export (zip download)
   - Custom domain support
   - **Goal:** Easy deployment and hosting

**Priority 4 (Future):**

6. **Asset Management & Advanced Features**
   - Stock photo integration (Unsplash, Pexels)
   - Image upload and optimization
   - AI image generation (DALL-E integration)
   - Contact form with email integration
   - Analytics (Google Analytics, Plausible)
   - SEO optimization tools
   - Performance optimization

## Integration with Suite

SiteForge integrates with other Signal Blueprint apps:
- **Catalog** - Generate e-commerce product pages (coming soon)
- **Console** - Project monitoring and management
- **Worker** - Background generation jobs (coming soon)
- **Events** - Generation activity tracking

## Documentation

- [Main Suite README](../../README.md) - Complete suite overview
- [Suite Map](../../docs/SUITE_MAP.md) - App registry and architecture

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines and best practices.

