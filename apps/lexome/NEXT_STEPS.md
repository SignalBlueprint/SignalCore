# Lexome: Next Steps & Roadmap

**Document Created:** January 1, 2026
**Current Status:** Production-ready (Launched Jan 1, 2026)
**Completeness:** Backend 98%, Frontend 95%

## Executive Summary

Lexome is a fully functional AI-enhanced e-reader with 41+ API endpoints, 7 AI features, and a modern React UI. The app successfully integrates with Project Gutenberg's 70,000+ book library and provides an intelligent reading companion.

**Current State:**
- ✅ Phases 1-3 complete (Foundation, AI Enhancement, Frontend)
- ✅ All core features implemented and working
- ⚠️ Minor technical debt (event integration, test coverage)
- 🔲 Phase 4 features planned but not started

This document outlines a prioritized roadmap following SignalCore's task prioritization framework.

---

## 🔥 Priority 1: Security & Stability (1-2 weeks)

These tasks ensure production readiness and address technical debt.

### Task 1.1: Complete Event Integration
**Priority:** HIGH
**Effort:** 2-3 hours
**Impact:** Enables proper integration with SignalCore suite

**Details:**
- Address 5 TODOs in `src/routes/library.ts:9,90,126,151`
- Add Lexome event types to `@sb/events`
- Emit events for library actions:
  - `lexome.book.added` - When book added to library
  - `lexome.book.updated` - When reading status/progress updated
  - `lexome.book.removed` - When book removed from library
  - `lexome.session.started` - When reading session starts
  - `lexome.session.completed` - When reading session ends

**Files to modify:**
- `packages/events/src/types.ts` - Add Lexome event types
- `apps/lexome/src/routes/library.ts` - Uncomment and implement event publishing
- `apps/lexome/src/routes/sessions.ts` - Add session event publishing

**Acceptance Criteria:**
- [ ] All 5 TODOs resolved
- [ ] Events published to Console for activity tracking
- [ ] Events visible in Console dashboard
- [ ] No errors in event publishing

---

### Task 1.2: Implement Comprehensive Test Suite
**Priority:** HIGH
**Effort:** 1-2 weeks
**Impact:** Ensures reliability and prevents regressions

**Current State:**
- 12 test files exist but coverage is minimal
- No integration tests
- No E2E tests

**Test Coverage Goals:**

**Backend Tests (Priority):**
1. **Service Layer Tests** (~5-6 test files)
   - `gutenberg.test.ts` - Mock Gutendex API, test search/fetch/caching
   - `ai.test.ts` - Mock OpenAI, test all 7 AI features, cost tracking
   - `epub.test.ts` - Test EPUB parsing (future)

2. **Repository Layer Tests** (~5 test files)
   - Test all CRUD operations for each repository
   - Test error handling and edge cases
   - Mock @sb/storage layer

3. **Route/API Tests** (~6 test files)
   - Test all 41+ endpoints with supertest
   - Test authentication middleware
   - Test rate limiting behavior
   - Test error responses and validation

4. **Middleware Tests** (~3 test files)
   - `auth.test.ts` - Test user identification, demo mode
   - `rateLimiter.test.ts` - Test tiered rate limits
   - `requestLogger.test.ts` - Test logging behavior

**Frontend Tests (Secondary):**
1. **Component Tests** (~8 test files)
   - Test all major components with React Testing Library
   - Test AI Assistant interactions
   - Test Reading Settings panel
   - Test Chapter Navigation

2. **Integration Tests** (~3 test files)
   - Test complete user flows (search → add to library → read)
   - Test AI feature workflows
   - Test annotation creation and management

**E2E Tests (Future):**
- Playwright tests for critical user journeys
- Test reader performance with large books
- Test offline mode (when implemented)

**Acceptance Criteria:**
- [ ] Backend test coverage >80%
- [ ] Frontend test coverage >70%
- [ ] All tests passing in CI/CD
- [ ] Test documentation added to README

**Files to create:**
- `src/__tests__/services/*.test.ts`
- `src/__tests__/repositories/*.test.ts`
- `src/__tests__/routes/*.test.ts`
- `src/__tests__/middleware/*.test.ts`
- `client/src/__tests__/components/*.test.tsx`
- `client/src/__tests__/integration/*.test.tsx`

---

### Task 1.3: Complete Authentication Implementation
**Priority:** MEDIUM
**Effort:** 1 week
**Impact:** Required for multi-user production deployment

**Current State:**
- Auth middleware infrastructure exists (`src/middleware/auth.ts`)
- Currently uses optional auth with `x-user-id` header or "demo-user" fallback
- JWT validation not enforced

**Work Required:**
1. **Backend Changes:**
   - Enable JWT validation in auth middleware
   - Add proper user identification from JWT tokens
   - Add auth error handling and 401 responses
   - Update API documentation with auth requirements

2. **Frontend Changes:**
   - Integrate with @sb/auth for token management
   - Add login/logout flows
   - Store and refresh JWT tokens
   - Handle 401 responses and redirect to login

3. **Testing:**
   - Test authenticated vs unauthenticated access
   - Test token expiration and refresh
   - Test user isolation (can't access other users' data)

**Acceptance Criteria:**
- [ ] All API endpoints require valid JWT (except public endpoints)
- [ ] Frontend handles authentication state
- [ ] Users can only access their own library/annotations/sessions
- [ ] Proper error messages for auth failures
- [ ] Demo mode can be disabled via environment variable

**Files to modify:**
- `src/middleware/auth.ts` - Enable JWT validation
- `src/server.ts` - Configure auth globally
- `client/src/services/api.ts` - Add token management
- `client/src/App.tsx` - Add auth context and routing

---

### Task 1.4: Enhanced Monitoring & Logging
**Priority:** MEDIUM
**Effort:** 3-5 days
**Impact:** Better observability in production

**Current State:**
- Basic request logging exists (`src/middleware/requestLogger.ts`)
- No structured logging
- No error tracking service integration
- No performance monitoring

**Work Required:**
1. **Structured Logging:**
   - Implement JSON logging for production
   - Add log levels (debug, info, warn, error)
   - Include request IDs for tracing
   - Log AI usage and costs

2. **Error Tracking:**
   - Integrate with error tracking service (Sentry or similar)
   - Capture frontend errors
   - Track API error rates

3. **Performance Monitoring:**
   - Add timing for API endpoints
   - Track slow queries to Gutenberg API
   - Monitor AI response times
   - Track cache hit rates

4. **Alerting:**
   - Set up alerts for error spikes
   - Monitor rate limit violations
   - Track AI cost anomalies

**Acceptance Criteria:**
- [ ] All logs structured and searchable
- [ ] Errors automatically reported to tracking service
- [ ] Performance dashboards available
- [ ] Alerts configured for critical issues

---

## 🔧 Priority 2: Core Functionality Enhancements (2-4 weeks)

These tasks improve the core reading experience with high user value.

### Task 2.1: EPUB Format Support
**Priority:** HIGH
**Effort:** 1-2 weeks
**Impact:** Expands book compatibility significantly

**Current State:**
- Only HTML/text formats supported
- Dependencies already installed (epubjs, jszip)
- `src/services/epub.ts` exists (165 lines) but not integrated

**Work Required:**
1. **EPUB Service Integration:**
   - Complete epub.ts service implementation
   - Extract EPUB metadata (title, author, TOC)
   - Parse EPUB chapters
   - Handle images and embedded media
   - Cache parsed EPUB data

2. **Reader Updates:**
   - Detect book format (HTML vs EPUB)
   - Render EPUB content in reader
   - Support EPUB navigation (spine order)
   - Handle EPUB-specific styling

3. **API Updates:**
   - Update `GET /api/books/:id/content` to return EPUB data
   - Add EPUB-specific endpoints if needed
   - Update Book schema to track format

**Acceptance Criteria:**
- [ ] Can download and parse EPUB files from Gutenberg
- [ ] Reader displays EPUB content correctly
- [ ] Chapter navigation works for EPUB
- [ ] Progress tracking works for EPUB
- [ ] All existing features work with EPUB (annotations, AI, etc.)

**Files to modify:**
- `src/services/epub.ts` - Complete implementation
- `src/routes/books.ts` - Add EPUB format detection
- `client/src/pages/ReaderPage.tsx` - Add EPUB rendering
- `src/models/schemas.ts` - Update Book schema

---

### Task 2.2: Offline Reading Mode (PWA)
**Priority:** MEDIUM
**Effort:** 1 week
**Impact:** Enables reading without internet connection

**Work Required:**
1. **Service Worker Setup:**
   - Configure Vite PWA plugin
   - Cache book content for offline access
   - Cache app shell (HTML, CSS, JS)
   - Implement cache strategies (cache-first for books, network-first for API)

2. **Offline Data Management:**
   - Allow users to download books for offline reading
   - Store annotations locally with sync when online
   - Queue reading session updates for sync
   - Show offline indicator in UI

3. **Manifest & Icons:**
   - Create app manifest with name, icons, theme
   - Generate PWA icons (multiple sizes)
   - Configure install prompt

**Acceptance Criteria:**
- [ ] App installable as PWA
- [ ] Books can be downloaded for offline reading
- [ ] Annotations work offline and sync when online
- [ ] Reading progress tracked offline
- [ ] Clear UI indication of offline status

---

### Task 2.3: Multi-Format Export
**Priority:** MEDIUM
**Effort:** 1 week
**Impact:** Allows users to export annotations and highlights

**Work Required:**
1. **Export Formats:**
   - **Markdown:** Annotations with timestamps and book metadata
   - **PDF:** Formatted document with highlights and notes
   - **JSON:** Structured data for import/backup

2. **Export Endpoints:**
   - `GET /api/annotations/export?format=markdown&bookId=<id>`
   - `GET /api/library/export?format=json` - Full library backup

3. **Frontend UI:**
   - Add export button to Annotations page
   - Add export option to Library page
   - Download file to user's device
   - Show export progress for large exports

**Acceptance Criteria:**
- [ ] Can export annotations to Markdown, PDF, JSON
- [ ] Can export entire library as JSON backup
- [ ] Exported files well-formatted and readable
- [ ] Export respects user's privacy settings

---

### Task 2.4: Reading Time Estimation
**Priority:** LOW
**Effort:** 3-5 days
**Impact:** Helps users plan reading sessions

**Work Required:**
1. **Algorithm Implementation:**
   - Calculate average reading speed per user (words/minute)
   - Estimate time to finish current book
   - Estimate time to finish chapter
   - Consider reading history patterns

2. **API Updates:**
   - Add `GET /api/library/books/:id/estimate` endpoint
   - Return estimated time remaining
   - Return estimated completion date

3. **UI Integration:**
   - Show "X hours Y minutes remaining" on book cards
   - Show chapter reading time in navigation
   - Show daily reading goals and progress

**Acceptance Criteria:**
- [ ] Accurate reading time estimates based on user data
- [ ] Estimates displayed in Library and Reader
- [ ] Adapts to user's reading speed over time

---

## 📱 Priority 3: User Experience Improvements (2-4 weeks)

These tasks enhance usability and delight users.

### Task 3.1: Enhanced Book Discovery
**Priority:** MEDIUM
**Effort:** 1 week
**Impact:** Helps users find books they'll enjoy

**Work Required:**
1. **Advanced Search:**
   - Filter by publication year range
   - Filter by book length (word count)
   - Filter by reading level/complexity
   - Sort by relevance, popularity, date

2. **Smart Recommendations:**
   - "Similar books" based on current book
   - "Because you read X" recommendations
   - Trending books among Lexome users
   - Collections/lists (classics, philosophy, sci-fi)

3. **UI Enhancements:**
   - Book preview (first chapter)
   - Better book covers (fetch from Open Library API)
   - Reading difficulty indicators
   - Community ratings and reviews

**Acceptance Criteria:**
- [ ] Advanced search filters functional
- [ ] Recommendations appear on book detail pages
- [ ] Book discovery feels intuitive and helpful

---

### Task 3.2: Reading Progress Visualization
**Priority:** LOW
**Effort:** 3-5 days
**Impact:** Motivates users to read more

**Work Required:**
1. **Statistics Dashboard:**
   - Books read over time (chart)
   - Pages/words read per day (chart)
   - Reading streaks (consecutive days)
   - Total reading time
   - Favorite genres/authors

2. **Achievements/Milestones:**
   - First book finished
   - 10/50/100 books read
   - Reading streak achievements
   - Genre explorer badges

3. **UI Components:**
   - Dashboard page with charts
   - Progress widgets on Library page
   - Reading calendar/heatmap

**Acceptance Criteria:**
- [ ] Statistics dashboard shows reading history
- [ ] Charts visually appealing and informative
- [ ] Achievements unlock automatically

---

### Task 3.3: Mobile App Experience
**Priority:** MEDIUM
**Effort:** 1 week
**Impact:** Better experience on mobile devices

**Work Required:**
1. **Mobile Optimizations:**
   - Touch gestures (swipe to turn page, pinch to zoom)
   - Mobile-friendly font sizes and spacing
   - Bottom navigation for easier thumb access
   - Full-screen reading mode

2. **Performance:**
   - Lazy load book content in chunks
   - Optimize images and assets
   - Reduce bundle size
   - Add loading states

3. **Mobile-Specific Features:**
   - Text-to-speech (use Web Speech API)
   - Brightness control
   - Keep screen awake during reading

**Acceptance Criteria:**
- [ ] App responsive and usable on mobile
- [ ] Touch gestures work smoothly
- [ ] Performance acceptable on slower devices
- [ ] Text-to-speech functional

---

## 🎯 Priority 4: Strategic Features (Future)

These are longer-term initiatives for significant product evolution.

### Task 4.1: Social Reading Platform
**Priority:** FUTURE
**Effort:** 3-4 weeks
**Impact:** Creates community and engagement

**Features:**
1. **Public Annotations:**
   - Share annotations publicly
   - Browse community highlights
   - Like and comment on annotations
   - Follow users with great insights

2. **Reading Groups:**
   - Create book clubs
   - Group discussions
   - Shared reading schedules
   - Group annotations

3. **Activity Feed:**
   - See what friends are reading
   - Reading milestones
   - Book recommendations from community

**Requires:**
- Schema updates for social features
- Privacy controls and moderation
- Real-time updates (WebSockets or SSE)
- Notification system

---

### Task 4.2: Advanced AI Features
**Priority:** FUTURE
**Effort:** 2-3 weeks
**Impact:** Unique AI-powered capabilities

**Features:**
1. **Reading Coach:**
   - Personalized reading recommendations
   - Adaptive difficulty suggestions
   - Vocabulary building exercises
   - Reading comprehension tracking

2. **Academic Tools:**
   - Citation generation (MLA, APA, Chicago)
   - Thesis statement extraction
   - Theme and motif analysis
   - Essay prompt generation

3. **Multi-Language Support:**
   - Translate books to other languages
   - Side-by-side original and translation
   - Language learning mode

4. **Semantic Search:**
   - Search across all books by concept
   - Find passages similar to selected text
   - Quote finder ("who said X?")

**Requires:**
- Vector database for embeddings
- Enhanced AI prompts and models
- Translation API integration
- Increased AI budget

---

### Task 4.3: Content Creation & Publishing
**Priority:** FUTURE
**Effort:** 4-6 weeks
**Impact:** Platform expansion beyond consumption

**Features:**
1. **Author Tools:**
   - Write books within Lexome
   - EPUB export for self-publishing
   - AI writing assistance
   - Grammar and style checking

2. **Self-Publishing:**
   - Upload custom EPUB files
   - Share with Lexome community
   - Track reader engagement

3. **Annotation Publishing:**
   - Create study guides
   - Publish annotated editions
   - Share teaching materials

---

## 📊 Recommended Implementation Sequence

### Phase 1: Stabilization (Weeks 1-2)
**Goal:** Production-ready with no technical debt

1. Task 1.1: Complete Event Integration (3 hours)
2. Task 1.3: Complete Authentication (1 week)
3. Task 1.4: Enhanced Monitoring (3-5 days)

**Outcome:** Fully integrated with suite, secure, observable

---

### Phase 2: Testing Foundation (Weeks 2-4)
**Goal:** Comprehensive test coverage

1. Task 1.2: Implement Test Suite (1-2 weeks)
   - Start with backend services and routes
   - Then add frontend component tests
   - Finally add integration tests

**Outcome:** >80% backend coverage, >70% frontend coverage

---

### Phase 3: Core Features (Weeks 5-8)
**Goal:** Enhanced reading experience

1. Task 2.1: EPUB Format Support (1-2 weeks)
2. Task 2.2: Offline Reading Mode (1 week)
3. Task 2.3: Multi-Format Export (1 week)

**Outcome:** Professional-grade e-reader platform

---

### Phase 4: User Experience (Weeks 9-12)
**Goal:** Delightful, engaging product

1. Task 3.1: Enhanced Book Discovery (1 week)
2. Task 3.2: Reading Progress Visualization (3-5 days)
3. Task 3.3: Mobile App Experience (1 week)

**Outcome:** Market-ready product with great UX

---

### Phase 5: Strategic Initiatives (Months 4+)
**Goal:** Platform differentiation

1. Task 4.1: Social Reading Platform (3-4 weeks)
2. Task 4.2: Advanced AI Features (2-3 weeks)
3. Task 4.3: Content Creation & Publishing (4-6 weeks)

**Outcome:** Unique platform with network effects

---

## 🎯 Quick Wins (Can be done immediately)

These tasks provide immediate value with minimal effort:

1. **Fix Event Integration** (3 hours)
   - High value, low effort
   - Unblocks Console integration

2. **Add Reading Time Estimation** (3-5 days)
   - Users love this feature
   - Simple algorithm based on existing data

3. **Improve Book Covers** (2-3 days)
   - Fetch better covers from Open Library API
   - Significantly improves visual appeal

4. **Add Keyboard Shortcuts Help** (1 day)
   - Already have shortcuts, just need help modal
   - Improves discoverability

5. **Export Annotations to Markdown** (2-3 days)
   - Highly requested feature
   - Simple implementation

---

## 📝 Notes & Considerations

### Technical Debt Priority
1. Event integration - Quick fix, high value
2. Test coverage - Critical for maintainability
3. Authentication - Required for real multi-user deployment
4. Monitoring - Essential for production operations

### User Value Priority
1. EPUB support - Dramatically expands book availability
2. Offline mode - Makes app usable anywhere
3. Better discovery - Helps users find books they'll love
4. Mobile experience - Where most reading happens

### Resource Allocation
- **Week 1-4:** Focus on technical debt (1.1-1.4, 2.1)
- **Week 5-8:** Focus on core features (2.1-2.3)
- **Week 9-12:** Focus on UX improvements (3.1-3.3)
- **Month 4+:** Strategic initiatives (4.1-4.3)

### Success Metrics
- **Stability:** >99% uptime, <1% error rate
- **Quality:** >80% test coverage, 0 critical bugs
- **Engagement:** >50% weekly active users, >30min avg session
- **Growth:** 20% MoM user growth, >40% retention at 30 days

---

## 🚀 Getting Started

To begin implementation, recommended order:

1. **Read this document thoroughly**
2. **Start with Task 1.1** (Event Integration - Quick win)
3. **Move to Task 1.3** (Authentication - High priority)
4. **Parallel effort on Task 1.2** (Tests - Can be done incrementally)
5. **Then tackle Task 2.1** (EPUB - High user value)

Each task has clear acceptance criteria and file references to guide implementation.

---

**Document Maintenance:**
- Update this document as tasks are completed
- Add new tasks as product evolves
- Adjust priorities based on user feedback
- Review quarterly for strategic alignment
