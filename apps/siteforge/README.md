# SiteForge

**Status:** 🟡 Basic - UI + persistent storage, needs generation pipeline
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
- **Project status tracking** - Draft, queued, generating, complete, failed
- **Project statistics dashboard** - Total projects, active, completed, failed
- **Generation job queue system** (skeleton implementation)

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

- **Backend**: Express.js REST API
- **Frontend**: Static HTML/CSS/JavaScript with modern UI
- **Storage**: Supabase via `@sb/storage` abstraction layer
- **AI**: OpenAI GPT-4o (planned for content generation)
- **Templates**: Coming soon - React, Next.js, static HTML
- **Deployment**: Coming soon - Vercel, Netlify integration

## API Endpoints

### Project Management
- `POST /api/projects` - Create a new project
- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update a project
- `DELETE /api/projects/:id` - Delete a project

### Generation
- `POST /api/projects/:id/generate` - Queue project for generation (skeleton)
- `GET /api/projects/:id/status` - Get generation status

## Current Status

### ✅ Implemented Features
- Complete REST API with project CRUD
- Persistent storage using `@sb/storage`
- Full web UI for project management
- Project creation with business details
- Project status tracking
- Project statistics dashboard
- Generation job queue system (skeleton)
- Generation job endpoint (queued, not implemented)

### ⚠️ Missing Core Functionality
- **Website generation pipeline** - No actual generation engine (critical gap)
- **AI content generation** - Not implemented
- **Template system** - No templates available
- **Visual builder** - No page builder UI
- **Deployment** - No hosting integration

### Next Steps

1. **Website Generation Pipeline** 🔥 HIGHEST PRIORITY
   - Implement actual website generation engine
   - Build AI-powered content generation (copy, images)
   - Create page structure generator based on niche
   - Add component library for common sections
   - Implement responsive design generation
   - Add SEO optimization (meta tags, structure)

2. **Template System**
   - Build template library (React, Next.js, static HTML, WordPress)
   - Create industry-specific templates (SaaS, E-commerce, Portfolio, etc.)
   - Add template customization engine
   - Implement theme system (colors, fonts, layout)
   - Build template preview functionality
   - Add template versioning

3. **Visual Builder**
   - Create drag-and-drop page builder
   - Add component palette (hero, features, pricing, testimonials)
   - Implement real-time preview
   - Build section customization (text, images, styles)
   - Add undo/redo functionality
   - Create mobile responsive preview

4. **Deployment & Hosting**
   - Integrate with Vercel for deployment
   - Add Netlify deployment option
   - Implement static file hosting (S3, Cloudflare)
   - Build preview/staging environments
   - Add production deployment workflow
   - Implement rollback functionality

5. **Asset Management**
   - Build asset upload system (images, videos, files)
   - Add image optimization and CDN
   - Implement stock photo integration (Unsplash, Pexels)
   - Create favicon generator
   - Add logo upload and management
   - Build media library

6. **Domain & DNS**
   - Add custom domain configuration
   - Implement DNS management
   - Add SSL certificate provisioning
   - Build domain verification workflow
   - Add subdomain support
   - Create domain health monitoring

7. **Advanced Features**
   - Implement multi-page site generation
   - Add blog/CMS functionality
   - Build contact form generation
   - Add analytics integration (Google Analytics, Plausible)
   - Implement A/B testing for landing pages
   - Create performance optimization (lazy loading, minification)

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

