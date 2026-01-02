# SiteForge

## TL;DR
AI website generator with templates, color schemes, and full HTML generation pipeline. Production-ready with GPT-4o-mini content generation and persistent storage.

## Product Goal
- Enable teams to quickly create demo sites and landing pages
- Use AI to generate SEO-optimized content tailored to business niche
- Provide customizable templates with industry-specific styling
- Automate website deployment and hosting

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Project CRUD**: Projects persist to Supabase via @sb/storage
- **AI content generation**: GPT-4o-mini creates hero, about, features, pricing, testimonials, CTA, contact, footer
- **Template variations**: 3 visual styles (Modern, Minimal, Bold)
- **Industry color schemes**: 4 palettes (SaaS, E-commerce, Portfolio, General)
- **Custom primary color**: Override default palette
- **HTML generation**: Component-based templates with responsive CSS
- **Background job processing**: Async generation with queue
- **Site preview + export**: Live HTML preview and JSON download

### 🟡 Partial (Works but Incomplete)
- **Single-page only**: Can't generate multi-page sites yet
- **Limited customization**: No visual editor for drag-and-drop

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **No visual builder**: Can't edit content/layout visually
- **No deployment**: Generated sites not deployed anywhere
- **No asset management**: Can't upload images or use stock photos

## How to Run

### Install
```bash
pnpm install
```

### Dev
```bash
pnpm --filter siteforge dev
```

### Test
```bash
# No tests yet
pnpm --filter siteforge test
```

### Build
```bash
pnpm --filter siteforge build
```

### Env Vars
Required in root `.env`:
- `OPENAI_API_KEY` - For AI content generation
- `DATABASE_URL` - Supabase connection

### URLs/Ports
- **SiteForge**: http://localhost:4024

## Architecture (Short)

### Stack
- **Backend**: Express.js REST API (TypeScript)
- **Frontend**: Static HTML/CSS/JavaScript
- **Storage**: Supabase via @sb/storage (ProjectRepository, GenerationJobRepository)
- **AI**: OpenAI GPT-4o-mini for content generation
- **Queue**: In-memory job queue for async generation

### Key Modules
- `src/server.ts` - Express API server
- `src/generation-engine.ts` - Orchestrates AI + HTML generation
- `src/ai-content-generator.ts` - GPT-4o-mini content creation
- `src/html-generator.ts` - Component-to-HTML templating
- `src/job-processor.ts` - Background job queue
- `web/` - Static frontend files

### Data Flow
- User creates project → stored in Supabase
- Trigger generation → job queued
- Job processor → AI generates content → HTML templates → store GeneratedSite
- User views preview → render HTML or download JSON

## Known Issues

### No Visual Editor
- **Repro**: Generate site → want to edit text → can only regenerate entire site
- **Root cause**: No WYSIWYG editor implemented
- **Workaround**: Regenerate with different prompt
- **Fix needed**: Build drag-and-drop visual builder

### No Deployment Integration
- **Repro**: Generate site → want to publish → no deploy button
- **Root cause**: No Vercel/Netlify integration
- **Workaround**: Download HTML and deploy manually
- **Fix needed**: One-click deploy to Vercel/Netlify

### Single Page Only
- **Repro**: Need About page → can only generate landing page
- **Root cause**: Generator only creates single-page sites
- **Fix needed**: Multi-page generation with navigation

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| SF-1 | Visual content editor | P2 | TODO | `web/js/visual-editor.js`, `src/content-update.ts` | **What**: Build WYSIWYG editor to edit generated content inline<br>**Why**: Regenerating entire site for small changes is slow<br>**Where**: Site preview page with edit mode<br>**AC**: Click text → edit inline, drag components, reorder sections, save changes | |
| SF-2 | Multi-page site generation | P2 | TODO | `src/multi-page-generator.ts` | **What**: Generate About, Contact, Blog pages with navigation<br>**Why**: Single-page sites are limiting<br>**Where**: Enhanced generation engine<br>**AC**: Config multi-page → AI generates each page, nav menu links pages | |
| SF-3 | Vercel/Netlify deployment | P1 | TODO | `src/deployment.ts`, `web/js/deploy.js` | **What**: One-click deploy generated sites to Vercel/Netlify<br>**Why**: Manual deployment is tedious<br>**Where**: Deploy button in project view<br>**AC**: Click deploy → authenticates with Vercel → deploys → returns live URL | |
| SF-4 | Image upload + stock photos | P2 | TODO | `src/asset-manager.ts`, `web/js/image-upload.js` | **What**: Upload images for hero/sections, integrate Unsplash/Pexels<br>**Why**: Sites need custom images<br>**Where**: Asset manager + image picker UI<br>**AC**: Upload image → stored, browse Unsplash → insert, images optimized | |
| SF-5 | Font selection (3-5 options) | P3 | TODO | `src/theme-fonts.ts`, `web/js/font-picker.js` | **What**: Let users choose from curated font pairings<br>**Why**: Typography impacts design significantly<br>**Where**: Theme settings<br>**AC**: 5 font pairings, preview in editor, applies to generated HTML | |
| SF-6 | Section reordering | P3 | TODO | `web/js/section-reorder.js` | **What**: Drag-and-drop to reorder page sections<br>**Why**: Generated order may not match preferences<br>**Where**: Visual editor<br>**AC**: Drag section → reorders, save persists order, regenerates HTML | |
| SF-7 | Test suite for SiteForge | P1 | TODO | `__tests__/generation.test.ts`, `__tests__/templates.test.ts` | **What**: Add tests for AI generation + HTML templates + job queue<br>**Why**: No tests = high regression risk<br>**Where**: New `__tests__` directory<br>**AC**: 50%+ coverage, mock OpenAI, test template rendering | |
| SF-8 | Custom domain support | P3 | TODO | `src/custom-domain.ts` | **What**: Connect custom domains to deployed sites<br>**Why**: Users want professional domains<br>**Where**: Domain settings page<br>**AC**: Add domain → DNS instructions → verify → site accessible at custom domain | |
| SF-9 | Template marketplace | P3 | TODO | `src/template-marketplace.ts`, `web/templates.html` | **What**: Browse community templates, clone and customize<br>**Why**: Don't want to start from scratch<br>**Where**: Template gallery page<br>**AC**: Browse templates by industry, preview, clone, rate/review | |
| SF-10 | A/B testing for landing pages | P3 | TODO | `src/ab-testing.ts` | **What**: Create variant pages, track conversion rates<br>**Why**: Want to optimize conversions<br>**Where**: Variants feature in project<br>**AC**: Create variant → split traffic → track conversions, declare winner | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

```bash
# All tests pass (once written)
pnpm --filter siteforge test

# No TypeScript errors
pnpm --filter siteforge typecheck

# No linting errors
pnpm --filter siteforge lint

# Builds successfully
pnpm --filter siteforge build

# Manual smoke test:
# - Create project → generates site → preview renders
# - Template selection → applies correctly
# - Color scheme → changes colors
# - Export → downloads HTML
```
