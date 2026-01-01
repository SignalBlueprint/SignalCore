/**
 * Reading Sessions API Routes
 */
import { Router } from "express";
import { readingSessionRepository } from "../repositories/readingSessionRepository";
import type { ReadingSession } from "../models/schemas";

const router: ReturnType<typeof Router> = Router();

/**
 * Start a new reading session
 * POST /api/sessions/start
 */
router.post("/start", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { bookId } = req.body;

    if (!bookId) {
      return res.status(400).json({ error: "bookId is required" });
    }

    // Check if there's already an active session for this book
    const activeSession = await readingSessionRepository.getActiveSession(
      userId,
      bookId
    );

    if (activeSession) {
      return res.json(activeSession);
    }

    // Create new session
    const now = new Date().toISOString();
    const session: ReadingSession = {
      id: `session-${userId}-${bookId}-${Date.now()}`,
      userId,
      bookId,
      startedAt: now,
    };

    const created = await readingSessionRepository.create(session);

    res.status(201).json(created);
  } catch (error) {
    console.error("Error starting session:", error);
    res.status(500).json({ error: "Failed to start reading session" });
  }
});

/**
 * End a reading session
 * POST /api/sessions/:id/end
 */
router.post("/:id/end", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { id } = req.params;
    const { wordsRead, pagesRead } = req.body;

    const session = await readingSessionRepository.get(id);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.endedAt) {
      return res.status(400).json({ error: "Session already ended" });
    }

    const updated = await readingSessionRepository.endSession(id, {
      wordsRead,
      pagesRead,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error ending session:", error);
    res.status(500).json({ error: "Failed to end reading session" });
  }
});

/**
 * Get reading sessions history
 * GET /api/sessions/history?bookId=<bookId>&limit=<limit>
 */
router.get("/history", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { bookId, limit } = req.query;

    const sessions = await readingSessionRepository.getUserSessions(userId, {
      bookId: bookId as string | undefined,
      limit: limit ? parseInt(limit as string, 10) : undefined,
    });

    res.json(sessions);
  } catch (error) {
    console.error("Error fetching sessions:", error);
    res.status(500).json({ error: "Failed to fetch reading sessions" });
  }
});

/**
 * Get reading statistics
 * GET /api/sessions/stats
 */
router.get("/stats", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";

    const stats = await readingSessionRepository.getUserReadingStats(userId);

    res.json(stats);
  } catch (error) {
    console.error("Error fetching reading stats:", error);
    res.status(500).json({ error: "Failed to fetch reading statistics" });
  }
});

/**
 * Get active session for a book
 * GET /api/sessions/active/:bookId
 */
router.get("/active/:bookId", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const { bookId } = req.params;

    const session = await readingSessionRepository.getActiveSession(
      userId,
      bookId
    );

    if (!session) {
      return res.status(404).json({ error: "No active session found" });
    }

    res.json(session);
  } catch (error) {
    console.error("Error fetching active session:", error);
    res.status(500).json({ error: "Failed to fetch active session" });
  }
});

export default router;
