/**
 * Bookmark Repository - Manage bookmarks for books
 */

import { storage } from "@sb/storage";
import { Bookmark, BookmarkSchema } from "../models/schemas";

const BOOKMARK_KIND = "lexome-bookmarks";

export class BookmarkRepository {
  /**
   * Create a new bookmark
   */
  async create(bookmark: Omit<Bookmark, "id" | "createdAt" | "updatedAt">): Promise<Bookmark> {
    const now = new Date().toISOString();
    const id = `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newBookmark: Bookmark = {
      ...bookmark,
      id,
      createdAt: now,
      updatedAt: now,
    };

    const validated = BookmarkSchema.parse(newBookmark);
    await storage.upsert(BOOKMARK_KIND, validated);

    return validated;
  }

  /**
   * Get bookmark by ID
   */
  async getById(id: string): Promise<Bookmark | null> {
    const bookmark = await storage.get<Bookmark>(BOOKMARK_KIND, id);
    return bookmark || null;
  }

  /**
   * Get all bookmarks for a user
   */
  async getByUserId(userId: string): Promise<Bookmark[]> {
    const allBookmarks = await storage.list<Bookmark>(BOOKMARK_KIND);
    return allBookmarks
      .filter((bookmark: any) => bookmark.userId === userId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Get all bookmarks for a specific book by a user
   */
  async getByUserAndBook(userId: string, bookId: string): Promise<Bookmark[]> {
    const allBookmarks = await storage.list<Bookmark>(BOOKMARK_KIND);
    return allBookmarks
      .filter((bookmark: any) => bookmark.userId === userId && bookmark.bookId === bookId)
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Update a bookmark
   */
  async update(id: string, updates: Partial<Omit<Bookmark, "id" | "userId" | "createdAt">>): Promise<Bookmark | null> {
    const existing = await this.getById(id);
    if (!existing) {
      return null;
    }

    const updated: Bookmark = {
      ...existing,
      ...updates,
      id: existing.id,
      userId: existing.userId,
      createdAt: existing.createdAt,
      updatedAt: new Date().toISOString(),
    };

    const validated = BookmarkSchema.parse(updated);
    await storage.upsert(BOOKMARK_KIND, validated);

    return validated;
  }

  /**
   * Delete a bookmark
   */
  async delete(id: string): Promise<boolean> {
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    await storage.remove(BOOKMARK_KIND, id);
    return true;
  }

  /**
   * Delete all bookmarks for a user's book
   */
  async deleteByUserAndBook(userId: string, bookId: string): Promise<number> {
    const bookmarks = await this.getByUserAndBook(userId, bookId);
    let deleted = 0;

    for (const bookmark of bookmarks) {
      await storage.remove(BOOKMARK_KIND, bookmark.id);
      deleted++;
    }

    return deleted;
  }

  /**
   * Get bookmark count for a book
   */
  async getCountByBook(userId: string, bookId: string): Promise<number> {
    const bookmarks = await this.getByUserAndBook(userId, bookId);
    return bookmarks.length;
  }
}

export const bookmarkRepository = new BookmarkRepository();
