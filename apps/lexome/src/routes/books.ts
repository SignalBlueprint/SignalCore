/**
 * Books API Routes
 */
import { Router } from "express";
import { gutenbergService } from "../services/gutenberg";
import { bookRepository } from "../repositories/bookRepository";
import { getJson, setJson, hashInput } from "@sb/cache";
import { EPUBService } from "../services/epub";

const router: ReturnType<typeof Router> = Router();
const epubService = new EPUBService();

/**
 * Search books in Gutenberg catalog
 * GET /api/books/search?q=<query>&author=<author>&language=<lang>&page=<page>
 */
router.get("/search", async (req, res) => {
  try {
    const { q, author, topic, language, page } = req.query;

    const searchParams = {
      search: q as string | undefined,
      author: author as string | undefined,
      topic: topic as string | undefined,
      languages: language ? [language as string] : undefined,
      page: page ? parseInt(page as string, 10) : 1,
    };

    // Try to get from cache first
    const cacheKey = hashInput(`gutenberg:search:${JSON.stringify(searchParams)}`);
    const cached = getJson(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await gutenbergService.searchBooks(searchParams);

    // Cache the result
    setJson(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("Error searching books:", error);
    res.status(500).json({ error: "Failed to search books" });
  }
});

/**
 * Browse popular books
 * GET /api/books/popular?page=<page>
 */
router.get("/popular", async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    // Try cache first
    const cacheKey = hashInput(`gutenberg:popular:${page}`);
    const cached = getJson(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await gutenbergService.getPopularBooks(page);

    // Cache the result
    setJson(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("Error fetching popular books:", error);
    res.status(500).json({ error: "Failed to fetch popular books" });
  }
});

/**
 * Browse books by category
 * GET /api/books/category/:category?page=<page>
 */
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;
    const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;

    const cacheKey = hashInput(`gutenberg:category:${category}:${page}`);
    const cached = getJson(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const result = await gutenbergService.browseByCategory(category, page);

    setJson(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("Error browsing category:", error);
    res.status(500).json({ error: "Failed to browse category" });
  }
});

/**
 * Get book details
 * GET /api/books/:id
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Check if it's a Gutenberg ID or internal ID
    if (id.startsWith("gutenberg-")) {
      const gutenbergId = parseInt(id.replace("gutenberg-", ""), 10);

      // Try cache first
      const cacheKey = hashInput(`gutenberg:book:${gutenbergId}`);
      const cached = getJson(cacheKey);
      if (cached) {
        return res.json(cached);
      }

      const book = await gutenbergService.getBookById(gutenbergId);
      if (!book) {
        return res.status(404).json({ error: "Book not found" });
      }

      // Also save to our local storage
      await bookRepository.create(book);

      setJson(cacheKey, book);

      return res.json(book);
    }

    // Try local storage
    const book = await bookRepository.get(id);
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Failed to fetch book details" });
  }
});

/**
 * Get book content
 * GET /api/books/:id/content
 */
router.get("/:id/content", async (req, res) => {
  try {
    const { id } = req.params;

    // First get the book details to get download URL
    let book = await bookRepository.get(id);

    if (!book && id.startsWith("gutenberg-")) {
      const gutenbergId = parseInt(id.replace("gutenberg-", ""), 10);
      book = await gutenbergService.getBookById(gutenbergId);
    }

    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }

    // Try to get content from cache
    const cacheKey = hashInput(`book:content:${book.id}`);
    const cached = getJson<any>(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    let result: any

    // Handle EPUB files
    if (book.format === 'epub' && book.downloadUrl) {
      const epubContent = await epubService.parseEPUBFromUrl(book.downloadUrl);
      result = {
        format: 'epub',
        content: epubContent,
      }
    } else {
      // Download HTML/text content
      const content = await gutenbergService.downloadBookContent(book.downloadUrl);
      result = {
        format: book.format,
        content,
      }
    }

    // Cache the content
    setJson(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("Error fetching book content:", error);
    res.status(500).json({ error: "Failed to fetch book content" });
  }
});

/**
 * Parse EPUB file
 * POST /api/books/epub/parse
 * Body: { url: string }
 */
router.post("/epub/parse", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    // Try cache first
    const cacheKey = hashInput(`epub:parse:${url}`);
    const cached = getJson(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const epubContent = await epubService.parseEPUBFromUrl(url);

    // Cache the result
    setJson(cacheKey, epubContent);

    res.json(epubContent);
  } catch (error) {
    console.error("Error parsing EPUB:", error);
    res.status(500).json({ error: "Failed to parse EPUB file" });
  }
});

export default router;
