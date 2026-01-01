/**
 * Annotation Repository - Manages user annotations and notes
 */
import { storage } from "@sb/storage";
import type { Annotation } from "../models/schemas";

const ANNOTATIONS_KIND = "lexome-annotations";

export class AnnotationRepository {
  /**
   * Get an annotation by ID
   */
  async get(id: string): Promise<Annotation | null> {
    return storage.get<Annotation>(ANNOTATIONS_KIND, id);
  }

  /**
   * Create a new annotation
   */
  async create(annotation: Annotation): Promise<Annotation> {
    await storage.upsert(ANNOTATIONS_KIND, annotation);
    return annotation;
  }

  /**
   * Update an existing annotation
   */
  async update(
    id: string,
    updates: Partial<Annotation>
  ): Promise<Annotation | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert(ANNOTATIONS_KIND, updated);
    return updated;
  }

  /**
   * Delete an annotation
   */
  async delete(id: string): Promise<boolean> {
    await storage.remove(ANNOTATIONS_KIND, id);
    return true;
  }

  /**
   * Get all annotations for a book
   */
  async getBookAnnotations(
    bookId: string,
    options?: {
      userId?: string;
      includePublic?: boolean;
    }
  ): Promise<Annotation[]> {
    const result = await storage.list<Annotation>(ANNOTATIONS_KIND, (ann) => {
      if (ann.bookId !== bookId) return false;

      // If userId is specified, return user's annotations + public ones
      if (options?.userId) {
        if (ann.userId === options.userId) return true;
        if (options.includePublic && ann.isPublic) return true;
        return false;
      }

      // If no userId, return only public annotations
      return ann.isPublic;
    });

    // Sort by position in book (startOffset)
    return result.sort((a, b) => a.startOffset - b.startOffset);
  }

  /**
   * Get all annotations for a user
   */
  async getUserAnnotations(
    userId: string,
    options?: {
      bookId?: string;
      tags?: string[];
    }
  ): Promise<Annotation[]> {
    const result = await storage.list<Annotation>(ANNOTATIONS_KIND, (ann) => {
      if (ann.userId !== userId) return false;
      if (options?.bookId && ann.bookId !== options.bookId) return false;
      if (
        options?.tags &&
        options.tags.length > 0 &&
        !options.tags.some((tag) => ann.tags.includes(tag))
      ) {
        return false;
      }
      return true;
    });

    // Sort by createdAt descending (most recent first)
    return result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Search annotations by text
   */
  async searchAnnotations(
    userId: string,
    query: string
  ): Promise<Annotation[]> {
    const lowerQuery = query.toLowerCase();
    const annotations = await this.getUserAnnotations(userId);

    return annotations.filter(
      (ann) =>
        ann.textSelection.toLowerCase().includes(lowerQuery) ||
        ann.noteContent?.toLowerCase().includes(lowerQuery) ||
        ann.aiContext?.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get annotations by tag
   */
  async getAnnotationsByTag(userId: string, tag: string): Promise<Annotation[]> {
    return this.getUserAnnotations(userId, { tags: [tag] });
  }

  /**
   * Get all tags used by a user
   */
  async getUserTags(userId: string): Promise<string[]> {
    const annotations = await this.getUserAnnotations(userId);
    const tagsSet = new Set<string>();

    annotations.forEach((ann) => {
      ann.tags.forEach((tag) => tagsSet.add(tag));
    });

    return Array.from(tagsSet).sort();
  }

  /**
   * Get annotation statistics for a user
   */
  async getUserAnnotationStats(userId: string): Promise<{
    totalAnnotations: number;
    publicAnnotations: number;
    privateAnnotations: number;
    totalTags: number;
    booksAnnotated: number;
  }> {
    const annotations = await this.getUserAnnotations(userId);
    const uniqueBooks = new Set(annotations.map((ann) => ann.bookId));
    const tags = await this.getUserTags(userId);

    return {
      totalAnnotations: annotations.length,
      publicAnnotations: annotations.filter((ann) => ann.isPublic).length,
      privateAnnotations: annotations.filter((ann) => !ann.isPublic).length,
      totalTags: tags.length,
      booksAnnotated: uniqueBooks.size,
    };
  }
}

export const annotationRepository = new AnnotationRepository();
