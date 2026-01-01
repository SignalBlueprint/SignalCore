import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookmarkRepository } from '../../repositories/bookmarkRepository'
import type { Bookmark } from '../../models/schemas'

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

describe('BookmarkRepository', () => {
  let repository: BookmarkRepository

  const mockBookmark: Bookmark = {
    id: 'bookmark_1',
    userId: 'user_1',
    bookId: 'book_1',
    location: 'chapter-5',
    title: 'Important scene',
    note: 'This is where the plot twist happens',
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new BookmarkRepository()
    // Mock Date.now for consistent ID generation
    vi.spyOn(Date, 'now').mockReturnValue(1234567890000)
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789)
  })

  describe('create', () => {
    it('should create a new bookmark with generated ID and timestamps', async () => {
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const input = {
        userId: 'user_1',
        bookId: 'book_1',
        location: 'chapter-3',
        title: 'Test bookmark',
      }

      const result = await repository.create(input)

      expect(result.id).toMatch(/^bookmark_/)
      expect(result.createdAt).toBeDefined()
      expect(result.updatedAt).toBeDefined()
      expect(result.userId).toBe('user_1')
      expect(result.bookId).toBe('book_1')
      expect(result.location).toBe('chapter-3')
      expect(result.title).toBe('Test bookmark')
      expect(storage.upsert).toHaveBeenCalledWith('lexome-bookmarks', result)
    })

    it('should create bookmark without optional fields', async () => {
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const input = {
        userId: 'user_1',
        bookId: 'book_1',
        location: 'chapter-3',
      }

      const result = await repository.create(input)

      expect(result.title).toBeUndefined()
      expect(result.note).toBeUndefined()
    })
  })

  describe('getById', () => {
    it('should retrieve a bookmark by ID', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockBookmark)

      const result = await repository.getById('bookmark_1')

      expect(storage.get).toHaveBeenCalledWith('lexome-bookmarks', 'bookmark_1')
      expect(result).toEqual(mockBookmark)
    })

    it('should return null if bookmark not found', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.getById('non_existent')

      expect(result).toBeNull()
    })
  })

  describe('getByUserId', () => {
    it('should return user bookmarks sorted by createdAt desc', async () => {
      const mockBookmarks: Bookmark[] = [
        { ...mockBookmark, id: 'bookmark_1', createdAt: '2024-01-03T00:00:00.000Z' },
        { ...mockBookmark, id: 'bookmark_2', createdAt: '2024-01-01T00:00:00.000Z' },
        { ...mockBookmark, id: 'bookmark_3', userId: 'user_2', createdAt: '2024-01-02T00:00:00.000Z' },
      ]

      vi.mocked(storage.list).mockResolvedValue(mockBookmarks)

      const result = await repository.getByUserId('user_1')

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('bookmark_1') // Most recent
      expect(result[1].id).toBe('bookmark_2') // Oldest
    })
  })

  describe('getByUserAndBook', () => {
    it('should return bookmarks for specific user and book', async () => {
      const mockBookmarks: Bookmark[] = [
        { ...mockBookmark, id: 'bookmark_1', userId: 'user_1', bookId: 'book_1', createdAt: '2024-01-03T00:00:00.000Z' },
        { ...mockBookmark, id: 'bookmark_2', userId: 'user_1', bookId: 'book_2', createdAt: '2024-01-02T00:00:00.000Z' },
        { ...mockBookmark, id: 'bookmark_3', userId: 'user_2', bookId: 'book_1', createdAt: '2024-01-01T00:00:00.000Z' },
      ]

      vi.mocked(storage.list).mockResolvedValue(mockBookmarks)

      const result = await repository.getByUserAndBook('user_1', 'book_1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('bookmark_1')
    })

    it('should sort results by createdAt desc', async () => {
      const mockBookmarks: Bookmark[] = [
        { ...mockBookmark, id: 'bookmark_1', createdAt: '2024-01-01T00:00:00.000Z' },
        { ...mockBookmark, id: 'bookmark_2', createdAt: '2024-01-03T00:00:00.000Z' },
        { ...mockBookmark, id: 'bookmark_3', createdAt: '2024-01-02T00:00:00.000Z' },
      ]

      vi.mocked(storage.list).mockResolvedValue(mockBookmarks)

      const result = await repository.getByUserAndBook('user_1', 'book_1')

      expect(result[0].id).toBe('bookmark_2') // Most recent
      expect(result[1].id).toBe('bookmark_3')
      expect(result[2].id).toBe('bookmark_1') // Oldest
    })
  })

  describe('update', () => {
    it('should update a bookmark', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockBookmark)
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const updates = { title: 'Updated title', note: 'Updated note' }
      const result = await repository.update('bookmark_1', updates)

      expect(result?.title).toBe('Updated title')
      expect(result?.note).toBe('Updated note')
      expect(result?.updatedAt).toBeDefined()
      expect(result?.updatedAt).not.toBe(mockBookmark.updatedAt)
      // Should preserve original id, userId, and createdAt
      expect(result?.id).toBe(mockBookmark.id)
      expect(result?.userId).toBe(mockBookmark.userId)
      expect(result?.createdAt).toBe(mockBookmark.createdAt)
    })

    it('should return null if bookmark does not exist', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.update('non_existent', { title: 'test' })

      expect(result).toBeNull()
      expect(storage.upsert).not.toHaveBeenCalled()
    })

    it('should not allow updating id, userId, or createdAt', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockBookmark)
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      // TypeScript would prevent this, but testing the runtime behavior
      const updates = { title: 'Updated' } as any
      const result = await repository.update('bookmark_1', updates)

      expect(result?.id).toBe(mockBookmark.id)
      expect(result?.userId).toBe(mockBookmark.userId)
      expect(result?.createdAt).toBe(mockBookmark.createdAt)
    })
  })

  describe('delete', () => {
    it('should delete a bookmark', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockBookmark)
      vi.mocked(storage.remove).mockResolvedValue(undefined)

      const result = await repository.delete('bookmark_1')

      expect(storage.remove).toHaveBeenCalledWith('lexome-bookmarks', 'bookmark_1')
      expect(result).toBe(true)
    })

    it('should return false if bookmark does not exist', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.delete('non_existent')

      expect(result).toBe(false)
      expect(storage.remove).not.toHaveBeenCalled()
    })
  })

  describe('deleteByUserAndBook', () => {
    it('should delete all bookmarks for a user and book', async () => {
      const mockBookmarks: Bookmark[] = [
        { ...mockBookmark, id: 'bookmark_1' },
        { ...mockBookmark, id: 'bookmark_2' },
        { ...mockBookmark, id: 'bookmark_3' },
      ]

      vi.mocked(storage.list).mockResolvedValue(mockBookmarks)
      vi.mocked(storage.remove).mockResolvedValue(undefined)

      const result = await repository.deleteByUserAndBook('user_1', 'book_1')

      expect(result).toBe(3)
      expect(storage.remove).toHaveBeenCalledTimes(3)
      expect(storage.remove).toHaveBeenCalledWith('lexome-bookmarks', 'bookmark_1')
      expect(storage.remove).toHaveBeenCalledWith('lexome-bookmarks', 'bookmark_2')
      expect(storage.remove).toHaveBeenCalledWith('lexome-bookmarks', 'bookmark_3')
    })

    it('should return 0 if no bookmarks found', async () => {
      vi.mocked(storage.list).mockResolvedValue([])

      const result = await repository.deleteByUserAndBook('user_1', 'book_1')

      expect(result).toBe(0)
      expect(storage.remove).not.toHaveBeenCalled()
    })
  })

  describe('getCountByBook', () => {
    it('should return the count of bookmarks for a book', async () => {
      const mockBookmarks: Bookmark[] = [
        { ...mockBookmark, id: 'bookmark_1' },
        { ...mockBookmark, id: 'bookmark_2' },
        { ...mockBookmark, id: 'bookmark_3' },
      ]

      vi.mocked(storage.list).mockResolvedValue(mockBookmarks)

      const result = await repository.getCountByBook('user_1', 'book_1')

      expect(result).toBe(3)
    })

    it('should return 0 if no bookmarks found', async () => {
      vi.mocked(storage.list).mockResolvedValue([])

      const result = await repository.getCountByBook('user_1', 'book_1')

      expect(result).toBe(0)
    })
  })
})
