/**
 * Annotations API Routes
 */
import { Router } from "express";
import { annotationRepository } from "../repositories/annotationRepository";
import type { Annotation } from "../models/schemas";

const router: ReturnType<typeof Router> = Router();

/**
 * Get annotations for a book
 * GET /api/annotations/book/:bookId?includePublic=<true|false>
 */
router.get("/book/:bookId", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { bookId } = req.params;
    const includePublic = req.query.includePublic === "true";

    const annotations = await annotationRepository.getBookAnnotations(bookId, {
      userId,
      includePublic,
    });

    res.json(annotations);
  } catch (error) {
    console.error("Error fetching book annotations:", error);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

/**
 * Get user's annotations
 * GET /api/annotations?bookId=<bookId>&tags=<tag1,tag2>
 */
router.get("/", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { bookId, tags } = req.query;

    const annotations = await annotationRepository.getUserAnnotations(userId, {
      bookId: bookId as string | undefined,
      tags: tags ? (tags as string).split(",") : undefined,
    });

    res.json(annotations);
  } catch (error) {
    console.error("Error fetching annotations:", error);
    res.status(500).json({ error: "Failed to fetch annotations" });
  }
});

/**
 * Create a new annotation
 * POST /api/annotations
 */
router.post("/", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const {
      bookId,
      textSelection,
      startOffset,
      endOffset,
      noteContent,
      aiContext,
      tags,
      isPublic,
    } = req.body;

    if (!bookId || !textSelection || startOffset === undefined || endOffset === undefined) {
      return res.status(400).json({
        error: "bookId, textSelection, startOffset, and endOffset are required",
      });
    }

    const now = new Date().toISOString();
    const annotation: Annotation = {
      id: `ann-${userId}-${bookId}-${Date.now()}`,
      userId,
      bookId,
      textSelection,
      startOffset,
      endOffset,
      noteContent,
      aiContext,
      tags: tags || [],
      isPublic: isPublic || false,
      createdAt: now,
      updatedAt: now,
    };

    const created = await annotationRepository.create(annotation);

    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating annotation:", error);
    res.status(500).json({ error: "Failed to create annotation" });
  }
});

/**
 * Update an annotation
 * PATCH /api/annotations/:id
 */
router.patch("/:id", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { id } = req.params;
    const updates = req.body;

    const annotation = await annotationRepository.get(id);
    if (!annotation || annotation.userId !== userId) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    const updated = await annotationRepository.update(id, updates);

    res.json(updated);
  } catch (error) {
    console.error("Error updating annotation:", error);
    res.status(500).json({ error: "Failed to update annotation" });
  }
});

/**
 * Delete an annotation
 * DELETE /api/annotations/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { id } = req.params;

    const annotation = await annotationRepository.get(id);
    if (!annotation || annotation.userId !== userId) {
      return res.status(404).json({ error: "Annotation not found" });
    }

    await annotationRepository.delete(id);

    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting annotation:", error);
    res.status(500).json({ error: "Failed to delete annotation" });
  }
});

/**
 * Search annotations
 * GET /api/annotations/search?q=<query>
 */
router.get("/search", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { q } = req.query;

    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const annotations = await annotationRepository.searchAnnotations(
      userId,
      q as string
    );

    res.json(annotations);
  } catch (error) {
    console.error("Error searching annotations:", error);
    res.status(500).json({ error: "Failed to search annotations" });
  }
});

/**
 * Get user's tags
 * GET /api/annotations/tags
 */
router.get("/tags", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";

    const tags = await annotationRepository.getUserTags(userId);

    res.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
});

/**
 * Get annotation statistics
 * GET /api/annotations/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";

    const stats = await annotationRepository.getUserAnnotationStats(userId);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching annotation stats:", error);
    res.status(500).json({ error: "Failed to fetch annotation statistics" });
  }
});

export default router;
