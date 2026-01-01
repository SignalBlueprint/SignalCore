import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { bookmarkRepository } from '../../repositories/bookmarkRepository'

// Mock the repository
vi.mock('../../repositories/bookmarkRepository')

describe('Bookmarks API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create mock routes similar to the actual implementation
    app.get('/api/bookmarks', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'demo-user'
        const bookmarks = await bookmarkRepository.getByUserId(userId)

        res.json({
          success: true,
          data: bookmarks,
          count: bookmarks.length,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch bookmarks',
        })
      }
    })

    app.get('/api/bookmarks/book/:bookId', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'demo-user'
        const { bookId } = req.params

        const bookmarks = await bookmarkRepository.getByUserAndBook(userId, bookId)

        res.json({
          success: true,
          data: bookmarks,
          count: bookmarks.length,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch bookmarks for book',
        })
      }
    })

    app.get('/api/bookmarks/:id', async (req, res) => {
      try {
        const { id } = req.params
        const bookmark = await bookmarkRepository.getById(id)

        if (!bookmark) {
          return res.status(404).json({
            success: false,
            error: 'Bookmark not found',
          })
        }

        res.json({
          success: true,
          data: bookmark,
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch bookmark',
        })
      }
    })

    app.post('/api/bookmarks', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'demo-user'
        const { bookId, location, title, note } = req.body

        if (!bookId || !location) {
          return res.status(400).json({
            success: false,
            error: 'bookId and location are required',
          })
        }

        const bookmark = await bookmarkRepository.create({
          userId,
          bookId,
          location,
          title,
          note,
        })

        res.status(201).json({
          success: true,
          data: bookmark,
          message: 'Bookmark created successfully',
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to create bookmark',
        })
      }
    })

    app.patch('/api/bookmarks/:id', async (req, res) => {
      try {
        const { id } = req.params
        const { title, note, location } = req.body

        const updated = await bookmarkRepository.update(id, {
          title,
          note,
          location,
        })

        if (!updated) {
          return res.status(404).json({
            success: false,
            error: 'Bookmark not found',
          })
        }

        res.json({
          success: true,
          data: updated,
          message: 'Bookmark updated successfully',
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to update bookmark',
        })
      }
    })

    app.delete('/api/bookmarks/:id', async (req, res) => {
      try {
        const { id } = req.params
        const deleted = await bookmarkRepository.delete(id)

        if (!deleted) {
          return res.status(404).json({
            success: false,
            error: 'Bookmark not found',
          })
        }

        res.json({
          success: true,
          message: 'Bookmark deleted successfully',
        })
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to delete bookmark',
        })
      }
    })
  })

  describe('GET /api/bookmarks', () => {
    it('should get all user bookmarks', async () => {
      const mockBookmarks = [
        {
          id: 'bookmark-1',
          userId: 'user-1',
          bookId: 'book-1',
          location: 'chapter-5',
          title: 'Important quote',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        {
          id: 'bookmark-2',
          userId: 'user-1',
          bookId: 'book-2',
          location: 'chapter-10',
          createdAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
      ]

      vi.mocked(bookmarkRepository.getByUserId).mockResolvedValue(mockBookmarks)

      const response = await request(app)
        .get('/api/bookmarks')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockBookmarks,
        count: 2,
      })
    })

    it('should return empty array if no bookmarks found', async () => {
      vi.mocked(bookmarkRepository.getByUserId).mockResolvedValue([])

      const response = await request(app)
        .get('/api/bookmarks')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      })
    })

    it('should handle errors when fetching bookmarks', async () => {
      vi.mocked(bookmarkRepository.getByUserId).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/bookmarks')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch bookmarks',
      })
    })
  })

  describe('GET /api/bookmarks/book/:bookId', () => {
    it('should get bookmarks for a specific book', async () => {
      const mockBookmarks = [
        {
          id: 'bookmark-1',
          userId: 'user-1',
          bookId: 'book-1',
          location: 'chapter-5',
          title: 'Important quote',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(bookmarkRepository.getByUserAndBook).mockResolvedValue(mockBookmarks)

      const response = await request(app)
        .get('/api/bookmarks/book/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockBookmarks,
        count: 1,
      })
      expect(bookmarkRepository.getByUserAndBook).toHaveBeenCalledWith('user-1', 'book-1')
    })

    it('should return empty array if no bookmarks found for book', async () => {
      vi.mocked(bookmarkRepository.getByUserAndBook).mockResolvedValue([])

      const response = await request(app)
        .get('/api/bookmarks/book/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: [],
        count: 0,
      })
    })

    it('should handle errors when fetching bookmarks for book', async () => {
      vi.mocked(bookmarkRepository.getByUserAndBook).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/bookmarks/book/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch bookmarks for book',
      })
    })
  })

  describe('GET /api/bookmarks/:id', () => {
    it('should get a specific bookmark by id', async () => {
      const mockBookmark = {
        id: 'bookmark-1',
        userId: 'user-1',
        bookId: 'book-1',
        location: 'chapter-5',
        title: 'Important quote',
        note: 'This is a great quote',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(bookmarkRepository.getById).mockResolvedValue(mockBookmark)

      const response = await request(app).get('/api/bookmarks/bookmark-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: mockBookmark,
      })
    })

    it('should return 404 if bookmark not found', async () => {
      vi.mocked(bookmarkRepository.getById).mockResolvedValue(null)

      const response = await request(app).get('/api/bookmarks/bookmark-999')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Bookmark not found',
      })
    })

    it('should handle errors when fetching bookmark', async () => {
      vi.mocked(bookmarkRepository.getById).mockRejectedValue(new Error('Database error'))

      const response = await request(app).get('/api/bookmarks/bookmark-1')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to fetch bookmark',
      })
    })
  })

  describe('POST /api/bookmarks', () => {
    it('should create a new bookmark', async () => {
      const newBookmark = {
        bookId: 'book-1',
        location: 'chapter-10',
        title: 'Favorite passage',
        note: 'This passage is beautifully written',
      }

      const createdBookmark = {
        id: 'bookmark-1',
        userId: 'user-1',
        ...newBookmark,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(bookmarkRepository.create).mockResolvedValue(createdBookmark)

      const response = await request(app)
        .post('/api/bookmarks')
        .set('x-user-id', 'user-1')
        .send(newBookmark)

      expect(response.status).toBe(201)
      expect(response.body).toEqual({
        success: true,
        data: createdBookmark,
        message: 'Bookmark created successfully',
      })
    })

    it('should create bookmark without title and note', async () => {
      const newBookmark = {
        bookId: 'book-1',
        location: 'chapter-5',
      }

      const createdBookmark = {
        id: 'bookmark-1',
        userId: 'user-1',
        bookId: 'book-1',
        location: 'chapter-5',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(bookmarkRepository.create).mockResolvedValue(createdBookmark)

      const response = await request(app)
        .post('/api/bookmarks')
        .set('x-user-id', 'user-1')
        .send(newBookmark)

      expect(response.status).toBe(201)
      expect(response.body.success).toBe(true)
    })

    it('should return 400 if bookId is missing', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('x-user-id', 'user-1')
        .send({ location: 'chapter-5' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'bookId and location are required',
      })
    })

    it('should return 400 if location is missing', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toEqual({
        success: false,
        error: 'bookId and location are required',
      })
    })

    it('should handle errors when creating bookmark', async () => {
      vi.mocked(bookmarkRepository.create).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/bookmarks')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1', location: 'chapter-5' })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to create bookmark',
      })
    })
  })

  describe('PATCH /api/bookmarks/:id', () => {
    it('should update a bookmark', async () => {
      const updatedBookmark = {
        id: 'bookmark-1',
        userId: 'user-1',
        bookId: 'book-1',
        location: 'chapter-5',
        title: 'Updated title',
        note: 'Updated note',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      vi.mocked(bookmarkRepository.update).mockResolvedValue(updatedBookmark)

      const response = await request(app)
        .patch('/api/bookmarks/bookmark-1')
        .send({ title: 'Updated title', note: 'Updated note' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        data: updatedBookmark,
        message: 'Bookmark updated successfully',
      })
    })

    it('should update bookmark location', async () => {
      const updatedBookmark = {
        id: 'bookmark-1',
        userId: 'user-1',
        bookId: 'book-1',
        location: 'chapter-10',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      vi.mocked(bookmarkRepository.update).mockResolvedValue(updatedBookmark)

      const response = await request(app)
        .patch('/api/bookmarks/bookmark-1')
        .send({ location: 'chapter-10' })

      expect(response.status).toBe(200)
      expect(response.body.success).toBe(true)
    })

    it('should return 404 if bookmark not found', async () => {
      vi.mocked(bookmarkRepository.update).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/bookmarks/bookmark-999')
        .send({ title: 'Updated title' })

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Bookmark not found',
      })
    })

    it('should handle errors when updating bookmark', async () => {
      vi.mocked(bookmarkRepository.update).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .patch('/api/bookmarks/bookmark-1')
        .send({ title: 'Updated title' })

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to update bookmark',
      })
    })
  })

  describe('DELETE /api/bookmarks/:id', () => {
    it('should delete a bookmark', async () => {
      vi.mocked(bookmarkRepository.delete).mockResolvedValue(true)

      const response = await request(app).delete('/api/bookmarks/bookmark-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        success: true,
        message: 'Bookmark deleted successfully',
      })
      expect(bookmarkRepository.delete).toHaveBeenCalledWith('bookmark-1')
    })

    it('should return 404 if bookmark not found', async () => {
      vi.mocked(bookmarkRepository.delete).mockResolvedValue(false)

      const response = await request(app).delete('/api/bookmarks/bookmark-999')

      expect(response.status).toBe(404)
      expect(response.body).toEqual({
        success: false,
        error: 'Bookmark not found',
      })
    })

    it('should handle errors when deleting bookmark', async () => {
      vi.mocked(bookmarkRepository.delete).mockRejectedValue(new Error('Database error'))

      const response = await request(app).delete('/api/bookmarks/bookmark-1')

      expect(response.status).toBe(500)
      expect(response.body).toEqual({
        success: false,
        error: 'Failed to delete bookmark',
      })
    })
  })
})
