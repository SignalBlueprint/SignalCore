# Lexome

**Status:** 🟡 WIP - Core features in development
**Port:** 4026

AI-enhanced e-reader that connects to Project Gutenberg library, providing valuable context, annotations, and reading assistance during reading sessions.

## Purpose

Lexome transforms classic literature reading into an enriched, interactive experience by leveraging AI to provide real-time context, historical background, character analysis, and literary insights. By connecting to the vast Project Gutenberg library of public domain books, Lexome makes classic literature more accessible and engaging for modern readers.

## Vision

Create an intelligent reading companion that:
- Makes classic literature more approachable through contextual AI assistance
- Provides instant explanations of archaic language, historical references, and cultural context
- Tracks reading progress and offers personalized recommendations
- Enables social reading with shared annotations and discussions
- Integrates AI-powered features without disrupting the reading flow

## Core Features (Planned)

### Phase 1: Foundation (Weeks 1-2)
1. **Gutenberg Library Integration**
   - Connect to Project Gutenberg API/catalog
   - Search and browse 70,000+ public domain books
   - Download and cache book content (EPUB, HTML, plain text)
   - Metadata extraction (author, title, genre, year, language)
   - Book cover image generation/retrieval

2. **Basic Reading Interface**
   - Clean, distraction-free reading view
   - EPUB/HTML rendering with proper typography
   - Page/chapter navigation
   - Bookmark functionality
   - Reading progress tracking
   - Dark/light theme support

3. **User Library Management**
   - Personal bookshelf with added books
   - Reading status (want to read, reading, finished)
   - Progress indicators (% complete, pages read)
   - Reading history and statistics
   - Search within personal library

### Phase 2: AI Enhancement (Weeks 3-4)
4. **Contextual AI Assistance**
   - Text selection → AI-powered explanations
   - Historical context for time periods and events
   - Character analysis and relationship mapping
   - Archaic language translation to modern English
   - Cultural references and allusions explained
   - Literary devices and techniques highlighted

5. **Smart Annotations**
   - AI-generated chapter summaries
   - Key themes and motifs identification
   - Question-answering about plot and characters
   - Personal note-taking with AI suggestions
   - Quote extraction and organization
   - Export annotations to markdown/PDF

6. **Reading Intelligence**
   - Estimated reading time for chapters/books
   - Vocabulary complexity analysis
   - Reading level assessment
   - Personalized pacing suggestions
   - Comprehension check questions

### Phase 3: Social & Advanced (Weeks 5-6)
7. **Social Reading Features**
   - Public/private annotations sharing
   - Reading groups and book clubs
   - Discussion threads on specific passages
   - Recommended reading lists
   - Follow other readers

8. **Personalized Recommendations**
   - AI-powered book recommendations based on reading history
   - Similar books and authors discovery
   - Genre and theme-based suggestions
   - Reading challenge creation (e.g., "Read 5 Victorian novels")

9. **Advanced Features**
   - Text-to-speech with AI voices
   - Multi-language support for books
   - Side-by-side original + translation view
   - Integration with external research tools
   - Academic citation generation

## Architecture

### Technology Stack
- **Backend**: Express.js REST API
- **Frontend**: React SPA with TypeScript
- **Storage**: Supabase via `@sb/storage` for user data
- **AI**: OpenAI GPT-4 for context and analysis
- **Cache**: Redis via `@sb/cache` for book content and AI responses
- **Events**: `@sb/events` for reading activity tracking
- **Vector Search**: Book embeddings for semantic search and recommendations

### Data Models

**Book**
```typescript
{
  id: string;
  gutenbergId: number;
  title: string;
  author: string;
  language: string;
  subjects: string[];
  downloadUrl: string;
  coverImageUrl?: string;
  publicationYear?: number;
  wordCount?: number;
  format: 'epub' | 'html' | 'txt';
}
```

**UserBook**
```typescript
{
  id: string;
  userId: string;
  bookId: string;
  status: 'want_to_read' | 'reading' | 'finished';
  progress: number; // 0-100
  currentLocation: string; // chapter/position
  startedAt?: Date;
  finishedAt?: Date;
  rating?: number; // 1-5
}
```

**Annotation**
```typescript
{
  id: string;
  userId: string;
  bookId: string;
  textSelection: string;
  startOffset: number;
  endOffset: number;
  noteContent?: string;
  aiContext?: string; // AI-generated explanation
  tags: string[];
  isPublic: boolean;
  createdAt: Date;
}
```

**ReadingSession**
```typescript
{
  id: string;
  userId: string;
  bookId: string;
  startedAt: Date;
  endedAt: Date;
  wordsRead: number;
  pagesRead: number;
}
```

## API Endpoints (Planned)

### Books
- `GET /api/books/search` - Search Gutenberg library
- `GET /api/books/browse` - Browse by category/author
- `GET /api/books/:id` - Get book details
- `GET /api/books/:id/content` - Get book content
- `POST /api/books/:id/download` - Cache book locally

### User Library
- `GET /api/library` - Get user's bookshelf
- `POST /api/library/books` - Add book to library
- `PATCH /api/library/books/:id` - Update reading status/progress
- `DELETE /api/library/books/:id` - Remove from library
- `GET /api/library/stats` - Reading statistics

### Annotations
- `GET /api/books/:bookId/annotations` - Get annotations for book
- `POST /api/annotations` - Create annotation
- `PATCH /api/annotations/:id` - Update annotation
- `DELETE /api/annotations/:id` - Delete annotation
- `POST /api/annotations/ai-context` - Generate AI context for selection

### Reading Sessions
- `POST /api/sessions/start` - Start reading session
- `POST /api/sessions/:id/end` - End session with progress
- `GET /api/sessions/history` - Get reading history

### AI Features
- `POST /api/ai/explain` - Explain selected text
- `POST /api/ai/summarize` - Generate chapter/book summary
- `POST /api/ai/analyze-character` - Character analysis
- `GET /api/ai/recommendations` - Get book recommendations

## Integration with Suite

Lexome integrates with other Signal Blueprint apps:
- **Console** - Reading activity metrics and user analytics
- **Worker** - Scheduled jobs for book catalog updates and cache cleanup
- **Events** - Reading session tracking and user activity
- **Storage** - User library, annotations, and preferences
- **AI** - GPT-4 integration for context and analysis
- **Cache** - Book content and AI response caching

## Environment Variables

| Name | Description | Default |
| --- | --- | --- |
| `PORT` | Port for the Lexome API server | `4024` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `OPENAI_API_KEY` | OpenAI API key for AI features | Required |
| `GUTENBERG_API_URL` | Project Gutenberg API endpoint | `https://gutendex.com` |
| `CACHE_ENABLED` | Enable book content caching | `true` |

## Development Tasks

### Phase 1: Foundation ✅ Ready to Start

**Task 1.1: Project Setup**
- [ ] Create package.json with dependencies
- [ ] Set up TypeScript configuration
- [ ] Create basic Express.js server structure
- [ ] Configure environment variables
- [ ] Set up development scripts
- [ ] Initialize basic folder structure (src/routes, src/services, src/models)

**Task 1.2: Gutenberg Integration**
- [ ] Research Project Gutenberg API (Gutendex)
- [ ] Create GutenbergService for API communication
- [ ] Implement book search endpoint
- [ ] Implement book details retrieval
- [ ] Implement book content download
- [ ] Add error handling and rate limiting
- [ ] Write tests for Gutenberg service

**Task 1.3: Storage Layer**
- [ ] Define Book schema with Zod (@sb/schemas)
- [ ] Define UserBook schema with Zod
- [ ] Create BookRepository using @sb/storage
- [ ] Create UserBookRepository using @sb/storage
- [ ] Implement CRUD operations
- [ ] Add database migrations for Supabase
- [ ] Write repository tests

**Task 1.4: Core API Endpoints**
- [ ] POST /api/books/search - Search Gutenberg catalog
- [ ] GET /api/books/:id - Get book details
- [ ] GET /api/books/:id/content - Download/retrieve content
- [ ] POST /api/library/books - Add to user library
- [ ] GET /api/library - List user's books
- [ ] PATCH /api/library/books/:id - Update status/progress
- [ ] Add request validation middleware
- [ ] Add authentication middleware (@sb/auth)

### Phase 2: Frontend Foundation

**Task 2.1: React Setup**
- [ ] Create React app with Vite
- [ ] Set up React Router for navigation
- [ ] Configure TypeScript for frontend
- [ ] Set up Tailwind CSS or styling solution
- [ ] Create basic layout components (Header, Sidebar, Footer)
- [ ] Set up API client with fetch/axios

**Task 2.2: Book Discovery UI**
- [ ] Create Search page with filters
- [ ] Create Browse page with categories
- [ ] Create BookCard component
- [ ] Create BookDetail page
- [ ] Implement "Add to Library" functionality
- [ ] Add loading states and error handling

**Task 2.3: Library Management UI**
- [ ] Create Library page with bookshelf view
- [ ] Create filter/sort controls (status, author, progress)
- [ ] Implement reading status updates
- [ ] Add progress tracking UI
- [ ] Create reading statistics dashboard
- [ ] Add book removal functionality

**Task 2.4: Reader Interface**
- [ ] Create Reader component for book display
- [ ] Implement EPUB/HTML rendering
- [ ] Add chapter navigation
- [ ] Implement bookmark functionality
- [ ] Add progress tracking (auto-save position)
- [ ] Create settings panel (font size, theme, spacing)
- [ ] Add dark/light mode toggle

### Phase 3: AI Enhancement

**Task 3.1: AI Service Setup**
- [ ] Create AIService using @sb/ai
- [ ] Implement text explanation endpoint
- [ ] Implement summarization endpoint
- [ ] Add character analysis endpoint
- [ ] Set up telemetry tracking (@sb/telemetry)
- [ ] Implement caching for AI responses (@sb/cache)
- [ ] Add cost tracking and limits

**Task 3.2: Contextual Assistance UI**
- [ ] Add text selection handler in Reader
- [ ] Create ContextMenu component for selected text
- [ ] Implement "Explain" feature with AI
- [ ] Add "Translate" for archaic language
- [ ] Show historical context panel
- [ ] Add loading indicators for AI requests
- [ ] Implement error handling for AI failures

**Task 3.3: Annotations System**
- [ ] Define Annotation schema with Zod
- [ ] Create AnnotationRepository
- [ ] Implement annotation CRUD endpoints
- [ ] Create Annotation UI component
- [ ] Add highlight rendering in Reader
- [ ] Implement annotation sidebar/panel
- [ ] Add AI-suggested annotations
- [ ] Export annotations to markdown

**Task 3.4: Reading Intelligence**
- [ ] Implement reading time estimation
- [ ] Add vocabulary complexity analysis
- [ ] Create comprehension questions generator
- [ ] Build reading statistics tracker
- [ ] Add reading pace analysis
- [ ] Create insights dashboard

### Phase 4: Advanced Features

**Task 4.1: Recommendations Engine**
- [ ] Generate book embeddings using OpenAI
- [ ] Store embeddings in vector database
- [ ] Implement semantic similarity search
- [ ] Create recommendation algorithm
- [ ] Build recommendations API endpoint
- [ ] Create Recommendations UI page

**Task 4.2: Social Features**
- [ ] Add public annotations sharing
- [ ] Create reading groups/clubs schema
- [ ] Implement discussion threads
- [ ] Add user following system
- [ ] Create activity feed
- [ ] Build social features UI

**Task 4.3: Polish & Production**
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Create health check endpoint
- [ ] Write integration tests
- [ ] Performance optimization
- [ ] Documentation and API reference
- [ ] Deployment configuration

## Quick Start (When Implemented)

```bash
# Install dependencies (from monorepo root)
pnpm install

# Set up environment variables
cp ../../.env.example ../../.env
# Add OPENAI_API_KEY to .env

# Run the development server
pnpm --filter lexome dev
```

Then open `http://localhost:4026` in your browser.

## Contributing

See the main [Contributing Guide](../../docs/CONTRIBUTING.md) for development guidelines and best practices.

## Documentation

- [Main Suite README](../../README.md) - Complete suite overview
- [Suite Map](../../docs/SUITE_MAP.md) - App registry and architecture
- [Project Gutenberg](https://www.gutenberg.org) - Source library
- [Gutendex API](https://gutendex.com) - Gutenberg API documentation

## License

This project uses content from Project Gutenberg, which is in the public domain. The application code follows the monorepo license.
