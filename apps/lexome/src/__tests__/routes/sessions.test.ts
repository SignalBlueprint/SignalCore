import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { readingSessionRepository } from '../../repositories/readingSessionRepository'

// Mock the repository
vi.mock('../../repositories/readingSessionRepository')

describe('Reading Sessions API Routes', () => {
  let app: express.Application

  beforeEach(() => {
    vi.clearAllMocks()
    app = express()
    app.use(express.json())

    // Create mock routes similar to the actual implementation
    app.post('/api/sessions/start', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { bookId } = req.body

        if (!bookId) {
          return res.status(400).json({ error: 'bookId is required' })
        }

        // Check if there's already an active session for this book
        const activeSession = await readingSessionRepository.getActiveSession(userId, bookId)

        if (activeSession) {
          return res.json(activeSession)
        }

        // Create new session
        const now = new Date().toISOString()
        const session = {
          id: `session-${userId}-${bookId}-${Date.now()}`,
          userId,
          bookId,
          startedAt: now,
        }

        const created = await readingSessionRepository.create(session)

        res.status(201).json(created)
      } catch (error) {
        res.status(500).json({ error: 'Failed to start reading session' })
      }
    })

    app.post('/api/sessions/:id/end', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { id } = req.params
        const { wordsRead, pagesRead } = req.body

        const session = await readingSessionRepository.get(id)
        if (!session || session.userId !== userId) {
          return res.status(404).json({ error: 'Session not found' })
        }

        if (session.endedAt) {
          return res.status(400).json({ error: 'Session already ended' })
        }

        const updated = await readingSessionRepository.endSession(id, {
          wordsRead,
          pagesRead,
        })

        res.json(updated)
      } catch (error) {
        res.status(500).json({ error: 'Failed to end reading session' })
      }
    })

    app.get('/api/sessions/history', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { bookId, limit } = req.query

        const sessions = await readingSessionRepository.getUserSessions(userId, {
          bookId: bookId as string | undefined,
          limit: limit ? parseInt(limit as string, 10) : undefined,
        })

        res.json(sessions)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reading sessions' })
      }
    })

    app.get('/api/sessions/stats', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'

        const stats = await readingSessionRepository.getUserReadingStats(userId)

        res.json(stats)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch reading statistics' })
      }
    })

    app.get('/api/sessions/active/:bookId', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const { bookId } = req.params

        const session = await readingSessionRepository.getActiveSession(userId, bookId)

        if (!session) {
          return res.status(404).json({ error: 'No active session found' })
        }

        res.json(session)
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch active session' })
      }
    })
  })

  describe('POST /api/sessions/start', () => {
    it('should start a new reading session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(readingSessionRepository.getActiveSession).mockResolvedValue(null)
      vi.mocked(readingSessionRepository.create).mockResolvedValue(mockSession)

      const response = await request(app)
        .post('/api/sessions/start')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(201)
      expect(response.body).toMatchObject(mockSession)
    })

    it('should return existing active session instead of creating new one', async () => {
      const existingSession = {
        id: 'session-1',
        userId: 'user-1',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(readingSessionRepository.getActiveSession).mockResolvedValue(existingSession)

      const response = await request(app)
        .post('/api/sessions/start')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(existingSession)
      expect(readingSessionRepository.create).not.toHaveBeenCalled()
    })

    it('should return 400 if bookId is missing', async () => {
      const response = await request(app)
        .post('/api/sessions/start')
        .set('x-user-id', 'user-1')
        .send({})

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'bookId is required')
    })

    it('should handle errors when starting session', async () => {
      vi.mocked(readingSessionRepository.getActiveSession).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions/start')
        .set('x-user-id', 'user-1')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to start reading session')
    })
  })

  describe('POST /api/sessions/:id/end', () => {
    it('should end a reading session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
      }

      const endedSession = {
        ...mockSession,
        endedAt: '2024-01-01T01:00:00Z',
        wordsRead: 1000,
        pagesRead: 10,
      }

      vi.mocked(readingSessionRepository.get).mockResolvedValue(mockSession)
      vi.mocked(readingSessionRepository.endSession).mockResolvedValue(endedSession)

      const response = await request(app)
        .post('/api/sessions/session-1/end')
        .set('x-user-id', 'user-1')
        .send({ wordsRead: 1000, pagesRead: 10 })

      expect(response.status).toBe(200)
      expect(response.body).toEqual(endedSession)
      expect(readingSessionRepository.endSession).toHaveBeenCalledWith('session-1', {
        wordsRead: 1000,
        pagesRead: 10,
      })
    })

    it('should return 404 if session not found', async () => {
      vi.mocked(readingSessionRepository.get).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/sessions/session-999/end')
        .set('x-user-id', 'user-1')
        .send({ wordsRead: 1000, pagesRead: 10 })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should return 404 if userId does not match', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-2',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(readingSessionRepository.get).mockResolvedValue(mockSession)

      const response = await request(app)
        .post('/api/sessions/session-1/end')
        .set('x-user-id', 'user-1')
        .send({ wordsRead: 1000, pagesRead: 10 })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Session not found')
    })

    it('should return 400 if session already ended', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
        endedAt: '2024-01-01T01:00:00Z',
        wordsRead: 1000,
        pagesRead: 10,
      }

      vi.mocked(readingSessionRepository.get).mockResolvedValue(mockSession)

      const response = await request(app)
        .post('/api/sessions/session-1/end')
        .set('x-user-id', 'user-1')
        .send({ wordsRead: 500, pagesRead: 5 })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'Session already ended')
    })

    it('should handle errors when ending session', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(readingSessionRepository.get).mockResolvedValue(mockSession)
      vi.mocked(readingSessionRepository.endSession).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .post('/api/sessions/session-1/end')
        .set('x-user-id', 'user-1')
        .send({ wordsRead: 1000, pagesRead: 10 })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to end reading session')
    })
  })

  describe('GET /api/sessions/history', () => {
    it('should get user reading sessions history', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          bookId: 'book-1',
          startedAt: '2024-01-01T00:00:00Z',
          endedAt: '2024-01-01T01:00:00Z',
          wordsRead: 1000,
          pagesRead: 10,
        },
        {
          id: 'session-2',
          userId: 'user-1',
          bookId: 'book-2',
          startedAt: '2024-01-02T00:00:00Z',
          endedAt: '2024-01-02T01:30:00Z',
          wordsRead: 1500,
          pagesRead: 15,
        },
      ]

      vi.mocked(readingSessionRepository.getUserSessions).mockResolvedValue(mockSessions)

      const response = await request(app)
        .get('/api/sessions/history')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockSessions)
    })

    it('should filter sessions by bookId', async () => {
      const mockSessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          bookId: 'book-1',
          startedAt: '2024-01-01T00:00:00Z',
          endedAt: '2024-01-01T01:00:00Z',
          wordsRead: 1000,
          pagesRead: 10,
        },
      ]

      vi.mocked(readingSessionRepository.getUserSessions).mockResolvedValue(mockSessions)

      await request(app)
        .get('/api/sessions/history?bookId=book-1')
        .set('x-user-id', 'user-1')

      expect(readingSessionRepository.getUserSessions).toHaveBeenCalledWith('user-1', {
        bookId: 'book-1',
        limit: undefined,
      })
    })

    it('should limit sessions by limit parameter', async () => {
      vi.mocked(readingSessionRepository.getUserSessions).mockResolvedValue([])

      await request(app)
        .get('/api/sessions/history?limit=10')
        .set('x-user-id', 'user-1')

      expect(readingSessionRepository.getUserSessions).toHaveBeenCalledWith('user-1', {
        bookId: undefined,
        limit: 10,
      })
    })

    it('should handle errors when fetching sessions history', async () => {
      vi.mocked(readingSessionRepository.getUserSessions).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/sessions/history')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch reading sessions')
    })
  })

  describe('GET /api/sessions/stats', () => {
    it('should get user reading statistics', async () => {
      const mockStats = {
        totalSessions: 50,
        totalWordsRead: 50000,
        totalPagesRead: 500,
        totalReadingTime: 3000, // minutes
        averageSessionLength: 60,
        booksRead: 10,
      }

      vi.mocked(readingSessionRepository.getUserReadingStats).mockResolvedValue(mockStats)

      const response = await request(app)
        .get('/api/sessions/stats')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockStats)
    })

    it('should handle errors when fetching reading stats', async () => {
      vi.mocked(readingSessionRepository.getUserReadingStats).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/sessions/stats')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch reading statistics')
    })
  })

  describe('GET /api/sessions/active/:bookId', () => {
    it('should get active session for a book', async () => {
      const mockSession = {
        id: 'session-1',
        userId: 'user-1',
        bookId: 'book-1',
        startedAt: '2024-01-01T00:00:00Z',
      }

      vi.mocked(readingSessionRepository.getActiveSession).mockResolvedValue(mockSession)

      const response = await request(app)
        .get('/api/sessions/active/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual(mockSession)
    })

    it('should return 404 if no active session found', async () => {
      vi.mocked(readingSessionRepository.getActiveSession).mockResolvedValue(null)

      const response = await request(app)
        .get('/api/sessions/active/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'No active session found')
    })

    it('should handle errors when fetching active session', async () => {
      vi.mocked(readingSessionRepository.getActiveSession).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/sessions/active/book-1')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to fetch active session')
    })
  })
})
