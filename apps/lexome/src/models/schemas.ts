/**
 * Data schemas for Lexome
 */
import { z } from "zod";

export const BookSchema = z.object({
  id: z.string(),
  gutenbergId: z.number(),
  title: z.string(),
  author: z.string(),
  language: z.string(),
  subjects: z.array(z.string()),
  downloadUrl: z.string().url(),
  coverImageUrl: z.string().url().optional(),
  publicationYear: z.number().optional(),
  wordCount: z.number().optional(),
  format: z.enum(['epub', 'html', 'txt']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Book = z.infer<typeof BookSchema>;

export const UserBookSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bookId: z.string(),
  status: z.enum(['want_to_read', 'reading', 'finished']),
  progress: z.number().min(0).max(100), // 0-100
  currentLocation: z.string().optional(), // chapter/position
  startedAt: z.string().datetime().optional(),
  finishedAt: z.string().datetime().optional(),
  rating: z.number().min(1).max(5).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type UserBook = z.infer<typeof UserBookSchema>;

export const AnnotationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bookId: z.string(),
  textSelection: z.string(),
  startOffset: z.number(),
  endOffset: z.number(),
  noteContent: z.string().optional(),
  aiContext: z.string().optional(), // AI-generated explanation
  tags: z.array(z.string()),
  isPublic: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Annotation = z.infer<typeof AnnotationSchema>;

export const ReadingSessionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bookId: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  wordsRead: z.number().optional(),
  pagesRead: z.number().optional(),
});

export type ReadingSession = z.infer<typeof ReadingSessionSchema>;

export const BookmarkSchema = z.object({
  id: z.string(),
  userId: z.string(),
  bookId: z.string(),
  location: z.string(), // Position in the book (e.g., chapter, page, offset)
  title: z.string().optional(), // Optional user-provided title
  note: z.string().optional(), // Optional note about this bookmark
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Bookmark = z.infer<typeof BookmarkSchema>;
