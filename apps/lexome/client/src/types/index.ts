export interface Book {
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

export interface UserBook {
  id: string;
  userId: string;
  bookId: string;
  status: 'want_to_read' | 'reading' | 'finished';
  progress: number;
  currentLocation?: string;
  startedAt?: string;
  finishedAt?: string;
  rating?: number;
  book?: Book;
}

export interface Annotation {
  id: string;
  userId: string;
  bookId: string;
  textSelection: string;
  startOffset: number;
  endOffset: number;
  noteContent?: string;
  aiContext?: string;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ReadingSession {
  id: string;
  userId: string;
  bookId: string;
  startedAt: string;
  endedAt?: string;
  wordsRead: number;
  pagesRead: number;
}

export interface SearchParams {
  q?: string;
  author?: string;
  topic?: string;
  language?: string;
  page?: number;
}

export interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next?: string;
  previous?: string;
}

export interface LibraryStats {
  totalBooks: number;
  booksReading: number;
  booksFinished: number;
  booksWantToRead: number;
  totalPagesRead: number;
  totalWordsRead: number;
  averageRating: number;
}

export interface AIExplanation {
  explanation: string;
  historicalContext?: string;
  culturalContext?: string;
}

export interface AITranslation {
  modernText: string;
  explanation: string;
}

export interface AIDefinition {
  word: string;
  definition: string;
  contextualMeaning: string;
  etymology?: string;
}

export interface AISummary {
  summary: string;
  keyPoints: string[];
  themes: string[];
}

export interface AICharacterAnalysis {
  character: string;
  traits: string[];
  motivations: string[];
  relationships: Array<{
    character: string;
    relationship: string;
  }>;
  development: string;
}

export interface AIQuestion {
  question: string;
  type: 'comprehension' | 'analysis' | 'inference';
}

export interface BookRecommendation {
  book: Book;
  reason: string;
  similarity: number;
}
