/**
 * ReadingSession Repository - Manages reading sessions
 */
import { storage } from "@sb/storage";
import type { ReadingSession } from "../models/schemas";

const READING_SESSIONS_KIND = "lexome-reading-sessions";

export class ReadingSessionRepository {
  /**
   * Get a reading session by ID
   */
  async get(id: string): Promise<ReadingSession | null> {
    return storage.get<ReadingSession>(READING_SESSIONS_KIND, id);
  }

  /**
   * Create a new reading session
   */
  async create(session: ReadingSession): Promise<ReadingSession> {
    await storage.upsert(READING_SESSIONS_KIND, session);
    return session;
  }

  /**
   * Update an existing reading session
   */
  async update(
    id: string,
    updates: Partial<ReadingSession>
  ): Promise<ReadingSession | null> {
    const existing = await this.get(id);
    if (!existing) return null;

    const updated = {
      ...existing,
      ...updates,
    };

    await storage.upsert(READING_SESSIONS_KIND, updated);
    return updated;
  }

  /**
   * Delete a reading session
   */
  async delete(id: string): Promise<boolean> {
    await storage.remove(READING_SESSIONS_KIND, id);
    return true;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(
    userId: string,
    options?: {
      bookId?: string;
      limit?: number;
    }
  ): Promise<ReadingSession[]> {
    const result = await storage.list<ReadingSession>(
      READING_SESSIONS_KIND,
      (session) => {
        if (session.userId !== userId) return false;
        if (options?.bookId && session.bookId !== options.bookId) return false;
        return true;
      }
    );

    // Sort by startedAt descending (most recent first)
    const sorted = result.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // Apply limit if specified
    return options?.limit ? sorted.slice(0, options.limit) : sorted;
  }

  /**
   * Get active (not ended) session for a user and book
   */
  async getActiveSession(
    userId: string,
    bookId: string
  ): Promise<ReadingSession | null> {
    const sessions = await storage.list<ReadingSession>(
      READING_SESSIONS_KIND,
      (session) =>
        session.userId === userId &&
        session.bookId === bookId &&
        !session.endedAt
    );

    return sessions.length > 0 ? sessions[0] : null;
  }

  /**
   * End a reading session
   */
  async endSession(
    id: string,
    stats?: {
      wordsRead?: number;
      pagesRead?: number;
    }
  ): Promise<ReadingSession | null> {
    return this.update(id, {
      endedAt: new Date().toISOString(),
      ...stats,
    });
  }

  /**
   * Get reading statistics for a user
   */
  async getUserReadingStats(userId: string): Promise<{
    totalSessions: number;
    totalWordsRead: number;
    totalPagesRead: number;
    averageSessionDuration: number;
    booksRead: number;
  }> {
    const sessions = await this.getUserSessions(userId);
    const completedSessions = sessions.filter((s) => s.endedAt);

    const totalWordsRead = completedSessions.reduce(
      (sum, s) => sum + (s.wordsRead || 0),
      0
    );
    const totalPagesRead = completedSessions.reduce(
      (sum, s) => sum + (s.pagesRead || 0),
      0
    );

    // Calculate average session duration in minutes
    const durations = completedSessions.map((s) => {
      const start = new Date(s.startedAt).getTime();
      const end = new Date(s.endedAt!).getTime();
      return (end - start) / 1000 / 60; // convert to minutes
    });
    const averageSessionDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

    // Count unique books
    const uniqueBooks = new Set(sessions.map((s) => s.bookId));

    return {
      totalSessions: sessions.length,
      totalWordsRead,
      totalPagesRead,
      averageSessionDuration: Math.round(averageSessionDuration),
      booksRead: uniqueBooks.size,
    };
  }
}

export const readingSessionRepository = new ReadingSessionRepository();
