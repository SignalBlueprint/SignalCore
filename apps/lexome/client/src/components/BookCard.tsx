import { Link } from 'react-router-dom';
import type { Book } from '../types';

interface BookCardProps {
  book: Book;
  compact?: boolean;
}

export default function BookCard({ book, compact = false }: BookCardProps) {
  const coverUrl = book.coverImageUrl || `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;

  if (compact) {
    return (
      <Link to={`/books/${book.id}`} className="group">
        <div className="card hover:shadow-xl transition-shadow duration-200">
          <div className="aspect-[2/3] relative overflow-hidden bg-gray-200 dark:bg-gray-700">
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              onError={(e) => {
                e.currentTarget.src = `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;
              }}
            />
          </div>
          <div className="p-3">
            <h3 className="font-semibold text-sm text-gray-900 dark:text-white line-clamp-2 mb-1">
              {book.title}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
              {book.author}
            </p>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link to={`/books/${book.id}`} className="group">
      <div className="card hover:shadow-xl transition-shadow duration-200 flex">
        <div className="w-32 flex-shrink-0 relative overflow-hidden bg-gray-200 dark:bg-gray-700">
          <img
            src={coverUrl}
            alt={book.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            onError={(e) => {
              e.currentTarget.src = `https://via.placeholder.com/300x450/4B5563/FFFFFF?text=${encodeURIComponent(book.title.slice(0, 20))}`;
            }}
          />
        </div>
        <div className="flex-1 p-4">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-1 line-clamp-2">
            {book.title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {book.author}
          </p>
          {book.subjects && book.subjects.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {book.subjects.slice(0, 3).map((subject, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded"
                >
                  {subject}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            {book.publicationYear && (
              <span>{book.publicationYear}</span>
            )}
            {book.language && (
              <span className="uppercase">{book.language}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
