import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadingSessionRepository } from '../../repositories/readingSessionRepository'
import type { ReadingSession } from '../../models/schemas'

// Mock @sb/storage
vi.mock('@sb/storage', () => ({
  storage: {
    get: vi.fn(),
    upsert: vi.fn(),
    remove: vi.fn(),
    list: vi.fn(),
  },
}))

import { storage } from '@sb/storage'

describe('ReadingSessionRepository', () => {
  let repository: ReadingSessionRepository

  const mockSession: ReadingSession = {
    id: 'session_1',
    userId: 'user_1',
    bookId: 'book_1',
    startedAt: '2024-01-01T10:00:00.000Z',
    endedAt: '2024-01-01T11:00:00.000Z',
    wordsRead: 5000,
    pagesRead: 20,
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new ReadingSessionRepository()
  })

  describe('get', () => {
    it('should retrieve a session by ID', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockSession)

      const result = await repository.get('session_1')

      expect(storage.get).toHaveBeenCalledWith('lexome-reading-sessions', 'session_1')
      expect(result).toEqual(mockSession)
    })

    it('should return null if session not found', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.get('non_existent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new reading session', async () => {
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const result = await repository.create(mockSession)

      expect(storage.upsert).toHaveBeenCalledWith('lexome-reading-sessions', mockSession)
      expect(result).toEqual(mockSession)
    })
  })

  describe('update', () => {
    it('should update an existing session', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockSession)
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const updates = { wordsRead: 7000, pagesRead: 30 }
      const result = await repository.update('session_1', updates)

      expect(storage.get).toHaveBeenCalledWith('lexome-reading-sessions', 'session_1')
      expect(result).toMatchObject({
        ...mockSession,
        wordsRead: 7000,
        pagesRead: 30,
      })
    })

    it('should return null if session does not exist', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.update('non_existent', { wordsRead: 100 })

      expect(result).toBeNull()
      expect(storage.upsert).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete a session', async () => {
      vi.mocked(storage.remove).mockResolvedValue(undefined)

      const result = await repository.delete('session_1')

      expect(storage.remove).toHaveBeenCalledWith('lexome-reading-sessions', 'session_1')
      expect(result).toBe(true)
    })
  })

  describe('getUserSessions', () => {
    const mockSessions: ReadingSession[] = [
      { ...mockSession, id: 'session_1', startedAt: '2024-01-03T10:00:00.000Z', bookId: 'book_1' },
      { ...mockSession, id: 'session_2', startedAt: '2024-01-02T10:00:00.000Z', bookId: 'book_2' },
      { ...mockSession, id: 'session_3', startedAt: '2024-01-01T10:00:00.000Z', bookId: 'book_1' },
    ]

    it('should return all user sessions sorted by startedAt desc', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockSessions.filter(filter as any)
      })

      const result = await repository.getUserSessions('user_1')

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('session_1') // Most recent
      expect(result[2].id).toBe('session_3') // Oldest
    })

    it('should filter by bookId when specified', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockSessions.filter(filter as any)
      })

      const result = await repository.getUserSessions('user_1', { bookId: 'book_1' })

      expect(result).toHaveLength(2)
      expect(result.every((s) => s.bookId === 'book_1')).toBe(true)
    })

    it('should apply limit when specified', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockSessions.filter(filter as any)
      })

      const result = await repository.getUserSessions('user_1', { limit: 2 })

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('session_1')
      expect(result[1].id).toBe('session_2')
    })
  })

  describe('getActiveSession', () => {
    it('should return active session (without endedAt)', async () => {
      const activeSessions: ReadingSession[] = [
        { ...mockSession, id: 'session_1', endedAt: undefined },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return activeSessions.filter(filter as any)
      })

      const result = await repository.getActiveSession('user_1', 'book_1')

      expect(result).toEqual(activeSessions[0])
    })

    it('should return null if no active session exists', async () => {
      vi.mocked(storage.list).mockResolvedValue([])

      const result = await repository.getActiveSession('user_1', 'book_1')

      expect(result).toBeNull()
    })

    it('should not return ended sessions', async () => {
      const endedSessions: ReadingSession[] = [
        { ...mockSession, id: 'session_1', endedAt: '2024-01-01T11:00:00.000Z' },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return endedSessions.filter(filter as any)
      })

      const result = await repository.getActiveSession('user_1', 'book_1')

      expect(result).toBeNull()
    })
  })

  describe('endSession', () => {
    it('should end a session with stats', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockSession)
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const result = await repository.endSession('session_1', {
        wordsRead: 5000,
        pagesRead: 20,
      })

      expect(result?.endedAt).toBeDefined()
      expect(result?.wordsRead).toBe(5000)
      expect(result?.pagesRead).toBe(20)
    })

    it('should return null if session does not exist', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.endSession('non_existent')

      expect(result).toBeNull()
    })
  })

  describe('getUserReadingStats', () => {
    it('should calculate reading statistics correctly', async () => {
      const mockSessions: ReadingSession[] = [
        {
          ...mockSession,
          id: 'session_1',
          bookId: 'book_1',
          wordsRead: 5000,
          pagesRead: 20,
          startedAt: '2024-01-01T10:00:00.000Z',
          endedAt: '2024-01-01T11:00:00.000Z', // 60 minutes
        },
        {
          ...mockSession,
          id: 'session_2',
          bookId: 'book_2',
          wordsRead: 3000,
          pagesRead: 15,
          startedAt: '2024-01-02T10:00:00.000Z',
          endedAt: '2024-01-02T10:30:00.000Z', // 30 minutes
        },
        {
          ...mockSession,
          id: 'session_3',
          bookId: 'book_1',
          wordsRead: 2000,
          pagesRead: 10,
          startedAt: '2024-01-03T10:00:00.000Z',
          endedAt: '2024-01-03T10:15:00.000Z', // 15 minutes
        },
        {
          ...mockSession,
          id: 'session_4',
          bookId: 'book_3',
          startedAt: '2024-01-04T10:00:00.000Z',
          endedAt: undefined, // Active session, should not count in stats
        },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockSessions.filter(filter as any)
      })

      const result = await repository.getUserReadingStats('user_1')

      expect(result).toEqual({
        totalSessions: 4,
        totalWordsRead: 10000, // 5000 + 3000 + 2000
        totalPagesRead: 45, // 20 + 15 + 10
        averageSessionDuration: 35, // (60 + 30 + 15) / 3 = 35 minutes
        booksRead: 3, // book_1, book_2, book_3
      })
    })

    it('should handle empty sessions', async () => {
      vi.mocked(storage.list).mockResolvedValue([])

      const result = await repository.getUserReadingStats('user_1')

      expect(result).toEqual({
        totalSessions: 0,
        totalWordsRead: 0,
        totalPagesRead: 0,
        averageSessionDuration: 0,
        booksRead: 0,
      })
    })
  })
})
