import axios from 'axios';
import type {
  Book,
  UserBook,
  Annotation,
  ReadingSession,
  SearchParams,
  PaginatedResponse,
  LibraryStats,
  AIExplanation,
  AITranslation,
  AIDefinition,
  AISummary,
  AICharacterAnalysis,
  AIQuestion,
  BookRecommendation,
  Bookmark,
} from '../types';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Books API
export const booksApi = {
  search: (params: SearchParams) =>
    api.get<PaginatedResponse<Book>>('/books/search', { params }),

  getPopular: (page = 1) =>
    api.get<PaginatedResponse<Book>>('/books/popular', { params: { page } }),

  getByCategory: (category: string, page = 1) =>
    api.get<PaginatedResponse<Book>>(`/books/category/${category}`, { params: { page } }),

  getById: (id: string) =>
    api.get<Book>(`/books/${id}`),

  getContent: (id: string) =>
    api.get<{ content: string; format: string }>(`/books/${id}/content`),
};

// Library API
export const libraryApi = {
  getBooks: () =>
    api.get<UserBook[]>('/library'),

  addBook: (bookId: string, status: UserBook['status'] = 'want_to_read') =>
    api.post<UserBook>('/library/books', { bookId, status }),

  updateBook: (id: string, data: Partial<Pick<UserBook, 'status' | 'progress' | 'currentLocation' | 'rating'>>) =>
    api.patch<UserBook>(`/library/books/${id}`, data),

  removeBook: (id: string) =>
    api.delete(`/library/books/${id}`),

  getStats: () =>
    api.get<LibraryStats>('/library/stats'),
};

// Annotations API
export const annotationsApi = {
  getAll: () =>
    api.get<Annotation[]>('/annotations'),

  getByBook: (bookId: string) =>
    api.get<Annotation[]>(`/annotations/book/${bookId}`),

  create: (data: {
    bookId: string;
    textSelection: string;
    startOffset: number;
    endOffset: number;
    noteContent?: string;
    tags?: string[];
    isPublic?: boolean;
  }) =>
    api.post<Annotation>('/annotations', data),

  update: (id: string, data: Partial<Pick<Annotation, 'noteContent' | 'tags' | 'isPublic'>>) =>
    api.patch<Annotation>(`/annotations/${id}`, data),

  delete: (id: string) =>
    api.delete(`/annotations/${id}`),

  search: (query: string) =>
    api.get<Annotation[]>('/annotations/search', { params: { q: query } }),

  getTags: () =>
    api.get<string[]>('/annotations/tags'),

  getStats: () =>
    api.get<{ totalAnnotations: number; tagCount: number; publicAnnotations: number }>('/annotations/stats'),
};

// Sessions API
export const sessionsApi = {
  start: (bookId: string) =>
    api.post<ReadingSession>('/sessions/start', { bookId }),

  end: (id: string, data: { wordsRead: number; pagesRead: number; currentLocation?: string }) =>
    api.post<ReadingSession>(`/sessions/${id}/end`, data),

  getHistory: (bookId?: string) =>
    api.get<ReadingSession[]>('/sessions/history', { params: { bookId } }),

  getStats: () =>
    api.get<{
      totalSessions: number;
      totalWordsRead: number;
      totalPagesRead: number;
      totalMinutes: number;
      averageSessionLength: number;
      wordsPerMinute: number;
    }>('/sessions/stats'),

  getActive: (bookId: string) =>
    api.get<ReadingSession | null>(`/sessions/active/${bookId}`),
};

// AI API
export const aiApi = {
  explain: (text: string, bookContext: { title: string; author: string }) =>
    api.post<AIExplanation>('/ai/explain', { text, bookContext }),

  translate: (text: string, bookContext: { title: string; author: string }) =>
    api.post<AITranslation>('/ai/translate', { text, bookContext }),

  define: (word: string, context: string, bookContext: { title: string; author: string }) =>
    api.post<AIDefinition>('/ai/define', { word, context, bookContext }),

  summarize: (text: string, bookContext: { title: string; author: string }) =>
    api.post<AISummary>('/ai/summarize', { text, bookContext }),

  analyzeCharacter: (characterName: string, context: string, bookContext: { title: string; author: string }) =>
    api.post<AICharacterAnalysis>('/ai/analyze-character', { characterName, context, bookContext }),

  generateQuestions: (text: string, bookContext: { title: string; author: string }) =>
    api.post<AIQuestion[]>('/ai/questions', { text, bookContext }),

  getRecommendations: (limit = 5) =>
    api.get<BookRecommendation[]>('/ai/recommendations', { params: { limit } }),
};

// Bookmarks API
export const bookmarksApi = {
  getAll: () =>
    api.get<Bookmark[]>('/bookmarks'),

  getByBook: (bookId: string) =>
    api.get<Bookmark[]>(`/bookmarks/book/${bookId}`),

  getById: (id: string) =>
    api.get<Bookmark>(`/bookmarks/${id}`),

  create: (data: {
    bookId: string;
    position: number;
    title?: string;
    note?: string;
  }) =>
    api.post<Bookmark>('/bookmarks', data),

  update: (id: string, data: Partial<Pick<Bookmark, 'title' | 'note'>>) =>
    api.patch<Bookmark>(`/bookmarks/${id}`, data),

  delete: (id: string) =>
    api.delete(`/bookmarks/${id}`),
};

export default api;
