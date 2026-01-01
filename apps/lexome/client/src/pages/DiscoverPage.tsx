import { useState, useEffect } from 'react';
import { booksApi } from '../services/api';
import type { Book, SearchParams } from '../types';
import BookCard from '../components/BookCard';

const CATEGORIES = [
  'Fiction',
  'Science',
  'History',
  'Philosophy',
  'Poetry',
  'Adventure',
  'Mystery',
  'Romance',
  'Fantasy',
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
];

export default function DiscoverPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchParams>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadBooks();
  }, [filters, currentPage]);

  const loadBooks = async () => {
    setLoading(true);
    try {
      const params: SearchParams = {
        ...filters,
        page: currentPage,
      };

      const response = await booksApi.search(params);
      setBooks(response.data.results);
      setHasMore(response.data.next !== null);
    } catch (error) {
      console.error('Failed to load books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters({ ...filters, q: searchQuery || undefined });
    setCurrentPage(1);
  };

  const handleFilterChange = (key: keyof SearchParams, value: string | undefined) => {
    setFilters({ ...filters, [key]: value });
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Discover Books
      </h1>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by title, author, or keyword..."
            className="input flex-1"
          />
          <button type="submit" className="btn btn-primary px-6">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="card p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Filters
          </h2>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Author Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Author
            </label>
            <input
              type="text"
              value={filters.author || ''}
              onChange={(e) => handleFilterChange('author', e.target.value || undefined)}
              placeholder="Enter author name"
              className="input"
            />
          </div>

          {/* Topic Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Topic
            </label>
            <select
              value={filters.topic || ''}
              onChange={(e) => handleFilterChange('topic', e.target.value || undefined)}
              className="input"
            >
              <option value="">All Topics</option>
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          {/* Language Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Language
            </label>
            <select
              value={filters.language || ''}
              onChange={(e) => handleFilterChange('language', e.target.value || undefined)}
              className="input"
            >
              <option value="">All Languages</option>
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card h-48 animate-pulse bg-gray-200 dark:bg-gray-700" />
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400">No books found. Try different search terms or filters.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
            Showing {books.length} books
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {books.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-gray-700 dark:text-gray-300">
              Page {currentPage}
            </span>
            <button
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!hasMore}
              className="btn btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
