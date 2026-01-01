/**
 * Bookmark Routes - Manage bookmarks for books
 */

import { Router, Request, Response } from "express";
import { bookmarkRepository } from "../repositories/bookmarkRepository";
import { BookmarkSchema } from "../models/schemas";

const router: ReturnType<typeof Router> = Router();

/**
 * GET /api/bookmarks
 * Get all bookmarks for the current user
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string || "demo-user";
    const bookmarks = await bookmarkRepository.getByUserId(userId);

    res.json({
      success: true,
      data: bookmarks,
      count: bookmarks.length,
    });
  } catch (error) {
    console.error("Error fetching bookmarks:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookmarks",
    });
  }
});

/**
 * GET /api/bookmarks/book/:bookId
 * Get all bookmarks for a specific book
 */
router.get("/book/:bookId", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string || "demo-user";
    const { bookId } = req.params;

    const bookmarks = await bookmarkRepository.getByUserAndBook(userId, bookId);

    res.json({
      success: true,
      data: bookmarks,
      count: bookmarks.length,
    });
  } catch (error) {
    console.error("Error fetching bookmarks for book:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookmarks for book",
    });
  }
});

/**
 * GET /api/bookmarks/:id
 * Get a specific bookmark
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const bookmark = await bookmarkRepository.getById(id);

    if (!bookmark) {
      return res.status(404).json({
        success: false,
        error: "Bookmark not found",
      });
    }

    res.json({
      success: true,
      data: bookmark,
    });
  } catch (error) {
    console.error("Error fetching bookmark:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch bookmark",
    });
  }
});

/**
 * POST /api/bookmarks
 * Create a new bookmark
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const userId = req.headers["x-user-id"] as string || "demo-user";
    const { bookId, location, title, note } = req.body;

    if (!bookId || !location) {
      return res.status(400).json({
        success: false,
        error: "bookId and location are required",
      });
    }

    const bookmark = await bookmarkRepository.create({
      userId,
      bookId,
      location,
      title,
      note,
    });

    res.status(201).json({
      success: true,
      data: bookmark,
      message: "Bookmark created successfully",
    });
  } catch (error) {
    console.error("Error creating bookmark:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create bookmark",
    });
  }
});

/**
 * PATCH /api/bookmarks/:id
 * Update a bookmark
 */
router.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, note, location } = req.body;

    const updated = await bookmarkRepository.update(id, {
      title,
      note,
      location,
    });

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: "Bookmark not found",
      });
    }

    res.json({
      success: true,
      data: updated,
      message: "Bookmark updated successfully",
    });
  } catch (error) {
    console.error("Error updating bookmark:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update bookmark",
    });
  }
});

/**
 * DELETE /api/bookmarks/:id
 * Delete a bookmark
 */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const deleted = await bookmarkRepository.delete(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Bookmark not found",
      });
    }

    res.json({
      success: true,
      message: "Bookmark deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bookmark:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete bookmark",
    });
  }
});

export default router;
