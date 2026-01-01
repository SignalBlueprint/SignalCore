/**
 * User Library API Routes
 */
import { Router } from "express";
import { userBookRepository } from "../repositories/userBookRepository";
import { bookRepository } from "../repositories/bookRepository";
import { gutenbergService } from "../services/gutenberg";
import type { UserBook } from "../models/schemas";
// import { publish } from "@sb/events"; // TODO: Add Lexome event types to @sb/events

const router: ReturnType<typeof Router> = Router();

/**
 * Get user's library
 * GET /api/library?status=<status>
 */
router.get("/", async (req, res) => {
  try {
    // TODO: Get userId from auth middleware
    const userId = req.headers["x-user-id"] as string || "default-user";
    const status = req.query.status as UserBook["status"] | undefined;

    const userBooks = await userBookRepository.getUserLibrary(userId, { status });

    // Enrich with book details
    const enriched = await Promise.all(
      userBooks.map(async (ub) => {
        const book = await bookRepository.get(ub.bookId);
        return {
          ...ub,
          book,
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error("Error fetching library:", error);
    res.status(500).json({ error: "Failed to fetch library" });
  }
});

/**
 * Add book to library
 * POST /api/library/books
 */
router.post("/books", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string || "default-user";
    const { bookId, gutenbergId, status = "want_to_read" } = req.body;

    if (!bookId && !gutenbergId) {
      return res.status(400).json({ error: "Either bookId or gutenbergId is required" });
    }

    // Get or fetch the book
    let book = bookId ? await bookRepository.get(bookId) : null;

    if (!book && gutenbergId) {
      book = await gutenbergService.getBookById(gutenbergId);
      if (book) {
        await bookRepository.create(book);
      }
    }

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Check if already in library
    const existing = await userBookRepository.getUserBook(userId, book.id);
    if (existing) {
      return res.status(409).json({ error: "Book already in library", userBook: existing });
    }

    // Create user book
    const now = new Date().toISOString();
    const userBook: UserBook = {
      id: `ub-${userId}-${book.id}-${Date.now()}`,
      userId,
      bookId: book.id,
      status,
      progress: 0,
      createdAt: now,
      updatedAt: now,
    };

    const created = await userBookRepository.create(userBook);

    // TODO: Emit event when Lexome event types are added to @sb/events

    res.status(201).json({ ...created, book });
  } catch (error) {
    console.error("Error adding book to library:", error);
    res.status(500).json({ error: "Failed to add book to library" });
  }
});

/**
 * Update book in library
 * PATCH /api/library/books/:id
 */
router.patch("/books/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string || "default-user";
    const { id } = req.params;
    const updates = req.body;

    const userBook = await userBookRepository.get(id);
    if (!userBook || userBook.userId !== userId) {
      return res.status(404).json({ error: "Book not found in library" });
    }

    // Handle status changes
    if (updates.status) {
      if (updates.status === "reading" && !userBook.startedAt) {
        updates.startedAt = new Date().toISOString();
      } else if (updates.status === "finished") {
        updates.finishedAt = new Date().toISOString();
        updates.progress = 100;
      }
    }

    const updated = await userBookRepository.update(id, updates);

    // TODO: Emit event when Lexome event types are added to @sb/events

    res.json(updated);
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book" });
  }
});

/**
 * Remove book from library
 * DELETE /api/library/books/:id
 */
router.delete("/books/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string || "default-user";
    const { id } = req.params;

    const userBook = await userBookRepository.get(id);
    if (!userBook || userBook.userId !== userId) {
      return res.status(404).json({ error: "Book not found in library" });
    }

    await userBookRepository.delete(id);

    // TODO: Emit event when Lexome event types are added to @sb/events

    res.json({ success: true });
  } catch (error) {
    console.error("Error removing book:", error);
    res.status(500).json({ error: "Failed to remove book" });
  }
});

/**
 * Get reading statistics
 * GET /api/library/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string || "default-user";

    const stats = await userBookRepository.getUserStats(userId);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
});

export default router;
