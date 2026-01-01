import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import BookCard from '../../components/BookCard'
import type { Book } from '../../types'

// Helper to wrap component with Router
function renderWithRouter(ui: React.ReactElement) {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

describe('BookCard', () => {
  const mockBook: Book = {
    id: '1',
    gutenbergId: 1,
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    language: 'en',
    subjects: ['Fiction', 'Romance', 'Classic Literature'],
    downloadUrl: 'https://example.com/book.html',
    format: 'html',
    publicationYear: 1813,
    coverImageUrl: 'https://example.com/cover.jpg',
  }

  describe('compact mode', () => {
    it('should render book title and author in compact mode', () => {
      renderWithRouter(<BookCard book={mockBook} compact={true} />)

      expect(screen.getByText('Pride and Prejudice')).toBeInTheDocument()
      expect(screen.getByText('Jane Austen')).toBeInTheDocument()
    })

    it('should render cover image with correct alt text', () => {
      renderWithRouter(<BookCard book={mockBook} compact={true} />)

      const img = screen.getByAltText('Pride and Prejudice')
      expect(img).toBeInTheDocument()
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg')
    })

    it('should link to book detail page', () => {
      renderWithRouter(<BookCard book={mockBook} compact={true} />)

      const link = screen.getByRole('link')
      expect(link).toHaveAttribute('href', '/books/1')
    })

    it('should not render subjects in compact mode', () => {
      renderWithRouter(<BookCard book={mockBook} compact={true} />)

      expect(screen.queryByText('Fiction')).not.toBeInTheDocument()
      expect(screen.queryByText('Romance')).not.toBeInTheDocument()
    })
  })

  describe('full mode', () => {
    it('should render book title and author in full mode', () => {
      renderWithRouter(<BookCard book={mockBook} compact={false} />)

      expect(screen.getByText('Pride and Prejudice')).toBeInTheDocument()
      expect(screen.getByText('Jane Austen')).toBeInTheDocument()
    })

    it('should render subjects in full mode', () => {
      renderWithRouter(<BookCard book={mockBook} compact={false} />)

      expect(screen.getByText('Fiction')).toBeInTheDocument()
      expect(screen.getByText('Romance')).toBeInTheDocument()
      expect(screen.getByText('Classic Literature')).toBeInTheDocument()
    })

    it('should display publication year if available', () => {
      renderWithRouter(<BookCard book={mockBook} compact={false} />)

      expect(screen.getByText('1813')).toBeInTheDocument()
    })

    it('should display language in uppercase', () => {
      renderWithRouter(<BookCard book={mockBook} compact={false} />)

      const langElement = screen.getByText('en')
      expect(langElement).toBeInTheDocument()
      expect(langElement).toHaveClass('uppercase')
    })

    it('should limit subjects to 3 in full mode', () => {
      const bookWithManySubjects = {
        ...mockBook,
        subjects: ['Subject 1', 'Subject 2', 'Subject 3', 'Subject 4', 'Subject 5'],
      }

      renderWithRouter(<BookCard book={bookWithManySubjects} compact={false} />)

      expect(screen.getByText('Subject 1')).toBeInTheDocument()
      expect(screen.getByText('Subject 2')).toBeInTheDocument()
      expect(screen.getByText('Subject 3')).toBeInTheDocument()
      expect(screen.queryByText('Subject 4')).not.toBeInTheDocument()
      expect(screen.queryByText('Subject 5')).not.toBeInTheDocument()
    })
  })

  describe('edge cases', () => {
    it('should handle missing cover image with placeholder', () => {
      const bookWithoutCover = { ...mockBook, coverImageUrl: undefined }

      renderWithRouter(<BookCard book={bookWithoutCover} compact={true} />)

      const img = screen.getByAltText('Pride and Prejudice')
      expect(img.getAttribute('src')).toContain('placeholder')
    })

    it('should handle missing publication year', () => {
      const bookWithoutYear = { ...mockBook, publicationYear: undefined }

      renderWithRouter(<BookCard book={bookWithoutYear} compact={false} />)

      expect(screen.queryByText('1813')).not.toBeInTheDocument()
    })

    it('should handle empty subjects array', () => {
      const bookWithoutSubjects = { ...mockBook, subjects: [] }

      renderWithRouter(<BookCard book={bookWithoutSubjects} compact={false} />)

      // Should not render the subjects section
      const card = screen.getByRole('link')
      expect(card).toBeInTheDocument()
    })

    it('should render with default compact=false', () => {
      renderWithRouter(<BookCard book={mockBook} />)

      // Should show subjects (indicating full mode)
      expect(screen.getByText('Fiction')).toBeInTheDocument()
    })
  })
})
