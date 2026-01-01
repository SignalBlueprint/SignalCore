import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { libraryApi } from '../services/api';
import type { UserBook, LibraryStats } from '../types';

const STATUS_FILTERS = [
  { value: 'all', label: 'All Books' },
  { value: 'reading', label: 'Reading' },
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'finished', label: 'Finished' },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    try {
      const [booksRes, statsRes] = await Promise.all([
        libraryApi.getBooks(),
        libraryApi.getStats(),
      ]);
      setBooks(booksRes.data);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load library:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookId: string, status: UserBook['status']) => {
    try {
      await libraryApi.updateBook(bookId, { status });
      await loadLibrary();
    } catch (error) {
      console.error('Failed to update book status:', error);
    }
  };

  const handleRemoveBook = async (bookId: string) => {
    if (!confirm('Remove this book from your library?')) return;
    try {
      await libraryApi.removeBook(bookId);
      await loadLibrary();
    } catch (error) {
      console.error('Failed to remove book:', error);
    }
  };

  const filteredBooks = statusFilter === 'all'
    ? books
    : books.filter(b => b.status === statusFilter);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-48 mb-6" />
          <div className="grid md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        My Library
      </h1>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Books" value={stats.totalBooks} />
          <StatCard label="Reading" value={stats.booksReading} />
          <StatCard label="Finished" value={stats.booksFinished} />
          <StatCard label="Want to Read" value={stats.booksWantToRead} />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter.value
                ? 'bg-primary-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Books Grid */}
      {filteredBooks.length === 0 ? (
        <div className="text-center py-12">
          <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {statusFilter === 'all'
              ? "Your library is empty. Start by discovering some books!"
              : `No books with status "${STATUS_FILTERS.find(f => f.value === statusFilter)?.label}"`}
          </p>
          <Link to="/discover" className="btn btn-primary">
            Discover Books
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((userBook) => (
            <LibraryBookCard
              key={userBook.id}
              userBook={userBook}
              onStatusChange={handleStatusChange}
              onRemove={handleRemoveBook}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="card p-4 text-center">
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
    </div>
  );
}

interface LibraryBookCardProps {
  userBook: UserBook;
  onStatusChange: (bookId: string, status: UserBook['status']) => void;
  onRemove: (bookId: string) => void;
}

function LibraryBookCard({ userBook, onRemove }: LibraryBookCardProps) {
  const book = userBook.book;
  if (!book) return null;

  const coverUrl = book.coverImageUrl || `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;

  const statusColors = {
    reading: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    finished: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    want_to_read: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };

  return (
    <div className="card flex flex-col">
      <Link to={`/books/${book.id}`} className="block">
        <div className="aspect-[2/3] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.src = `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;
            }}
          />
        </div>
      </Link>

      <div className="p-4 flex-1 flex flex-col">
        <Link to={`/books/${book.id}`}>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2 hover:text-primary-600">
            {book.title}
          </h3>
        </Link>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {book.author}
        </p>

        <div className="space-y-3 mt-auto">
          {/* Progress Bar */}
          {userBook.status === 'reading' && (
            <div>
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Progress</span>
                <span>{userBook.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-primary-600 h-2 rounded-full transition-all"
                  style={{ width: `${userBook.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${statusColors[userBook.status]}`}>
              {userBook.status.replace('_', ' ').toUpperCase()}
            </span>
            {userBook.rating && (
              <span className="text-sm">
                {'⭐'.repeat(userBook.rating)}
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {userBook.status === 'reading' ? (
              <Link to={`/read/${book.id}`} className="btn btn-primary flex-1 text-sm">
                Continue Reading
              </Link>
            ) : (
              <Link to={`/read/${book.id}`} className="btn btn-outline flex-1 text-sm">
                Start Reading
              </Link>
            )}
            <button
              onClick={() => onRemove(userBook.id)}
              className="btn btn-secondary text-sm"
              aria-label="Remove from library"
            >
              🗑️
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
