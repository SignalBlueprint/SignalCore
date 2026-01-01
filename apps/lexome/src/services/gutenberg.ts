/**
 * Project Gutenberg API Service (via Gutendex)
 * Documentation: https://gutendex.com
 */
import axios from "axios";
import type { Book } from "../models/schemas";

const GUTENDEX_API_URL = process.env.GUTENBERG_API_URL || "https://gutendex.com";

// Create axios instance with proxy disabled for Gutenberg API
const gutenbergAxios = axios.create({
  proxy: false,
  httpsAgent: undefined,
  httpAgent: undefined,
});

interface GutenbergBook {
  id: number;
  title: string;
  authors: Array<{ name: string; birth_year?: number; death_year?: number }>;
  subjects: string[];
  languages: string[];
  download_count: number;
  formats: Record<string, string>;
}

interface GutenbergResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: GutenbergBook[];
}

export class GutenbergService {
  /**
   * Search for books in the Gutenberg catalog
   */
  async searchBooks(params: {
    search?: string;
    topic?: string;
    author?: string;
    languages?: string[];
    page?: number;
  }): Promise<{ books: Book[]; total: number; nextPage: number | null }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.search) queryParams.append("search", params.search);
      if (params.topic) queryParams.append("topic", params.topic);
      if (params.author) queryParams.append("author", params.author);
      if (params.languages && params.languages.length > 0) {
        queryParams.append("languages", params.languages.join(","));
      }
      if (params.page) queryParams.append("page", params.page.toString());

      const url = `${GUTENDEX_API_URL}/books?${queryParams.toString()}`;
      const response = await gutenbergAxios.get<GutenbergResponse>(url);

      const books = response.data.results.map((gb) => this.transformGutenbergBook(gb));

      return {
        books,
        total: response.data.count,
        nextPage: response.data.next ? (params.page || 1) + 1 : null,
      };
    } catch (error) {
      console.error("Error searching Gutenberg books:", error);
      throw new Error("Failed to search books");
    }
  }

  /**
   * Get details for a specific book by Gutenberg ID
   */
  async getBookById(gutenbergId: number): Promise<Book | null> {
    try {
      const url = `${GUTENDEX_API_URL}/books/${gutenbergId}`;
      const response = await gutenbergAxios.get<GutenbergBook>(url);
      return this.transformGutenbergBook(response.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      console.error(`Error fetching book ${gutenbergId}:`, error);
      throw new Error("Failed to fetch book details");
    }
  }

  /**
   * Browse books by category
   */
  async browseByCategory(category: string, page = 1): Promise<{ books: Book[]; total: number; nextPage: number | null }> {
    return this.searchBooks({ topic: category, page });
  }

  /**
   * Get popular books (sorted by download count)
   */
  async getPopularBooks(page = 1): Promise<{ books: Book[]; total: number; nextPage: number | null }> {
    try {
      const url = `${GUTENDEX_API_URL}/books?page=${page}`;
      const response = await gutenbergAxios.get<GutenbergResponse>(url);

      // Gutendex returns books sorted by popularity (download count) by default
      const books = response.data.results.map((gb) => this.transformGutenbergBook(gb));

      return {
        books,
        total: response.data.count,
        nextPage: response.data.next ? page + 1 : null,
      };
    } catch (error) {
      console.error("Error fetching popular books:", error);
      throw new Error("Failed to fetch popular books");
    }
  }

  /**
   * Get books by author
   */
  async getBooksByAuthor(author: string, page = 1): Promise<{ books: Book[]; total: number; nextPage: number | null }> {
    return this.searchBooks({ author, page });
  }

  /**
   * Transform Gutenberg API response to our Book schema
   */
  private transformGutenbergBook(gb: GutenbergBook): Book {
    const now = new Date().toISOString();

    // Determine best available format
    let format: 'epub' | 'html' | 'txt' = 'txt';
    let downloadUrl = '';

    if (gb.formats['application/epub+zip']) {
      format = 'epub';
      downloadUrl = gb.formats['application/epub+zip'];
    } else if (gb.formats['text/html']) {
      format = 'html';
      downloadUrl = gb.formats['text/html'];
    } else if (gb.formats['text/plain; charset=utf-8']) {
      format = 'txt';
      downloadUrl = gb.formats['text/plain; charset=utf-8'];
    } else if (gb.formats['text/plain']) {
      format = 'txt';
      downloadUrl = gb.formats['text/plain'];
    }

    // Get cover image if available
    const coverImageUrl = gb.formats['image/jpeg'];

    // Extract author name
    const authorName = gb.authors.length > 0 ? gb.authors[0].name : 'Unknown Author';

    // Extract publication year from subjects or metadata (if available)
    const publicationYear = gb.authors[0]?.birth_year;

    return {
      id: `gutenberg-${gb.id}`,
      gutenbergId: gb.id,
      title: gb.title,
      author: authorName,
      language: gb.languages[0] || 'en',
      subjects: gb.subjects,
      downloadUrl,
      coverImageUrl,
      publicationYear,
      format,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Download book content (returns the text content)
   */
  async downloadBookContent(downloadUrl: string): Promise<string> {
    try {
      const response = await gutenbergAxios.get<string>(downloadUrl, {
        responseType: 'text',
      });
      return response.data;
    } catch (error) {
      console.error("Error downloading book content:", error);
      throw new Error("Failed to download book content");
    }
  }
}

export const gutenbergService = new GutenbergService();
