import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { booksApi, libraryApi } from '../services/api';
import type { Book, UserBook } from '../types';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (id) {
      loadBook();
    }
  }, [id]);

  const loadBook = async () => {
    try {
      const bookRes = await booksApi.getById(id!);
      setBook(bookRes.data);

      // Check if book is in library
      try {
        const libraryRes = await libraryApi.getBooks();
        const existing = libraryRes.data.find(ub => ub.bookId === id);
        setUserBook(existing || null);
      } catch (error) {
        // Library might be empty or error
      }
    } catch (error) {
      console.error('Failed to load book:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToLibrary = async (status: UserBook['status']) => {
    if (!id) return;
    setAdding(true);
    try {
      const res = await libraryApi.addBook(id, status);
      setUserBook(res.data);
    } catch (error) {
      console.error('Failed to add to library:', error);
      alert('Failed to add book to library');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateStatus = async (status: UserBook['status']) => {
    if (!userBook) return;
    try {
      const res = await libraryApi.updateBook(userBook.id, { status });
      setUserBook(res.data);
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const handleRemoveFromLibrary = async () => {
    if (!userBook || !confirm('Remove this book from your library?')) return;
    try {
      await libraryApi.removeBook(userBook.id);
      setUserBook(null);
    } catch (error) {
      console.error('Failed to remove from library:', error);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-8" />
          <div className="grid md:grid-cols-3 gap-8">
            <div className="aspect-[2/3] bg-gray-200 dark:bg-gray-700 rounded" />
            <div className="md:col-span-2 space-y-4">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <p className="text-gray-600 dark:text-gray-400">Book not found</p>
        <button onClick={() => navigate('/discover')} className="btn btn-primary mt-4">
          Back to Discover
        </button>
      </div>
    );
  }

  const coverUrl = book.coverImageUrl || `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="mb-6 text-sm">
        <Link to="/discover" className="text-primary-600 hover:text-primary-700">
          Discover
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600 dark:text-gray-400">{book.title}</span>
      </nav>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Book Cover */}
        <div>
          <div className="card overflow-hidden mb-4">
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full"
              onError={(e) => {
                e.currentTarget.src = `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;
              }}
            />
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {userBook ? (
              <>
                <Link to={`/read/${book.id}`} className="btn btn-primary w-full">
                  {userBook.status === 'reading' ? 'Continue Reading' : 'Start Reading'}
                </Link>
                <select
                  value={userBook.status}
                  onChange={(e) => handleUpdateStatus(e.target.value as UserBook['status'])}
                  className="input"
                >
                  <option value="want_to_read">Want to Read</option>
                  <option value="reading">Reading</option>
                  <option value="finished">Finished</option>
                </select>
                <button
                  onClick={handleRemoveFromLibrary}
                  className="btn btn-secondary w-full"
                >
                  Remove from Library
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleAddToLibrary('reading')}
                  disabled={adding}
                  className="btn btn-primary w-full"
                >
                  {adding ? 'Adding...' : 'Start Reading'}
                </button>
                <button
                  onClick={() => handleAddToLibrary('want_to_read')}
                  disabled={adding}
                  className="btn btn-outline w-full"
                >
                  {adding ? 'Adding...' : 'Add to Library'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Book Details */}
        <div className="md:col-span-2">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {book.title}
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-6">
            by {book.author}
          </p>

          {/* Progress (if in library) */}
          {userBook && userBook.status === 'reading' && (
            <div className="card p-4 mb-6">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Reading Progress</span>
                <span>{userBook.progress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className="bg-primary-600 h-3 rounded-full transition-all"
                  style={{ width: `${userBook.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="card p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Details
            </h2>
            <dl className="space-y-2">
              {book.publicationYear && (
                <div className="flex">
                  <dt className="w-32 text-gray-600 dark:text-gray-400">Published:</dt>
                  <dd className="text-gray-900 dark:text-white">{book.publicationYear}</dd>
                </div>
              )}
              <div className="flex">
                <dt className="w-32 text-gray-600 dark:text-gray-400">Language:</dt>
                <dd className="text-gray-900 dark:text-white uppercase">{book.language}</dd>
              </div>
              <div className="flex">
                <dt className="w-32 text-gray-600 dark:text-gray-400">Format:</dt>
                <dd className="text-gray-900 dark:text-white uppercase">{book.format}</dd>
              </div>
              {book.wordCount && (
                <div className="flex">
                  <dt className="w-32 text-gray-600 dark:text-gray-400">Words:</dt>
                  <dd className="text-gray-900 dark:text-white">{book.wordCount.toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Subjects */}
          {book.subjects && book.subjects.length > 0 && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Subjects & Categories
              </h2>
              <div className="flex flex-wrap gap-2">
                {book.subjects.map((subject, idx) => (
                  <span
                    key={idx}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-1 rounded-full text-sm"
                  >
                    {subject}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
