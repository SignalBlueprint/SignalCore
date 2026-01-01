import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { annotationRepository } from '../../repositories/annotationRepository'

// Mock the repository
vi.mock('../../repositories/annotationRepository')

describe('Annotations API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create mock routes similar to the actual implementation
    app.get('/api/annotations/book/:bookId', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { bookId } = req.params
        const includePublic = req.query.includePublic === 'true'

        const annotations = await annotationRepository.getBookAnnotations(bookId, {
          userId,
          includePublic,
        })

        res.json(annotations)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch annotations' })
      }
    })

    app.get('/api/annotations', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { bookId, tags } = req.query

        const annotations = await annotationRepository.getUserAnnotations(userId, {
          bookId: bookId as string | undefined,
          tags: tags ? (tags as string).split(',') : undefined,
        })

        res.json(annotations)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch annotations' })
      }
    })

    app.post('/api/annotations', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const {
          bookId,
          textSelection,
          startOffset,
          endOffset,
          noteContent,
          aiContext,
          tags,
          isPublic,
        } = req.body

        if (!bookId || !textSelection || startOffset === undefined || endOffset === undefined) {
          return res.status(400).json({
            error: 'bookId, textSelection, startOffset, and endOffset are required',
          })
        }

        const now = new Date().toISOString()
        const annotation = {
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
        }

        const created = await annotationRepository.create(annotation)

        res.status(201).json(created)
      } catch (error) {
        res.status(500).json({ error: 'Failed to create annotation' })
      }
    })

    app.patch('/api/annotations/:id', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { id } = req.params
        const updates = req.body

        const annotation = await annotationRepository.get(id)
        if (!annotation || annotation.userId !== userId) {
          return res.status(404).json({ error: 'Annotation not found' })
        }

        const updated = await annotationRepository.update(id, updates)

        res.json(updated)
      } catch (error) {
        res.status(500).json({ error: 'Failed to update annotation' })
      }
    })

    app.delete('/api/annotations/:id', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { id } = req.params

        const annotation = await annotationRepository.get(id)
        if (!annotation || annotation.userId !== userId) {
          return res.status(404).json({ error: 'Annotation not found' })
        }

        await annotationRepository.delete(id)

        res.json({ success: true })
      } catch (error) {
        res.status(500).json({ error: 'Failed to delete annotation' })
      }
    })

    app.get('/api/annotations/search', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { q } = req.query

        if (!q) {
          return res.status(400).json({ error: "Query parameter 'q' is required" })
        }

        const annotations = await annotationRepository.searchAnnotations(userId, q as string)

        res.json(annotations)
      } catch (error) {
        res.status(500).json({ error: 'Failed to search annotations' })
      }
    })

    app.get('/api/annotations/tags', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'

        const tags = await annotationRepository.getUserTags(userId)

        res.json(tags)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tags' })
      }
    })

    app.get('/api/annotations/stats', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'

        const stats = await annotationRepository.getUserAnnotationStats(userId)

        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch annotation statistics' })
      }
    })
  })

  describe('GET /api/annotations/book/:bookId', () => {
    it('should get annotations for a book', async () => {
      const mockAnnotations = [
        {
          id: 'ann-1',
          userId: 'user-1',
          bookId: 'book-1',
          textSelection: 'Test text',
          startOffset: 0,
          endOffset: 9,
          tags: ['important'],
          isPublic: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(annotationRepository.getBookAnnotations).mockResolvedValue(mockAnnotations)

      const response = await request(app)
        .get('/api/annotations/book/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockAnnotations)
      expect(annotationRepository.getBookAnnotations).toHaveBeenCalledWith('book-1', {
        userId: 'user-1',
        includePublic: false,
      })
    })

    it('should include public annotations when requested', async () => {
      const mockAnnotations = [
        {
          id: 'ann-1',
          userId: 'user-1',
          bookId: 'book-1',
          textSelection: 'Test text',
          startOffset: 0,
          endOffset: 9,
          tags: [],
          isPublic: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(annotationRepository.getBookAnnotations).mockResolvedValue(mockAnnotations)

      await request(app)
        .get('/api/annotations/book/book-1?includePublic=true')
        .set('x-user-id', 'user-1')

      expect(annotationRepository.getBookAnnotations).toHaveBeenCalledWith('book-1', {
        userId: 'user-1',
        includePublic: true,
      })
    })

    it('should handle errors when fetching book annotations', async () => {
      vi.mocked(annotationRepository.getBookAnnotations).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/annotations/book/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch annotations')
    })
  })

  describe('GET /api/annotations', () => {
    it('should get all user annotations', async () => {
      const mockAnnotations = [
        {
          id: 'ann-1',
          userId: 'user-1',
          bookId: 'book-1',
          textSelection: 'Test text',
          startOffset: 0,
          endOffset: 9,
          tags: ['important'],
          isPublic: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(annotationRepository.getUserAnnotations).mockResolvedValue(mockAnnotations)

      const response = await request(app)
        .get('/api/annotations')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockAnnotations)
    })

    it('should filter annotations by bookId', async () => {
      vi.mocked(annotationRepository.getUserAnnotations).mockResolvedValue([])

      await request(app)
        .get('/api/annotations?bookId=book-1')
        .set('x-user-id', 'user-1')

      expect(annotationRepository.getUserAnnotations).toHaveBeenCalledWith('user-1', {
        bookId: 'book-1',
        tags: undefined,
      })
    })

    it('should filter annotations by tags', async () => {
      vi.mocked(annotationRepository.getUserAnnotations).mockResolvedValue([])

      await request(app)
        .get('/api/annotations?tags=important,favorite')
        .set('x-user-id', 'user-1')

      expect(annotationRepository.getUserAnnotations).toHaveBeenCalledWith('user-1', {
        bookId: undefined,
        tags: ['important', 'favorite'],
      })
    })

    it('should handle errors when fetching user annotations', async () => {
      vi.mocked(annotationRepository.getUserAnnotations).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/annotations')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch annotations')
    })
  })

  describe('POST /api/annotations', () => {
    it('should create a new annotation', async () => {
      const newAnnotation = {
        bookId: 'book-1',
        textSelection: 'Test text selection',
        startOffset: 10,
        endOffset: 30,
        noteContent: 'My note',
        tags: ['important'],
        isPublic: false,
      }

      const createdAnnotation = {
        id: 'ann-1',
        userId: 'user-1',
        ...newAnnotation,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(annotationRepository.create).mockResolvedValue(createdAnnotation)

      const response = await request(app)
        .post('/api/annotations')
        .set('x-user-id', 'user-1')
        .send(newAnnotation)

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject(createdAnnotation)
    })

    it('should create annotation with AI context', async () => {
      const newAnnotation = {
        bookId: 'book-1',
        textSelection: 'Test text',
        startOffset: 0,
        endOffset: 9,
        aiContext: 'AI-generated context',
      }

      const createdAnnotation = {
        id: 'ann-1',
        userId: 'user-1',
        ...newAnnotation,
        tags: [],
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(annotationRepository.create).mockResolvedValue(createdAnnotation)

      const response = await request(app)
        .post('/api/annotations')
        .set('x-user-id', 'user-1')
        .send(newAnnotation)

      expect(response.status).toBe(201)
      expect(response.body.aiContext).toBe('AI-generated context')
    })

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/annotations')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'bookId, textSelection, startOffset, and endOffset are required')
    })

    it('should handle errors when creating annotation', async () => {
      vi.mocked(annotationRepository.create).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/annotations')
        .set('x-user-id', 'user-1')
        .send({
          bookId: 'book-1',
          textSelection: 'Test',
          startOffset: 0,
          endOffset: 4,
        })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to create annotation')
    })
  })

  describe('PATCH /api/annotations/:id', () => {
    it('should update an annotation', async () => {
      const mockAnnotation = {
        id: 'ann-1',
        userId: 'user-1',
        bookId: 'book-1',
        textSelection: 'Test text',
        startOffset: 0,
        endOffset: 9,
        tags: ['important'],
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      const updatedAnnotation = {
        ...mockAnnotation,
        noteContent: 'Updated note',
        updatedAt: '2024-01-02T00:00:00Z',
      }

      vi.mocked(annotationRepository.get).mockResolvedValue(mockAnnotation)
      vi.mocked(annotationRepository.update).mockResolvedValue(updatedAnnotation)

      const response = await request(app)
        .patch('/api/annotations/ann-1')
        .set('x-user-id', 'user-1')
        .send({ noteContent: 'Updated note' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(updatedAnnotation)
    })

    it('should return 404 if annotation not found', async () => {
      vi.mocked(annotationRepository.get).mockResolvedValue(null)

      const response = await request(app)
        .patch('/api/annotations/ann-999')
        .set('x-user-id', 'user-1')
        .send({ noteContent: 'Updated note' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Annotation not found')
    })

    it('should return 404 if userId does not match', async () => {
      const mockAnnotation = {
        id: 'ann-1',
        userId: 'user-2',
        bookId: 'book-1',
        textSelection: 'Test text',
        startOffset: 0,
        endOffset: 9,
        tags: [],
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(annotationRepository.get).mockResolvedValue(mockAnnotation)

      const response = await request(app)
        .patch('/api/annotations/ann-1')
        .set('x-user-id', 'user-1')
        .send({ noteContent: 'Updated note' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Annotation not found')
    })

    it('should handle errors when updating annotation', async () => {
      const mockAnnotation = {
        id: 'ann-1',
        userId: 'user-1',
        bookId: 'book-1',
        textSelection: 'Test text',
        startOffset: 0,
        endOffset: 9,
        tags: [],
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(annotationRepository.get).mockResolvedValue(mockAnnotation)
      vi.mocked(annotationRepository.update).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .patch('/api/annotations/ann-1')
        .set('x-user-id', 'user-1')
        .send({ noteContent: 'Updated note' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to update annotation')
    })
  })

  describe('DELETE /api/annotations/:id', () => {
    it('should delete an annotation', async () => {
      const mockAnnotation = {
        id: 'ann-1',
        userId: 'user-1',
        bookId: 'book-1',
        textSelection: 'Test text',
        startOffset: 0,
        endOffset: 9,
        tags: [],
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(annotationRepository.get).mockResolvedValue(mockAnnotation)
      vi.mocked(annotationRepository.delete).mockResolvedValue(undefined)

      const response = await request(app)
        .delete('/api/annotations/ann-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ success: true })
      expect(annotationRepository.delete).toHaveBeenCalledWith('ann-1')
    })

    it('should return 404 if annotation not found', async () => {
      vi.mocked(annotationRepository.get).mockResolvedValue(null)

      const response = await request(app)
        .delete('/api/annotations/ann-999')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Annotation not found')
    })

    it('should return 404 if userId does not match', async () => {
      const mockAnnotation = {
        id: 'ann-1',
        userId: 'user-2',
        bookId: 'book-1',
        textSelection: 'Test text',
        startOffset: 0,
        endOffset: 9,
        tags: [],
        isPublic: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(annotationRepository.get).mockResolvedValue(mockAnnotation)

      const response = await request(app)
        .delete('/api/annotations/ann-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Annotation not found')
    })
  })

  describe('GET /api/annotations/search', () => {
    it('should search annotations by query', async () => {
      const mockAnnotations = [
        {
          id: 'ann-1',
          userId: 'user-1',
          bookId: 'book-1',
          textSelection: 'Important text to remember',
          startOffset: 0,
          endOffset: 26,
          tags: [],
          isPublic: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ]

      vi.mocked(annotationRepository.searchAnnotations).mockResolvedValue(mockAnnotations)

      const response = await request(app)
        .get('/api/annotations/search?q=important')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockAnnotations)
      expect(annotationRepository.searchAnnotations).toHaveBeenCalledWith('user-1', 'important')
    })

    it('should return 400 if query parameter is missing', async () => {
      const response = await request(app)
        .get('/api/annotations/search')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', "Query parameter 'q' is required")
    })

    it('should handle errors when searching annotations', async () => {
      vi.mocked(annotationRepository.searchAnnotations).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/annotations/search?q=test')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to search annotations')
    })
  })

  describe('GET /api/annotations/tags', () => {
    it('should get all user tags', async () => {
      const mockTags = ['important', 'favorite', 'todo']

      vi.mocked(annotationRepository.getUserTags).mockResolvedValue(mockTags)

      const response = await request(app)
        .get('/api/annotations/tags')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockTags)
    })

    it('should handle errors when fetching tags', async () => {
      vi.mocked(annotationRepository.getUserTags).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/annotations/tags')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch tags')
    })
  })

  describe('GET /api/annotations/stats', () => {
    it('should get annotation statistics', async () => {
      const mockStats = {
        totalAnnotations: 50,
        totalBooks: 10,
        tagsCount: 15,
        publicAnnotations: 5,
        privateAnnotations: 45,
      }

      vi.mocked(annotationRepository.getUserAnnotationStats).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/annotations/stats')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockStats)
    })

    it('should handle errors when fetching stats', async () => {
      vi.mocked(annotationRepository.getUserAnnotationStats).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/annotations/stats')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch annotation statistics')
    })
  })
})
