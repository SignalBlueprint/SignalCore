# Lexome

## TL;DR
AI-enhanced e-reader for Project Gutenberg's 70,000+ classics with React UI, annotations, and 7 AI reading features. Production-ready with full frontend and backend.

## Product Goal
- Make classic literature accessible and engaging for modern readers
- Provide AI-powered context for archaic language and historical references
- Track reading progress and offer personalized recommendations
- Enable annotation and note-taking with AI assistance

## Current Status (Reality Check)

### ✅ Working (End-to-End)
- **Gutenberg integration**: Search, browse, download 70,000+ public domain books
- **User library**: Persistent bookshelf with reading status (want_to_read, reading, finished)
- **Reading interface**: React UI with clean typography, chapter navigation, keyboard shortcuts
- **7 AI features**: Text explanation, archaic translation, definitions, summarization, character analysis, comprehension questions, recommendations
- **Annotations**: Create highlights and notes with AI-generated context
- **Reading sessions**: Track time, words read, pages read
- **Bookmarks**: Save reading positions with notes
- **Customizable settings**: Font size, line height, width, font family, dark mode
- **Rate limiting**: Tiered limits (API/AI/writes) for production safety

### 🟡 Partial (Works but Incomplete)
- **No tests**: Frontend and backend untested
- **EPUB support**: Currently HTML/text only, no EPUB reader

### ❌ Broken/Missing (Prevents "Full Fledged + Shiny")
- **No social features**: Can't share annotations or join reading groups
- **No offline mode**: Not a PWA, requires internet connection
- **No text-to-speech**: Can't listen to books

## How to Run

### Install
```bash
pnpm install
```

### Dev
```bash
# Run API + React concurrently
pnpm --filter lexome dev

# Or run separately:
pnpm --filter lexome dev:server  # API only (port 4026)
pnpm --filter lexome dev:client  # React only
```

### Test
```bash
pnpm --filter lexome test           # Run tests (once written)
pnpm --filter lexome test:ui        # Vitest UI
pnpm --filter lexome test:coverage  # With coverage
```

### Build
```bash
pnpm --filter lexome build          # Build both
pnpm --filter lexome build:client   # Client only
pnpm --filter lexome build:server   # Server only
```

### Env Vars
Required in root `.env`:
- `OPENAI_API_KEY` - For AI reading features
- `DATABASE_URL` - Supabase connection

### URLs/Ports
- **Lexome**: http://localhost:4026

## Architecture (Short)

### Stack
- **Backend**: Express.js REST API (TypeScript)
- **Frontend**: React + Vite + Tailwind CSS (TypeScript)
- **Storage**: Supabase via @sb/storage (books, user library, annotations, sessions, bookmarks)
- **AI**: OpenAI GPT-4 for 7 reading features
- **Cache**: @sb/cache for book content and AI responses
- **Rate limiting**: express-rate-limit with tiered limits

### Key Modules
- `src/server.ts` - Express API with 41+ endpoints
- `src/routes/` - Books, library, annotations, sessions, AI, bookmarks routes
- `src/services/gutenberg.ts` - Project Gutenberg API client
- `src/services/ai.ts` - AI reading assistance (7 features)
- `client/src/` - React frontend (6 pages, 8 components)

### Data Flow
- Book search → Gutenberg API → cache → frontend
- Add to library → UserBookRepository → Supabase
- Start reading → SessionRepository tracks time/progress
- Select text → AI service → GPT-4 → contextual assistance
- Create annotation → AnnotationRepository with AI context

## Known Issues

### No EPUB Support
- **Repro**: Download EPUB file → can't open in Lexome
- **Root cause**: Reader only supports HTML/text from Gutenberg
- **Workaround**: Use HTML version of book
- **Fix needed**: Add EPUB parsing library (epubjs)

### No Social Reading Features
- **Repro**: Want to share annotation → no sharing option
- **Root cause**: Annotations are private-only
- **Workaround**: Copy/paste annotation text manually
- **Fix needed**: Add public annotations, reading groups, discussions

### No Offline Mode
- **Repro**: Lose internet → can't read
- **Root cause**: Not a PWA, no service worker
- **Fix needed**: Add service worker, cache books for offline reading

## Task Queue (Autopilot)

| ID | Title | Priority | Status | Files | Acceptance Criteria | Notes/PR |
|----|-------|----------|--------|-------|---------------------|----------|
| LX-1 | Test suite (frontend + backend) | P1 | TODO | `__tests__/`, `client/src/__tests__/` | **What**: Add comprehensive tests for API routes + React components + AI features<br>**Why**: No tests = high regression risk<br>**Where**: Backend and frontend test directories<br>**AC**: 50%+ coverage, test Gutenberg integration, AI mocking, user flows | |
| LX-2 | EPUB file support | P2 | TODO | `src/epub-parser.ts`, `client/src/components/EpubReader.tsx` | **What**: Add EPUB parsing and rendering<br>**Why**: Many books available as EPUB<br>**Where**: EPUB service + React reader component<br>**AC**: Upload EPUB → parse → render with pagination, annotations work | |
| LX-3 | PWA with offline reading | P2 | TODO | `client/public/sw.js`, `client/src/hooks/useOffline.ts` | **What**: Convert to PWA with service worker for offline books<br>**Why**: Want to read without internet<br>**Where**: Service worker + offline storage<br>**AC**: Install as PWA, download books for offline, sync when online | |
| LX-4 | Social reading features | P3 | TODO | `src/social-routes.ts`, `client/src/pages/Social.tsx` | **What**: Public annotations, reading groups, discussions<br>**Why**: Reading is better together<br>**Where**: Social tab + public annotation feed<br>**AC**: Share annotations, join groups, comment on passages, see friends' highlights | |
| LX-5 | Text-to-speech | P3 | TODO | `client/src/hooks/useTextToSpeech.ts` | **What**: Add TTS to listen to books being read aloud<br>**Why**: Accessibility and multitasking<br>**Where**: Audio player in reader<br>**AC**: Play/pause, speed control, bookmark position, highlights follow narration | |
| LX-6 | Multi-format export | P3 | TODO | `src/export.ts` | **What**: Export annotations to PDF, EPUB, Markdown<br>**Why**: Want notes in other apps<br>**Where**: Export menu in library<br>**AC**: Export book + annotations, formatted nicely, preserves highlights | |
| LX-7 | Vocabulary builder | P3 | TODO | `src/vocabulary.ts`, `client/src/pages/Vocabulary.tsx` | **What**: Track looked-up words, create flashcards, quiz<br>**Why**: Learn new vocabulary while reading<br>**Where**: Vocabulary tab<br>**AC**: Save words, definitions, usage examples, spaced repetition quiz | |
| LX-8 | Reading goals and streaks | P3 | TODO | `client/src/components/ReadingGoals.tsx` | **What**: Set reading goals (books/year, minutes/day), track streaks<br>**Why**: Gamification encourages reading<br>**Where**: Dashboard + stats page<br>**AC**: Set goal, track progress, celebrate milestones, daily streaks | |
| LX-9 | Book clubs and challenges | P3 | TODO | `src/clubs.ts`, `client/src/pages/Clubs.tsx` | **What**: Create/join book clubs, participate in reading challenges<br>**Why**: Community motivation<br>**Where**: Clubs tab<br>**AC**: Create club, invite members, set reading schedule, track completion | |
| LX-10 | Advanced AI features | P3 | TODO | `src/ai-advanced.ts` | **What**: Theme analysis, writing style insights, compare translations<br>**Why**: Deeper literary analysis<br>**Where**: Enhanced AI menu<br>**AC**: Analyze themes, compare styles, suggest related books, literary criticism | |

**Priority Legend**: P0=blocker, P1=production readiness, P2=important quality/UX, P3=nice-to-have

## Release Gates

```bash
# All tests pass (once written)
pnpm --filter lexome test

# No TypeScript errors
pnpm --filter lexome typecheck

# No linting errors
pnpm --filter lexome lint

# Builds successfully
pnpm --filter lexome build

# Manual smoke test:
# - Search books → results load
# - Add to library → persists
# - Open book → renders correctly
# - Select text → AI features work
# - Create annotation → saves with AI context
# - Reading session → tracks correctly
```
