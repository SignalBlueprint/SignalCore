import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { userBookRepository } from '../../repositories/userBookRepository'
import { bookRepository } from '../../repositories/bookRepository'
import { gutenbergService } from '../../services/gutenberg'

// Mock the repositories and services
vi.mock('../../repositories/userBookRepository')
vi.mock('../../repositories/bookRepository')
vi.mock('../../services/gutenberg')

describe('Library API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create mock routes similar to the actual implementation
    app.get('/api/library', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const status = req.query.status as string | undefined

        const userBooks = await userBookRepository.getUserLibrary(userId, { status })

        // Enrich with book details
        const enriched = await Promise.all(
          userBooks.map(async (ub: any) => {
            const book = await bookRepository.get(ub.bookId)
            return {
              ...ub,
              book,
            }
          })
        )

        res.json(enriched)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch library' })
      }
    })

    app.post('/api/library/books', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { bookId, gutenbergId, status = 'want_to_read' } = req.body

        if (!bookId && !gutenbergId) {
          return res.status(400).json({ error: 'Either bookId or gutenbergId is required' })
        }

        // Get or fetch the book
        let book = bookId ? await bookRepository.get(bookId) : null

        if (!book && gutenbergId) {
          book = await gutenbergService.getBookById(gutenbergId)
          if (book) {
            await bookRepository.create(book)
          }
        }

        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        // Check if already in library
        const existing = await userBookRepository.getUserBook(userId, book.id)
        if (existing) {
          return res.status(409).json({ error: 'Book already in library', userBook: existing })
        }

        // Create user book
        const now = new Date().toISOString()
        const userBook = {
          id: `ub-${userId}-${book.id}-${Date.now()}`,
          userId,
          bookId: book.id,
          status,
          progress: 0,
          createdAt: now,
          updatedAt: now,
        }

        const created = await userBookRepository.create(userBook)

        res.status(201).json({ ...created, book })
      } catch (error) {
        res.status(500).json({ error: 'Failed to add book to library' })
      }
    })

    app.patch('/api/library/books/:id', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { id } = req.params
        const updates = req.body

        const userBook = await userBookRepository.get(id)
        if (!userBook || userBook.userId !== userId) {
          return res.status(404).json({ error: 'Book not found in library' })
        }

        // Handle status changes
        if (updates.status) {
          if (updates.status === 'reading' && !userBook.startedAt) {
            updates.startedAt = new Date().toISOString()
          } else if (updates.status === 'finished') {
            updates.finishedAt = new Date().toISOString()
            updates.progress = 100
          }
        }

        const updated = await userBookRepository.update(id, updates)

        res.json(updated)
      } catch (error) {
        res.status(500).json({ error: 'Failed to update book' })
      }
    })

    app.delete('/api/library/books/:id', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { id } = req.params

        const userBook = await userBookRepository.get(id)
        if (!userBook || userBook.userId !== userId) {
          return res.status(404).json({ error: 'Book not found in library' })
        }

        await userBookRepository.delete(id)

        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: 'Failed to remove book' })
      }
    })

    app.get('/api/library/stats', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'

        const stats = await userBookRepository.getUserStats(userId)

        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch statistics' })
      }
    })
  })

  describe('GET /api/library', () => {
    it('should get user library with enriched book details', async () => {
      const mockUserBooks = [
        {
          id: 'ub-1',
          userId: 'user-1',
          bookId: 'book-1',
          status: 'reading',
          progress: 50,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      const mockBook = {
        id: 'book-1',
        gutenbergId: 1,
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        subjects: ['Fiction'],
        downloadUrl: 'https://example.com/book.html',
        format: 'html' as const,
      }

      vi.mocked(userBookRepository.getUserLibrary).mockResolvedValue(mockUserBooks)
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)

      const response = await request(app)
        .get('/api/library')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toHaveLength(1)
      expect(response.body[0]).toMatchObject({
        ...mockUserBooks[0],
        book: mockBook,
      })
    })

    it('should filter library by status', async () => {
      const mockUserBooks = [
        {
          id: 'ub-1',
          userId: 'user-1',
          bookId: 'book-1',
          status: 'reading',
          progress: 50,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(userBookRepository.getUserLibrary).mockResolvedValue(mockUserBooks)
      vi.mocked(bookRepository.get).mockResolvedValue({
        id: 'book-1',
        gutenbergId: 1,
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        subjects: ['Fiction'],
        downloadUrl: 'https://example.com/book.html',
        format: 'html' as const,
      })

      await request(app)
        .get('/api/library?status=reading')
        .set('x-user-id', 'user-1')

      expect(userBookRepository.getUserLibrary).toHaveBeenCalledWith('user-1', { status: 'reading' })
    })

    it('should handle errors when fetching library', async () => {
      vi.mocked(userBookRepository.getUserLibrary).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/library')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch library')
    })
  })

  describe('POST /api/library/books', () => {
    it('should add book to library by bookId', async () => {
      const mockBook = {
        id: 'book-1',
        gutenbergId: 1,
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        subjects: ['Fiction'],
        downloadUrl: 'https://example.com/book.html',
        format: 'html' as const,
      }

      const mockUserBook = {
        id: 'ub-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: 'want_to_read',
        progress: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(userBookRepository.getUserBook).mockResolvedValue(null)
      vi.mocked(userBookRepository.create).mockResolvedValue(mockUserBook)

      const response = await request(app)
        .post('/api/library/books')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject({
        ...mockUserBook,
        book: mockBook,
      })
    })

    it('should add book to library by gutenbergId', async () => {
      const mockBook = {
        id: 'book-1',
        gutenbergId: 1,
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        subjects: ['Fiction'],
        downloadUrl: 'https://example.com/book.html',
        format: 'html' as const,
      }

      vi.mocked(bookRepository.get).mockResolvedValue(null)
      vi.mocked(gutenbergService.getBookById).mockResolvedValue(mockBook)
      vi.mocked(bookRepository.create).mockResolvedValue(mockBook)
      vi.mocked(userBookRepository.getUserBook).mockResolvedValue(null)
      vi.mocked(userBookRepository.create).mockResolvedValue({
        id: 'ub-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: 'want_to_read',
        progress: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      const response = await request(app)
        .post('/api/library/books')
        .set('x-user-id', 'user-1')
        .send({ gutenbergId: 1 })

      expect(response.status).toBe(201)
      expect(bookRepository.create).toHaveBeenCalledWith(mockBook)
    })

    it('should return 400 if neither bookId nor gutenbergId provided', async () => {
      const response = await request(app)
        .post('/api/library/books')
        .set('x-user-id', 'user-1')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Either bookId or gutenbergId is required')
    })

    it('should return 404 if book not found', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(null)
      vi.mocked(gutenbergService.getBookById).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/library/books')
        .set('x-user-id', 'user-1')
        .send({ gutenbergId: 999 })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Book not found')
    })

    it('should return 409 if book already in library', async () => {
      const mockBook = {
        id: 'book-1',
        gutenbergId: 1,
        title: 'Test Book',
        author: 'Test Author',
        language: 'en',
        subjects: ['Fiction'],
        downloadUrl: 'https://example.com/book.html',
        format: 'html' as const,
      }

      const existingUserBook = {
        id: 'ub-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: 'reading',
        progress: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(userBookRepository.getUserBook).mockResolvedValue(existingUserBook)

      const response = await request(app)
        .post('/api/library/books')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(409)
      expect(response.body).toHaveProperty('error', 'Book already in library')
    })
  })

  describe('PATCH /api/library/books/:id', () => {
    it('should update book status in library', async () => {
      const mockUserBook = {
        id: 'ub-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: 'want_to_read',
        progress: 0,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const updatedUserBook = {
        ...mockUserBook,
        status: 'reading',
        startedAt: '2024-01-02T00:00:00Z',
      }

      vi.mocked(userBookRepository.get).mockResolvedValue(mockUserBook)
      vi.mocked(userBookRepository.update).mockResolvedValue(updatedUserBook)

      const response = await request(app)
        .patch('/api/library/books/ub-1')
        .set('x-user-id', 'user-1')
        .send({ status: 'reading' })

      expect(response.status).toBe(200)
      expect(response.body).toMatchObject(updatedUserBook)
    })

    it('should set progress to 100 when status is finished', async () => {
      const mockUserBook = {
        id: 'ub-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: 'reading',
        progress: 50,
        startedAt: '2024-01-01T00:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(userBookRepository.get).mockResolvedValue(mockUserBook)
      vi.mocked(userBookRepository.update).mockImplementation(async (id, updates) => {
        return { ...mockUserBook, ...updates }
      })

      const response = await request(app)
        .patch('/api/library/books/ub-1')
        .set('x-user-id', 'user-1')
        .send({ status: 'finished' })

      expect(response.status).toBe(200)
      expect(userBookRepository.update).toHaveBeenCalledWith(
        'ub-1',
        expect.objectContaining({
          status: 'finished',
          progress: 100,
          finishedAt: expect.any(String),
        })
      )
    })

    it('should return 404 if book not found in library', async () => {
      vi.mocked(userBookRepository.get).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/library/books/ub-999')
        .set('x-user-id', 'user-1')
        .send({ status: 'reading' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Book not found in library')
    })

    it('should return 404 if userId does not match', async () => {
      const mockUserBook = {
        id: 'ub-1',
        userId: 'user-2',
        bookId: 'book-1',
        status: 'reading',
        progress: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(userBookRepository.get).mockResolvedValue(mockUserBook)

      const response = await request(app)
        .patch('/api/library/books/ub-1')
        .set('x-user-id', 'user-1')
        .send({ status: 'finished' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Book not found in library')
    })
  })

  describe('DELETE /api/library/books/:id', () => {
    it('should remove book from library', async () => {
      const mockUserBook = {
        id: 'ub-1',
        userId: 'user-1',
        bookId: 'book-1',
        status: 'reading',
        progress: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(userBookRepository.get).mockResolvedValue(mockUserBook)
      vi.mocked(userBookRepository.delete).mockResolvedValue(undefined)

      const response = await request(app)
        .delete('/api/library/books/ub-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })
      expect(userBookRepository.delete).toHaveBeenCalledWith('ub-1')
    })

    it('should return 404 if book not found in library', async () => {
      vi.mocked(userBookRepository.get).mockResolvedValue(null)

      const response = await request(app)
        .delete('/api/library/books/ub-999')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Book not found in library')
    })

    it('should return 404 if userId does not match', async () => {
      const mockUserBook = {
        id: 'ub-1',
        userId: 'user-2',
        bookId: 'book-1',
        status: 'reading',
        progress: 50,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(userBookRepository.get).mockResolvedValue(mockUserBook)

      const response = await request(app)
        .delete('/api/library/books/ub-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Book not found in library')
    })
  })

  describe('GET /api/library/stats', () => {
    it('should return user reading statistics', async () => {
      const mockStats = {
        totalBooks: 10,
        wantToRead: 3,
        reading: 4,
        finished: 3,
        totalProgress: 450,
        averageProgress: 45,
      }

      vi.mocked(userBookRepository.getUserStats).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/library/stats')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockStats)
    })

    it('should handle errors when fetching stats', async () => {
      vi.mocked(userBookRepository.getUserStats).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/library/stats')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch statistics')
    })
  })
})
