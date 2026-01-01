import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AnnotationRepository } from '../../repositories/annotationRepository'
import type { Annotation } from '../../models/schemas'

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

describe('AnnotationRepository', () => {
  let repository: AnnotationRepository

  const mockAnnotation: Annotation = {
    id: 'ann_1',
    userId: 'user_1',
    bookId: 'book_1',
    textSelection: 'It was the best of times',
    startOffset: 0,
    endOffset: 24,
    noteContent: 'Opening line of the novel',
    aiContext: 'This is the famous opening of A Tale of Two Cities',
    tags: ['important', 'opening'],
    isPublic: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new AnnotationRepository()
  })

  describe('get', () => {
    it('should retrieve an annotation by ID', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockAnnotation)

      const result = await repository.get('ann_1')

      expect(storage.get).toHaveBeenCalledWith('lexome-annotations', 'ann_1')
      expect(result).toEqual(mockAnnotation)
    })

    it('should return null if annotation not found', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.get('non_existent')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new annotation', async () => {
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const result = await repository.create(mockAnnotation)

      expect(storage.upsert).toHaveBeenCalledWith('lexome-annotations', mockAnnotation)
      expect(result).toEqual(mockAnnotation)
    })
  })

  describe('update', () => {
    it('should update an existing annotation', async () => {
      vi.mocked(storage.get).mockResolvedValue(mockAnnotation)
      vi.mocked(storage.upsert).mockResolvedValue(undefined)

      const updates = { noteContent: 'Updated note' }
      const result = await repository.update('ann_1', updates)

      expect(storage.get).toHaveBeenCalledWith('lexome-annotations', 'ann_1')
      expect(result?.noteContent).toBe('Updated note')
      expect(result?.id).toBe(mockAnnotation.id)
      expect(result?.userId).toBe(mockAnnotation.userId)
      expect(result?.bookId).toBe(mockAnnotation.bookId)
      expect(result?.updatedAt).toBeDefined()
      expect(result?.updatedAt).not.toBe(mockAnnotation.updatedAt)
    })

    it('should return null if annotation does not exist', async () => {
      vi.mocked(storage.get).mockResolvedValue(null)

      const result = await repository.update('non_existent', { noteContent: 'test' })

      expect(result).toBeNull()
      expect(storage.upsert).not.toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('should delete an annotation', async () => {
      vi.mocked(storage.remove).mockResolvedValue(undefined)

      const result = await repository.delete('ann_1')

      expect(storage.remove).toHaveBeenCalledWith('lexome-annotations', 'ann_1')
      expect(result).toBe(true)
    })
  })

  describe('getBookAnnotations', () => {
    const mockAnnotations: Annotation[] = [
      { ...mockAnnotation, id: 'ann_1', startOffset: 100, isPublic: false },
      { ...mockAnnotation, id: 'ann_2', startOffset: 50, isPublic: true },
      { ...mockAnnotation, id: 'ann_3', startOffset: 200, userId: 'user_2', isPublic: true },
    ]

    it('should return annotations sorted by start offset', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getBookAnnotations('book_1', { userId: 'user_1', includePublic: true })

      expect(result).toHaveLength(3)
      expect(result[0].startOffset).toBe(50)
      expect(result[1].startOffset).toBe(100)
      expect(result[2].startOffset).toBe(200)
    })

    it('should return only user annotations when includePublic is false', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getBookAnnotations('book_1', { userId: 'user_1', includePublic: false })

      // Should return all user_1 annotations (both ann_1 and ann_2), but not user_2's (ann_3)
      expect(result).toHaveLength(2)
      expect(result.some(ann => ann.id === 'ann_1')).toBe(true)
      expect(result.some(ann => ann.id === 'ann_2')).toBe(true)
      expect(result.some(ann => ann.id === 'ann_3')).toBe(false)
    })

    it('should return only public annotations when no userId specified', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getBookAnnotations('book_1')

      expect(result).toHaveLength(2)
      expect(result.every((ann) => ann.isPublic)).toBe(true)
    })
  })

  describe('getUserAnnotations', () => {
    const mockAnnotations: Annotation[] = [
      { ...mockAnnotation, id: 'ann_1', bookId: 'book_1', tags: ['tag1'], createdAt: '2024-01-03T00:00:00.000Z' },
      { ...mockAnnotation, id: 'ann_2', bookId: 'book_2', tags: ['tag2'], createdAt: '2024-01-02T00:00:00.000Z' },
      { ...mockAnnotation, id: 'ann_3', bookId: 'book_1', tags: ['tag1', 'tag2'], createdAt: '2024-01-01T00:00:00.000Z' },
    ]

    it('should return all user annotations sorted by createdAt desc', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getUserAnnotations('user_1')

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('ann_1') // Most recent
      expect(result[2].id).toBe('ann_3') // Oldest
    })

    it('should filter by bookId when specified', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getUserAnnotations('user_1', { bookId: 'book_1' })

      expect(result).toHaveLength(2)
      expect(result.every((ann) => ann.bookId === 'book_1')).toBe(true)
    })

    it('should filter by tags when specified', async () => {
      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getUserAnnotations('user_1', { tags: ['tag2'] })

      expect(result).toHaveLength(2)
      expect(result.every((ann) => ann.tags.includes('tag2'))).toBe(true)
    })
  })

  describe('searchAnnotations', () => {
    it('should search in textSelection, noteContent, and aiContext', async () => {
      const mockAnnotations: Annotation[] = [
        { ...mockAnnotation, id: 'ann_1', textSelection: 'Hello world' },
        { ...mockAnnotation, id: 'ann_2', noteContent: 'Contains world in note' },
        { ...mockAnnotation, id: 'ann_3', aiContext: 'AI context with world' },
        { ...mockAnnotation, id: 'ann_4', textSelection: 'No match here' },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.searchAnnotations('user_1', 'world')

      expect(result).toHaveLength(3)
      expect(result.find((ann) => ann.id === 'ann_4')).toBeUndefined()
    })

    it('should be case insensitive', async () => {
      const mockAnnotations: Annotation[] = [
        { ...mockAnnotation, id: 'ann_1', textSelection: 'HELLO WORLD' },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.searchAnnotations('user_1', 'hello')

      expect(result).toHaveLength(1)
    })
  })

  describe('getUserTags', () => {
    it('should return unique tags sorted alphabetically', async () => {
      const mockAnnotations: Annotation[] = [
        { ...mockAnnotation, id: 'ann_1', tags: ['zebra', 'apple'] },
        { ...mockAnnotation, id: 'ann_2', tags: ['apple', 'banana'] },
        { ...mockAnnotation, id: 'ann_3', tags: ['cherry'] },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getUserTags('user_1')

      expect(result).toEqual(['apple', 'banana', 'cherry', 'zebra'])
    })
  })

  describe('getUserAnnotationStats', () => {
    it('should return correct statistics', async () => {
      const mockAnnotations: Annotation[] = [
        { ...mockAnnotation, id: 'ann_1', bookId: 'book_1', isPublic: true, tags: ['tag1'] },
        { ...mockAnnotation, id: 'ann_2', bookId: 'book_2', isPublic: false, tags: ['tag2'] },
        { ...mockAnnotation, id: 'ann_3', bookId: 'book_1', isPublic: false, tags: ['tag1', 'tag3'] },
      ]

      vi.mocked(storage.list).mockImplementation(async (_kind, filter) => {
        return mockAnnotations.filter(filter as any)
      })

      const result = await repository.getUserAnnotationStats('user_1')

      expect(result).toEqual({
        totalAnnotations: 3,
        publicAnnotations: 1,
        privateAnnotations: 2,
        totalTags: 3, // tag1, tag2, tag3
        booksAnnotated: 2, // book_1, book_2
      })
    })
  })
})
