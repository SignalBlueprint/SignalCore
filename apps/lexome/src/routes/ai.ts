/**
 * AI Features API Routes
 */
import { Router } from "express";
import { aiService } from "../services/ai";
import { bookRepository } from "../repositories/bookRepository";
import { userBookRepository } from "../repositories/userBookRepository";

const router: ReturnType<typeof Router> = Router();

/**
 * Explain selected text
 * POST /api/ai/explain
 */
router.post("/explain", async (req, res) => {
  try {
    const { text, bookId, context } = req.body;

    if (!text || !bookId) {
      return res.status(400).json({ error: "text and bookId are required" });
    }

    // Get book details
    const book = await bookRepository.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const explanation = await aiService.explainText({
      text,
      bookTitle: book.title,
      bookAuthor: book.author,
      context,
    });

    res.json({ explanation });
  } catch (error) {
    console.error("Error explaining text:", error);
    res.status(500).json({ error: "Failed to explain text" });
  }
});

/**
 * Translate archaic language
 * POST /api/ai/translate
 */
router.post("/translate", async (req, res) => {
  try {
    const { text, bookId } = req.body;

    if (!text || !bookId) {
      return res.status(400).json({ error: "text and bookId are required" });
    }

    const book = await bookRepository.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const translation = await aiService.translateArchaic({
      text,
      bookTitle: book.title,
      bookAuthor: book.author,
    });

    res.json({ translation });
  } catch (error) {
    console.error("Error translating text:", error);
    res.status(500).json({ error: "Failed to translate text" });
  }
});

/**
 * Define a word or phrase
 * POST /api/ai/define
 */
router.post("/define", async (req, res) => {
  try {
    const { word, context, bookId } = req.body;

    if (!word || !context || !bookId) {
      return res
        .status(400)
        .json({ error: "word, context, and bookId are required" });
    }

    const book = await bookRepository.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const definition = await aiService.defineWord({
      word,
      context,
      bookTitle: book.title,
      bookAuthor: book.author,
    });

    res.json({ definition });
  } catch (error) {
    console.error("Error defining word:", error);
    res.status(500).json({ error: "Failed to define word" });
  }
});

/**
 * Summarize a section
 * POST /api/ai/summarize
 */
router.post("/summarize", async (req, res) => {
  try {
    const { text, bookId, sectionTitle } = req.body;

    if (!text || !bookId) {
      return res.status(400).json({ error: "text and bookId are required" });
    }

    const book = await bookRepository.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const summary = await aiService.summarizeSection({
      text,
      bookTitle: book.title,
      bookAuthor: book.author,
      sectionTitle,
    });

    res.json({ summary });
  } catch (error) {
    console.error("Error summarizing section:", error);
    res.status(500).json({ error: "Failed to summarize section" });
  }
});

/**
 * Analyze a character
 * POST /api/ai/analyze-character
 */
router.post("/analyze-character", async (req, res) => {
  try {
    const { characterName, bookId, context } = req.body;

    if (!characterName || !bookId) {
      return res
        .status(400)
        .json({ error: "characterName and bookId are required" });
    }

    const book = await bookRepository.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const analysis = await aiService.analyzeCharacter({
      characterName,
      bookTitle: book.title,
      bookAuthor: book.author,
      context,
    });

    res.json({ analysis });
  } catch (error) {
    console.error("Error analyzing character:", error);
    res.status(500).json({ error: "Failed to analyze character" });
  }
});

/**
 * Generate comprehension questions
 * POST /api/ai/questions
 */
router.post("/questions", async (req, res) => {
  try {
    const { text, bookId } = req.body;

    if (!text || !bookId) {
      return res.status(400).json({ error: "text and bookId are required" });
    }

    const book = await bookRepository.get(bookId);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    const questions = await aiService.generateQuestions({
      text,
      bookTitle: book.title,
      bookAuthor: book.author,
    });

    res.json({ questions });
  } catch (error) {
    console.error("Error generating questions:", error);
    res.status(500).json({ error: "Failed to generate questions" });
  }
});

/**
 * Get book recommendations
 * GET /api/ai/recommendations?limit=<limit>
 */
router.get("/recommendations", async (req, res) => {
  try {
    const userId = (req.headers["x-user-id"] as string) || "default-user";
    const limit = req.query.limit
      ? parseInt(req.query.limit as string, 10)
      : 5;

    // Get user's finished books
    const userBooks = await userBookRepository.getUserLibrary(userId, {
      status: "finished",
    });

    if (userBooks.length === 0) {
      return res.json({
        recommendations:
          "Start reading some books to get personalized recommendations!",
      });
    }

    // Get book details
    const readBooks = await Promise.all(
      userBooks.map(async (ub) => {
        const book = await bookRepository.get(ub.bookId);
        return book
          ? {
              title: book.title,
              author: book.author,
              subjects: book.subjects,
            }
          : null;
      })
    );

    const validBooks = readBooks.filter(
      (book) => book !== null
    ) as Array<{ title: string; author: string; subjects: string[] }>;

    const recommendations = await aiService.getRecommendations({
      readBooks: validBooks,
      limit,
    });

    res.json({ recommendations });
  } catch (error) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ error: "Failed to get recommendations" });
  }
});

export default router;
