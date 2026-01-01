/**
 * Book Repository - Manages book data storage
 */
import { storage } from "@sb/storage";
import type { Book } from "../models/schemas";

const BOOKS_KIND = "lexome-books";

export class BookRepository {
  /**
   * Get a book by ID
   */
  async get(id: string): Promise<Book | null> {
    return storage.get<Book>(BOOKS_KIND, id);
  }

  /**
   * Get a book by Gutenberg ID
   */
  async getByGutenbergId(gutenbergId: number): Promise<Book | null> {
    const results = await storage.list<Book>(
      BOOKS_KIND,
      (book) => book.gutenbergId === gutenbergId
    );
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new book
   */
  async create(book: Book): Promise<Book> {
    await storage.upsert(BOOKS_KIND, book);
    return book;
  }

  /**
   * Update an existing book
   */
  async update(id: string, updates: Partial<Book>): Promise<Book | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert(BOOKS_KIND, updated);
    return updated;
  }

  /**
   * Delete a book
   */
  async delete(id: string): Promise<boolean> {
    await storage.remove(BOOKS_KIND, id);
    return true;
  }

  /**
   * List all books with optional filtering
   */
  async list(filter?: (book: Book) => boolean): Promise<Book[]> {
    return storage.list<Book>(BOOKS_KIND, filter);
  }

  /**
   * Search books by title or author
   */
  async search(query: string): Promise<Book[]> {
    const lowerQuery = query.toLowerCase();
    return this.list(
      (book) =>
        book.title.toLowerCase().includes(lowerQuery) ||
        book.author.toLowerCase().includes(lowerQuery)
    );
  }
}

export const bookRepository = new BookRepository();
