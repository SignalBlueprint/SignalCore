import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import express from 'express'
import { aiService } from '../../services/ai'
import { bookRepository } from '../../repositories/bookRepository'
import { userBookRepository } from '../../repositories/userBookRepository'

// Mock the services and repositories
vi.mock('../../services/ai')
vi.mock('../../repositories/bookRepository')
vi.mock('../../repositories/userBookRepository')

describe('AI Features API Routes', () => {
  let app: express.Application
  const mockBook = {
    id: 'book-1',
    gutenbergId: 1,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    language: 'en',
    subjects: ['Fiction', 'Romance'],
    downloadUrl: 'https://example.com/book.html',
    format: 'html' as const,
  }

  beforeEach(() => {
    app = express()
    app.use(express.json())

    // Create mock routes similar to the actual implementation
    app.post('/api/ai/explain', async (req, res) => {
      try {
        const { text, bookId, context } = req.body

        if (!text || !bookId) {
          return res.status(400).json({ error: 'text and bookId are required' })
        }

        const book = await bookRepository.get(bookId)
        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        const explanation = await aiService.explainText({
          text,
          bookTitle: book.title,
          bookAuthor: book.author,
          context,
        })

        res.json({ explanation })
      } catch (error) {
        res.status(500).json({ error: 'Failed to explain text' })
      }
    })

    app.post('/api/ai/translate', async (req, res) => {
      try {
        const { text, bookId } = req.body

        if (!text || !bookId) {
          return res.status(400).json({ error: 'text and bookId are required' })
        }

        const book = await bookRepository.get(bookId)
        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        const translation = await aiService.translateArchaic({
          text,
          bookTitle: book.title,
          bookAuthor: book.author,
        })

        res.json({ translation })
      } catch (error) {
        res.status(500).json({ error: 'Failed to translate text' })
      }
    })

    app.post('/api/ai/define', async (req, res) => {
      try {
        const { word, context, bookId } = req.body

        if (!word || !context || !bookId) {
          return res.status(400).json({ error: 'word, context, and bookId are required' })
        }

        const book = await bookRepository.get(bookId)
        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        const definition = await aiService.defineWord({
          word,
          context,
          bookTitle: book.title,
          bookAuthor: book.author,
        })

        res.json({ definition })
      } catch (error) {
        res.status(500).json({ error: 'Failed to define word' })
      }
    })

    app.post('/api/ai/summarize', async (req, res) => {
      try {
        const { text, bookId, sectionTitle } = req.body

        if (!text || !bookId) {
          return res.status(400).json({ error: 'text and bookId are required' })
        }

        const book = await bookRepository.get(bookId)
        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        const summary = await aiService.summarizeSection({
          text,
          bookTitle: book.title,
          bookAuthor: book.author,
          sectionTitle,
        })

        res.json({ summary })
      } catch (error) {
        res.status(500).json({ error: 'Failed to summarize section' })
      }
    })

    app.post('/api/ai/analyze-character', async (req, res) => {
      try {
        const { characterName, bookId, context } = req.body

        if (!characterName || !bookId) {
          return res.status(400).json({ error: 'characterName and bookId are required' })
        }

        const book = await bookRepository.get(bookId)
        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        const analysis = await aiService.analyzeCharacter({
          characterName,
          bookTitle: book.title,
          bookAuthor: book.author,
          context,
        })

        res.json({ analysis })
      } catch (error) {
        res.status(500).json({ error: 'Failed to analyze character' })
      }
    })

    app.post('/api/ai/questions', async (req, res) => {
      try {
        const { text, bookId } = req.body

        if (!text || !bookId) {
          return res.status(400).json({ error: 'text and bookId are required' })
        }

        const book = await bookRepository.get(bookId)
        if (!book) {
          return res.status(404).json({ error: 'Book not found' })
        }

        const questions = await aiService.generateQuestions({
          text,
          bookTitle: book.title,
          bookAuthor: book.author,
        })

        res.json({ questions })
      } catch (error) {
        res.status(500).json({ error: 'Failed to generate questions' })
      }
    })

    app.get('/api/ai/recommendations', async (req, res) => {
      try {
        const userId = req.headers['x-user-id'] as string || 'default-user'
        const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 5

        const userBooks = await userBookRepository.getUserLibrary(userId, {
          status: 'finished',
        })

        if (userBooks.length === 0) {
          return res.json({
            recommendations: 'Start reading some books to get personalized recommendations!',
          })
        }

        const readBooks = await Promise.all(
          userBooks.map(async (ub: any) => {
            const book = await bookRepository.get(ub.bookId)
            return book
              ? {
                  title: book.title,
                  author: book.author,
                  subjects: book.subjects,
                }
              : null
          })
        )

        const validBooks = readBooks.filter((book) => book !== null)

        const recommendations = await aiService.getRecommendations({
          readBooks: validBooks,
          limit,
        })

        res.json({ recommendations })
      } catch (error) {
        res.status(500).json({ error: 'Failed to get recommendations' })
      }
    })
  })

  describe('POST /api/ai/explain', () => {
    it('should explain selected text', async () => {
      const mockExplanation = 'This passage reflects the social customs of 19th century England...'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.explainText).mockResolvedValue(mockExplanation)

      const response = await request(app)
        .post('/api/ai/explain')
        .send({
          text: 'It is a truth universally acknowledged',
          bookId: 'book-1',
          context: 'Opening line of the novel',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ explanation: mockExplanation })
      expect(aiService.explainText).toHaveBeenCalledWith({
        text: 'It is a truth universally acknowledged',
        bookTitle: 'Pride and Prejudice',
        bookAuthor: 'Jane Austen',
        context: 'Opening line of the novel',
      })
    })

    it('should return 400 if text is missing', async () => {
      const response = await request(app)
        .post('/api/ai/explain')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'text and bookId are required')
    })

    it('should return 404 if book not found', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(null)

      const response = await request(app)
        .post('/api/ai/explain')
        .send({ text: 'Some text', bookId: 'book-999' })

      expect(response.status).toBe(404)
      expect(response.body).toHaveProperty('error', 'Book not found')
    })

    it('should handle errors when explaining text', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.explainText).mockRejectedValue(new Error('AI service error'))

      const response = await request(app)
        .post('/api/ai/explain')
        .send({ text: 'Some text', bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to explain text')
    })
  })

  describe('POST /api/ai/translate', () => {
    it('should translate archaic language', async () => {
      const mockTranslation = 'In modern language: Everyone knows that...'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.translateArchaic).mockResolvedValue(mockTranslation)

      const response = await request(app)
        .post('/api/ai/translate')
        .send({
          text: 'It is a truth universally acknowledged',
          bookId: 'book-1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ translation: mockTranslation })
    })

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/ai/translate')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'text and bookId are required')
    })

    it('should handle errors when translating text', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.translateArchaic).mockRejectedValue(new Error('AI service error'))

      const response = await request(app)
        .post('/api/ai/translate')
        .send({ text: 'Some archaic text', bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to translate text')
    })
  })

  describe('POST /api/ai/define', () => {
    it('should define a word in context', async () => {
      const mockDefinition = 'In this context, "felicity" means happiness or good fortune.'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.defineWord).mockResolvedValue(mockDefinition)

      const response = await request(app)
        .post('/api/ai/define')
        .send({
          word: 'felicity',
          context: 'a single man in possession of a good fortune, must be in want of a wife',
          bookId: 'book-1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ definition: mockDefinition })
    })

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/ai/define')
        .send({ word: 'felicity', bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'word, context, and bookId are required')
    })

    it('should handle errors when defining word', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.defineWord).mockRejectedValue(new Error('AI service error'))

      const response = await request(app)
        .post('/api/ai/define')
        .send({ word: 'test', context: 'test context', bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to define word')
    })
  })

  describe('POST /api/ai/summarize', () => {
    it('should summarize a section', async () => {
      const mockSummary = 'This chapter introduces Elizabeth Bennet and her family...'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.summarizeSection).mockResolvedValue(mockSummary)

      const response = await request(app)
        .post('/api/ai/summarize')
        .send({
          text: 'Long chapter text...',
          bookId: 'book-1',
          sectionTitle: 'Chapter 1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ summary: mockSummary })
    })

    it('should work without section title', async () => {
      const mockSummary = 'This section discusses...'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.summarizeSection).mockResolvedValue(mockSummary)

      const response = await request(app)
        .post('/api/ai/summarize')
        .send({
          text: 'Some text',
          bookId: 'book-1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ summary: mockSummary })
    })

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/ai/summarize')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'text and bookId are required')
    })

    it('should handle errors when summarizing', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.summarizeSection).mockRejectedValue(new Error('AI service error'))

      const response = await request(app)
        .post('/api/ai/summarize')
        .send({ text: 'Some text', bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to summarize section')
    })
  })

  describe('POST /api/ai/analyze-character', () => {
    it('should analyze a character', async () => {
      const mockAnalysis = 'Elizabeth Bennet is characterized by her wit and intelligence...'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.analyzeCharacter).mockResolvedValue(mockAnalysis)

      const response = await request(app)
        .post('/api/ai/analyze-character')
        .send({
          characterName: 'Elizabeth Bennet',
          bookId: 'book-1',
          context: 'First appearance in Chapter 1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ analysis: mockAnalysis })
    })

    it('should work without context', async () => {
      const mockAnalysis = 'Character analysis...'

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.analyzeCharacter).mockResolvedValue(mockAnalysis)

      const response = await request(app)
        .post('/api/ai/analyze-character')
        .send({
          characterName: 'Mr. Darcy',
          bookId: 'book-1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ analysis: mockAnalysis })
    })

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/ai/analyze-character')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'characterName and bookId are required')
    })

    it('should handle errors when analyzing character', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.analyzeCharacter).mockRejectedValue(new Error('AI service error'))

      const response = await request(app)
        .post('/api/ai/analyze-character')
        .send({ characterName: 'Test', bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to analyze character')
    })
  })

  describe('POST /api/ai/questions', () => {
    it('should generate comprehension questions', async () => {
      const mockQuestions = [
        'What is the significance of the opening line?',
        'How does this passage set up the themes of the novel?',
      ]

      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.generateQuestions).mockResolvedValue(mockQuestions)

      const response = await request(app)
        .post('/api/ai/questions')
        .send({
          text: 'Chapter text...',
          bookId: 'book-1',
        })

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ questions: mockQuestions })
    })

    it('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/ai/questions')
        .send({ bookId: 'book-1' })

      expect(response.status).toBe(400)
      expect(response.body).toHaveProperty('error', 'text and bookId are required')
    })

    it('should handle errors when generating questions', async () => {
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.generateQuestions).mockRejectedValue(new Error('AI service error'))

      const response = await request(app)
        .post('/api/ai/questions')
        .send({ text: 'Some text', bookId: 'book-1' })

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to generate questions')
    })
  })

  describe('GET /api/ai/recommendations', () => {
    it('should get personalized book recommendations', async () => {
      const mockUserBooks = [
        {
          id: 'ub-1',
          userId: 'user-1',
          bookId: 'book-1',
          status: 'finished',
        },
      ]

      const mockRecommendations = 'Based on your reading history, you might enjoy Sense and Sensibility by Jane Austen...'

      vi.mocked(userBookRepository.getUserLibrary).mockResolvedValue(mockUserBooks)
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.getRecommendations).mockResolvedValue(mockRecommendations)

      const response = await request(app)
        .get('/api/ai/recommendations')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({ recommendations: mockRecommendations })
    })

    it('should return message if no books finished', async () => {
      vi.mocked(userBookRepository.getUserLibrary).mockResolvedValue([])

      const response = await request(app)
        .get('/api/ai/recommendations')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(200)
      expect(response.body).toEqual({
        recommendations: 'Start reading some books to get personalized recommendations!',
      })
    })

    it('should respect limit parameter', async () => {
      const mockUserBooks = [
        {
          id: 'ub-1',
          userId: 'user-1',
          bookId: 'book-1',
          status: 'finished',
        },
      ]

      vi.mocked(userBookRepository.getUserLibrary).mockResolvedValue(mockUserBooks)
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.getRecommendations).mockResolvedValue('Recommendations...')

      await request(app)
        .get('/api/ai/recommendations?limit=10')
        .set('x-user-id', 'user-1')

      expect(aiService.getRecommendations).toHaveBeenCalledWith({
        readBooks: expect.any(Array),
        limit: 10,
      })
    })

    it('should use default limit of 5', async () => {
      const mockUserBooks = [
        {
          id: 'ub-1',
          userId: 'user-1',
          bookId: 'book-1',
          status: 'finished',
        },
      ]

      vi.mocked(userBookRepository.getUserLibrary).mockResolvedValue(mockUserBooks)
      vi.mocked(bookRepository.get).mockResolvedValue(mockBook)
      vi.mocked(aiService.getRecommendations).mockResolvedValue('Recommendations...')

      await request(app)
        .get('/api/ai/recommendations')
        .set('x-user-id', 'user-1')

      expect(aiService.getRecommendations).toHaveBeenCalledWith({
        readBooks: expect.any(Array),
        limit: 5,
      })
    })

    it('should handle errors when getting recommendations', async () => {
      vi.mocked(userBookRepository.getUserLibrary).mockRejectedValue(new Error('Database error'))

      const response = await request(app)
        .get('/api/ai/recommendations')
        .set('x-user-id', 'user-1')

      expect(response.status).toBe(500)
      expect(response.body).toHaveProperty('error', 'Failed to get recommendations')
    })
  })
})
