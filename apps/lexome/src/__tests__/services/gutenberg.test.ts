import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GutenbergService } from '../../services/gutenberg'
import axios from 'axios'

// Mock axios
vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    patch: vi.fn(),
    request: vi.fn(),
  }

  return {
    default: {
      ...mockAxiosInstance,
      create: vi.fn(() => mockAxiosInstance),
    },
  }
})

const mockedAxios = vi.mocked(axios, true)

describe('GutenbergService', () => {
  let service: GutenbergService
  let mockAxiosInstance: any

  beforeEach(() => {
    vi.clearAllMocks()
    service = new GutenbergService()
    mockAxiosInstance = (mockedAxios.create as any)()
  })

  describe('searchBooks', () => {
    it('should search books with query parameters', async () => {
      const mockResponse = {
        data: {
          count: 100,
          next: 'https://gutendex.com/books?page=2',
          previous: null,
          results: [
            {
              id: 1,
              title: 'Pride and Prejudice',
              authors: [{ name: 'Jane Austen' }],
              subjects: ['Fiction', 'Romance'],
              languages: ['en'],
              download_count: 10000,
              formats: {
                'text/html': 'https://example.com/1.html',
                'text/plain': 'https://example.com/1.txt',
              },
            },
          ],
        },
      }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await service.searchBooks({ search: 'Pride' })

      expect(result.books).toHaveLength(1)
      expect(result.books[0].title).toBe('Pride and Prejudice')
      expect(result.total).toBe(100)
      expect(result.nextPage).toBe(2)
    })

    it('should handle API errors gracefully', async () => {
      mockAxiosInstance.get.mockRejectedValue(new Error('API Error'))

      await expect(service.searchBooks({ search: 'Test' })).rejects.toThrow()
    })

    it('should build correct query parameters', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          count: 0,
          next: null,
          previous: null,
          results: [],
        },
      })

      await service.searchBooks({
        search: 'Dickens',
        author: 'Charles Dickens',
        topic: 'Fiction',
        page: 2,
      })

      expect(mockAxiosInstance.get).toHaveBeenCalled()
    })
  })

  describe('getBookById', () => {
    it('should fetch book details by ID', async () => {
      const mockResponse = {
        data: {
          id: 1,
          title: 'Test Book',
          authors: [{ name: 'Test Author' }],
          subjects: ['Test'],
          languages: ['en'],
          download_count: 100,
          formats: {
            'text/html': 'https://example.com/1.html',
          },
        },
      }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await service.getBookById('1')

      expect(result.title).toBe('Test Book')
      expect(result.gutenbergId).toBe(1)
    })
  })


  describe('getPopularBooks', () => {
    it('should fetch popular books sorted by download count', async () => {
      const mockResponse = {
        data: {
          count: 50,
          next: null,
          previous: null,
          results: [
            {
              id: 1,
              title: 'Popular Book 1',
              authors: [{ name: 'Author 1' }],
              subjects: ['Fiction'],
              languages: ['en'],
              download_count: 50000,
              formats: {
                'text/html': 'https://example.com/1.html',
              },
            },
            {
              id: 2,
              title: 'Popular Book 2',
              authors: [{ name: 'Author 2' }],
              subjects: ['Fiction'],
              languages: ['en'],
              download_count: 40000,
              formats: {
                'text/html': 'https://example.com/2.html',
              },
            },
          ],
        },
      }

      mockAxiosInstance.get.mockResolvedValue(mockResponse)

      const result = await service.getPopularBooks(1)

      expect(result.books).toHaveLength(2)
      expect(result.books[0].title).toBe('Popular Book 1')
    })
  })
})
