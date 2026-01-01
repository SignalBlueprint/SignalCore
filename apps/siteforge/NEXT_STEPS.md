# SiteForge - Next Steps Plan

**Date:** January 1, 2026
**Current Status:** Fully Functional (v1.1)
**Last Major Update:** Template Variations System (Jan 1, 2026)

---

## Executive Summary

SiteForge is a fully functional AI-powered website generator with:
- ✅ Complete generation pipeline (AI content + HTML)
- ✅ 3 template styles (Modern, Minimal, Bold)
- ✅ 4 industry-specific color palettes
- ✅ Background job processing
- ✅ Project management UI
- ✅ Export and preview capabilities

**Recommendation:** Focus on **Priority 1** features to maximize user value and adoption.

---

## Phase 1: Advanced Visual Customization (Highest Impact)
**Timeline:** Next 2-4 weeks
**Goal:** Enable users to customize generated sites without code

### 1.1 In-Place Content Editing
**Impact:** HIGH - Users can fix AI-generated content directly
**Complexity:** MEDIUM

**Tasks:**
- [ ] Add editable content fields to project model
- [ ] Create component editor UI with inline editing
- [ ] Implement save/update API for edited content
- [ ] Regenerate HTML with updated content (skip AI call)
- [ ] Add "Edit" mode toggle in preview

**Technical Approach:**
- Store original AI-generated content + user edits separately
- Allow re-generation with edited content as overrides
- Use `contenteditable` divs or textarea for editing

**Files to Modify:**
- `apps/siteforge/src/server.ts` - Add PATCH endpoint for content
- `apps/siteforge/public/app.js` - Add editor UI
- `packages/schemas/src/domains/siteforge.ts` - Add content overrides field
- `apps/siteforge/src/html-generator.ts` - Merge original + edits

---

### 1.2 Color Theme Customization
**Impact:** HIGH - Visual identity is critical for brands
**Complexity:** LOW

**Tasks:**
- [ ] Add color picker UI for primary, secondary, accent colors
- [ ] Create real-time preview of color changes
- [ ] Update ColorScheme in project model
- [ ] Regenerate CSS with custom colors (no AI call needed)
- [ ] Add preset color palettes (10-15 options)

**Technical Approach:**
- Extend existing ColorScheme system
- Add color picker component (use `<input type="color">` or library)
- Regenerate only CSS, not HTML content

**Files to Modify:**
- `apps/siteforge/public/index.html` - Add color picker UI
- `apps/siteforge/public/app.js` - Add color update logic
- `apps/siteforge/src/template-styles.ts` - Accept custom colors
- `apps/siteforge/src/server.ts` - Add color update endpoint

---

### 1.3 Font Selection
**Impact:** MEDIUM - Affects brand identity
**Complexity:** LOW

**Tasks:**
- [ ] Select 5-7 Google Fonts (varied styles)
- [ ] Add font family dropdown to UI
- [ ] Update CSS generator with selected fonts
- [ ] Add font preview in selection dropdown

**Recommended Fonts:**
- Headings: Inter, Montserrat, Playfair Display, Poppins
- Body: Open Sans, Roboto, Lato, Source Sans Pro

**Technical Approach:**
- Add Google Fonts CDN links to HTML
- Store font selection in project model
- Generate CSS with font-family variables

**Files to Modify:**
- `apps/siteforge/src/html-generator.ts` - Add Google Fonts link
- `apps/siteforge/src/template-styles.ts` - Use font variables
- `packages/schemas/src/domains/siteforge.ts` - Add fontFamily field

---

### 1.4 Section Reordering
**Impact:** MEDIUM - Improves flexibility
**Complexity:** MEDIUM

**Tasks:**
- [ ] Add drag-and-drop component ordering UI
- [ ] Store component order in project model
- [ ] Regenerate HTML with custom order
- [ ] Add visual indicators (drag handles)

**Technical Approach:**
- Use simple drag-and-drop (HTML5 or lightweight library)
- Store component order as array of component IDs
- HTML generator respects custom order

**Files to Modify:**
- `apps/siteforge/public/app.js` - Add drag-drop logic
- `apps/siteforge/src/html-generator.ts` - Use component order
- `packages/schemas/src/domains/siteforge.ts` - Add componentOrder field

---

## Phase 2: Multi-Page Generation (Expand Capability)
**Timeline:** 4-6 weeks
**Goal:** Generate complete multi-page websites

### 2.1 About Page Generation
**Impact:** HIGH - Essential for credibility
**Complexity:** MEDIUM

**Tasks:**
- [ ] Create About page AI prompts (mission, team, values)
- [ ] Add About page components (team grid, timeline, values)
- [ ] Generate About page HTML template
- [ ] Add About page to navigation
- [ ] Update project model for multi-page structure

**Components Needed:**
- Team member grid (photo, name, title, bio)
- Company timeline/milestones
- Values/mission statement
- Company story narrative

**Files to Create:**
- `apps/siteforge/src/pages/about-generator.ts`

**Files to Modify:**
- `apps/siteforge/src/ai-content-generator.ts` - Add About prompts
- `packages/schemas/src/domains/siteforge.ts` - Add Page type

---

### 2.2 Contact Page with Form
**Impact:** HIGH - Critical for lead generation
**Complexity:** MEDIUM-HIGH

**Tasks:**
- [ ] Generate contact form HTML
- [ ] Add form backend (email integration)
- [ ] Configure email service (SendGrid, AWS SES, or Resend)
- [ ] Add contact info section (address, phone, email)
- [ ] Map integration (optional - Google Maps embed)

**Form Fields:**
- Name, Email, Phone (optional), Subject, Message
- reCAPTCHA for spam protection
- Success/error message handling

**Technical Decisions:**
- **Option A:** Generate static form + provide webhook URL for user
- **Option B:** Integrate with suite email service (if available)
- **Option C:** Use third-party form service (Formspree, etc.)

**Files to Create:**
- `apps/siteforge/src/pages/contact-generator.ts`

---

### 2.3 Navigation System
**Impact:** HIGH - Required for multi-page sites
**Complexity:** LOW

**Tasks:**
- [ ] Generate navigation menu HTML
- [ ] Add responsive mobile menu (hamburger)
- [ ] Update all pages with consistent nav
- [ ] Add active page highlighting

**Files to Modify:**
- `apps/siteforge/src/html-generator.ts` - Add nav component

---

## Phase 3: Deployment Integration (Critical for Adoption)
**Timeline:** 6-8 weeks
**Goal:** Enable one-click publishing

### 3.1 Static File Export
**Impact:** HIGH - Immediate value, low barrier
**Complexity:** LOW

**Tasks:**
- [ ] Generate complete file structure (HTML, CSS, images)
- [ ] Create ZIP archive of site
- [ ] Add download button to UI
- [ ] Include basic README with instructions

**File Structure:**
```
exported-site/
├── index.html
├── about.html (if multi-page)
├── contact.html (if multi-page)
├── assets/
│   ├── style.css
│   └── images/
└── README.txt
```

**Files to Modify:**
- `apps/siteforge/src/server.ts` - Add export endpoint
- Create archiver utility (using `archiver` npm package)

---

### 3.2 Vercel Deployment Integration
**Impact:** VERY HIGH - Professional hosting in one click
**Complexity:** MEDIUM-HIGH

**Tasks:**
- [ ] Create Vercel app integration
- [ ] Add "Deploy to Vercel" button
- [ ] OAuth flow for Vercel authentication
- [ ] Automatic project creation and deployment
- [ ] Display deployment URL after success

**Technical Approach:**
- Use Vercel API for deployment
- Store Vercel access token (encrypted)
- Push site files to Vercel via API
- Poll deployment status

**Required:**
- Vercel API credentials
- OAuth setup
- Deployment configuration

**Files to Create:**
- `apps/siteforge/src/deployment/vercel-deployer.ts`

---

### 3.3 Netlify Deployment Integration
**Impact:** HIGH - Alternative to Vercel
**Complexity:** MEDIUM-HIGH

**Similar approach to Vercel:**
- Netlify API integration
- OAuth flow
- Automatic deployment
- Status tracking

---

## Phase 4: Visual Builder (Long-term Goal)
**Timeline:** 8-12 weeks
**Goal:** Drag-and-drop website builder

### 4.1 Component Palette
- Library of draggable components
- Visual preview of each component
- Add to page via drag-drop

### 4.2 Live Preview Editor
- WYSIWYG editing
- Real-time changes
- Undo/redo functionality

### 4.3 Component Customization
- Edit component properties (text, colors, images)
- Resize and reposition
- Duplicate and delete components

**Complexity:** VERY HIGH
**Recommendation:** Consider third-party builder (GrapesJS, Builder.io SDK) instead of building from scratch

---

## Phase 5: Asset Management & Advanced Features
**Timeline:** 12+ weeks

### 5.1 Stock Photo Integration
- Unsplash API integration
- Search and insert images
- Automatic image optimization

### 5.2 Image Upload
- Upload custom images
- Image optimization (resize, compress)
- CDN integration for hosting

### 5.3 Contact Form Backend
- Email delivery service
- Form submission storage
- Webhook notifications

### 5.4 Analytics Integration
- Google Analytics setup
- Plausible Analytics option
- Basic tracking code injection

### 5.5 SEO Tools
- Meta tag editor
- Sitemap generation
- robots.txt generation
- Open Graph preview

---

## Quick Wins (Immediate Impact, Low Effort)

### 1. Fix Registry Inconsistency
**Effort:** 5 minutes
**Impact:** Consistency

- [ ] Update `packages/suite/src/registry.ts`
- Change port from 4022 to 4024
- Update status from "skeleton" to "production"

### 2. Add More Template Styles
**Effort:** 2-3 hours
**Impact:** Variety

- [ ] Add "Classic" style (serif fonts, traditional)
- [ ] Add "Tech" style (futuristic, gradients)
- [ ] Add "Playful" style (rounded, colorful)

**Files to Modify:**
- `apps/siteforge/src/template-styles.ts`

### 3. Image Placeholders
**Effort:** 1-2 hours
**Impact:** Visual appeal

- [ ] Replace text placeholders with images
- [ ] Use placeholder image service (placeholder.com, picsum.photos)
- [ ] Add industry-appropriate images

### 4. Mobile Preview Mode
**Effort:** 2-3 hours
**Impact:** User experience

- [ ] Add mobile/tablet/desktop preview toggle
- [ ] Responsive iframe for preview
- [ ] Device frame visualization

---

## Recommended Priority Order

### Immediate (Next 2 Weeks)
1. ✅ Fix registry inconsistency
2. 🎨 In-place content editing
3. 🎨 Color theme customization
4. 📱 Mobile preview mode

### Short-term (2-4 Weeks)
5. 🎨 Font selection
6. 📥 Static file export (ZIP download)
7. 🎨 Section reordering
8. 🖼️ Image placeholders

### Medium-term (1-2 Months)
9. 📄 About page generation
10. 📧 Contact page with form
11. 🚀 Vercel deployment integration
12. 🎨 Additional template styles

### Long-term (2-3+ Months)
13. 🚀 Netlify deployment integration
14. 🖼️ Stock photo integration
15. 🏗️ Visual builder (consider third-party)
16. 📊 Analytics integration

---

## Technical Considerations

### Dependencies to Add
- `archiver` - For ZIP file creation
- `@vercel/sdk` or API client - Vercel integration
- `netlify` - Netlify CLI/API
- `sharp` - Image optimization (if adding uploads)
- `nodemailer` - Email sending (if contact form backend)

### Infrastructure Needs
- **File Storage:** For uploaded images (S3, Cloudflare R2, or Supabase Storage)
- **Email Service:** For contact forms (SendGrid, AWS SES, Resend)
- **CDN:** For asset hosting (Cloudflare, AWS CloudFront)

### Security Considerations
- Sanitize user input in content editor (prevent XSS)
- Rate limit generation API (prevent abuse)
- Secure API keys for deployment services
- Validate file uploads (size, type, content)

### Performance Optimizations
- Cache generated HTML for unchanged projects
- Lazy load preview iframe
- Debounce real-time color/font preview
- Background processing for deployments

---

## Success Metrics

### Adoption Metrics
- Number of projects created per week
- Generation success rate (target: >95%)
- Average time from creation to deployment

### User Engagement
- Projects with edited content (target: >60%)
- Projects with custom colors (target: >40%)
- Deployed projects (target: >30%)

### Technical Metrics
- Generation time (target: <30 seconds)
- AI cost per project (monitor OpenAI spend)
- Error rate (target: <5%)

---

## Risk Assessment

### Low Risk
- Color customization
- Font selection
- Static export
- Registry fixes

### Medium Risk
- In-place editing (state management complexity)
- Section reordering (UI complexity)
- Multi-page generation (prompt engineering)

### High Risk
- Deployment integrations (API dependencies, auth complexity)
- Visual builder (massive scope)
- Form backend (spam, deliverability)
- Image hosting (storage costs)

---

## Conclusion

SiteForge has a solid foundation and is ready for feature expansion. The recommended approach is:

1. **Start with customization** (Phase 1) - Highest user value, lowest risk
2. **Add export capability** - Enable users to take sites elsewhere
3. **Expand to multi-page** (Phase 2) - Increase usefulness
4. **Add deployment** (Phase 3) - Complete the workflow
5. **Consider visual builder** (Phase 4) - Only if resources allow

**Next Action:** Begin with in-place content editing + color customization as these provide immediate user value with reasonable complexity.
