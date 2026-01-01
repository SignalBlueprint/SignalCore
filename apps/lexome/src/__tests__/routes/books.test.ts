import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { GutenbergService } from '../../services/gutenberg'

// Mock the GutenbergService
vi.mock('../../services/gutenberg')

describe('Books API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create mock routes similar to the actual implementation
    app.get('/api/books/search', async (req, res) => {
      try {
        const service = new GutenbergService()
        const result = await service.searchBooks({
          search: req.query.q as string,
          author: req.query.author as string,
          topic: req.query.topic as string,
          page: req.query.page ? parseInt(req.query.page as string) : 1,
        })
        res.json(result)
      } catch (error) {
        res.status(500).json({ error: 'Search failed' })
      }
    })

    app.get('/api/books/popular', async (req, res) => {
      try {
        const service = new GutenbergService()
        const page = req.query.page ? parseInt(req.query.page as string) : 1
        const result = await service.getPopularBooks(page)
        res.json(result)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch popular books' })
      }
    })

    app.get('/api/books/:id', async (req, res) => {
      try {
        const service = new GutenbergService()
        const book = await service.getBookById(req.params.id)
        res.json(book)
      } catch (error) {
        res.status(404).json({ error: 'Book not found' })
      }
    })
  })

  describe('GET /api/books/search', () => {
    it('should search books with query parameter', async () => {
      const mockResult = {
        books: [
          {
            id: '1',
            gutenbergId: 1,
            title: 'Test Book',
            author: 'Test Author',
            language: 'en',
            subjects: ['Fiction'],
            downloadUrl: 'https://example.com/book.html',
            format: 'html' as const,
          },
        ],
        total: 1,
        nextPage: null,
      }

      vi.mocked(GutenbergService).mockImplementation(() => ({
        searchBooks: vi.fn().mockResolvedValue(mockResult),
        getBookById: vi.fn(),
        getBookContent: vi.fn(),
        getPopularBooks: vi.fn(),
        getBooksByCategory: vi.fn(),
      }))

      const response = await request(app).get('/api/books/search?q=test')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockResult)
    })

    it('should handle search errors', async () => {
      vi.mocked(GutenbergService).mockImplementation(() => ({
        searchBooks: vi.fn().mockRejectedValue(new Error('API Error')),
        getBookById: vi.fn(),
        getBookContent: vi.fn(),
        getPopularBooks: vi.fn(),
        getBooksByCategory: vi.fn(),
      }))

      const response = await request(app).get('/api/books/search?q=test')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error')
    })
  })

  describe('GET /api/books/popular', () => {
    it('should return popular books', async () => {
      const mockResult = {
        books: [
          {
            id: '1',
            gutenbergId: 1,
            title: 'Popular Book',
            author: 'Popular Author',
            language: 'en',
            subjects: ['Fiction'],
            downloadUrl: 'https://example.com/book.html',
            format: 'html' as const,
          },
        ],
        total: 50,
        nextPage: 2,
      }

      vi.mocked(GutenbergService).mockImplementation(() => ({
        searchBooks: vi.fn(),
        getBookById: vi.fn(),
        getBookContent: vi.fn(),
        getPopularBooks: vi.fn().mockResolvedValue(mockResult),
        getBooksByCategory: vi.fn(),
      }))

      const response = await request(app).get('/api/books/popular')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockResult)
    })

    it('should support pagination', async () => {
      const mockService = {
        searchBooks: vi.fn(),
        getBookById: vi.fn(),
        getBookContent: vi.fn(),
        getPopularBooks: vi.fn().mockResolvedValue({ books: [], total: 0, nextPage: null }),
        getBooksByCategory: vi.fn(),
      }

      vi.mocked(GutenbergService).mockImplementation(() => mockService)

      await request(app).get('/api/books/popular?page=2')

      expect(mockService.getPopularBooks).toHaveBeenCalledWith(2)
    })
  })

  describe('GET /api/books/:id', () => {
    it('should return book details by ID', async () => {
      const mockBook = {
        id: '1',
        gutenbergId: 1,
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        subjects: ['Fiction'],
        downloadUrl: 'https://example.com/book.html',
        format: 'html' as const,
      }

      vi.mocked(GutenbergService).mockImplementation(() => ({
        searchBooks: vi.fn(),
        getBookById: vi.fn().mockResolvedValue(mockBook),
        getBookContent: vi.fn(),
        getPopularBooks: vi.fn(),
        getBooksByCategory: vi.fn(),
      }))

      const response = await request(app).get('/api/books/1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockBook)
    })

    it('should return 404 for non-existent book', async () => {
      vi.mocked(GutenbergService).mockImplementation(() => ({
        searchBooks: vi.fn(),
        getBookById: vi.fn().mockRejectedValue(new Error('Not found')),
        getBookContent: vi.fn(),
        getPopularBooks: vi.fn(),
        getBooksByCategory: vi.fn(),
      }))

      const response = await request(app).get('/api/books/999')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error')
    })
  })
})
