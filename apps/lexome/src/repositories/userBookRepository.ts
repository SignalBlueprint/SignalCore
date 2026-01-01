/**
 * UserBook Repository - Manages user's book library
 */
import { storage } from "@sb/storage";
import type { UserBook } from "../models/schemas";

const USER_BOOKS_KIND = "lexome-user-books";

export class UserBookRepository {
  /**
   * Get a user book by ID
   */
  async get(id: string): Promise<UserBook | null> {
    return storage.get<UserBook>(USER_BOOKS_KIND, id);
  }

  /**
   * Get a user's book by userId and bookId
   */
  async getUserBook(userId: string, bookId: string): Promise<UserBook | null> {
    const results = await storage.list<UserBook>(
      USER_BOOKS_KIND,
      (ub) => ub.userId === userId && ub.bookId === bookId
    );
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Create a new user book
   */
  async create(userBook: UserBook): Promise<UserBook> {
    await storage.upsert(USER_BOOKS_KIND, userBook);
    return userBook;
  }

  /**
   * Update an existing user book
   */
  async update(id: string, updates: Partial<UserBook>): Promise<UserBook | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await storage.upsert(USER_BOOKS_KIND, updated);
    return updated;
  }

  /**
   * Delete a user book
   */
  async delete(id: string): Promise<boolean> {
    await storage.remove(USER_BOOKS_KIND, id);
    return true;
  }

  /**
   * Get all books for a user
   */
  async getUserLibrary(
    userId: string,
    options?: {
      status?: UserBook["status"];
    }
  ): Promise<UserBook[]> {
    const result = await storage.list<UserBook>(
      USER_BOOKS_KIND,
      (ub) => {
        if (ub.userId !== userId) return false;
        if (options?.status && ub.status !== options.status) return false;
        return true;
      }
    );

    // Sort by updatedAt descending (most recent first)
    return result.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Get reading statistics for a user
   */
  async getUserStats(userId: string): Promise<{
    totalBooks: number;
    wantToRead: number;
    reading: number;
    finished: number;
    totalProgress: number;
  }> {
    const allBooks = await this.getUserLibrary(userId);

    const stats = {
      totalBooks: allBooks.length,
      wantToRead: allBooks.filter((b) => b.status === "want_to_read").length,
      reading: allBooks.filter((b) => b.status === "reading").length,
      finished: allBooks.filter((b) => b.status === "finished").length,
      totalProgress: allBooks.reduce((sum, b) => sum + b.progress, 0),
    };

    return stats;
  }
}

export const userBookRepository = new UserBookRepository();
