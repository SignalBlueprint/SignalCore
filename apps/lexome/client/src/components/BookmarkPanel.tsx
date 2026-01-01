import { useState, useEffect } from 'react';
import { bookmarksApi } from '../services/api';

interface Bookmark {
  id: string;
  bookId: string;
  position: number;
  title?: string;
  note?: string;
  createdAt: Date;
}

interface BookmarkPanelProps {
  bookId: string;
  currentPosition: number;
  onBookmarkClick: (position: number) => void;
  onCreateBookmark: (title?: string, note?: string) => void;
}

export default function BookmarkPanel({ bookId, currentPosition, onBookmarkClick, onCreateBookmark }: BookmarkPanelProps) {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');

  useEffect(() => {
    loadBookmarks();
  }, [bookId]);

  const loadBookmarks = async () => {
    try {
      const response = await bookmarksApi.getByBook(bookId);
      setBookmarks(response.data);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    }
  };

  const handleCreateBookmark = () => {
    onCreateBookmark(newTitle || undefined, newNote || undefined);
    setNewTitle('');
    setNewNote('');
    setIsAdding(false);
    // Reload bookmarks after a short delay
    setTimeout(loadBookmarks, 500);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bookmark?')) return;
    try {
      await bookmarksApi.delete(id);
      loadBookmarks();
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
      alert('Failed to delete bookmark');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Bookmarks ({bookmarks.length})
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title="Add bookmark at current position"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Add Bookmark Form */}
      {isAdding && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <input
            type="text"
            placeholder="Bookmark title (optional)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="w-full px-3 py-2 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white"
          />
          <textarea
            placeholder="Add a note (optional)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 mb-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-900 dark:text-white resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={handleCreateBookmark}
              className="flex-1 px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded text-sm font-medium"
            >
              Save
            </button>
            <button
              onClick={() => {
                setIsAdding(false);
                setNewTitle('');
                setNewNote('');
              }}
              className="flex-1 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {bookmarks.length === 0 ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-8 text-sm">
            No bookmarks yet. Add one to save your place!
          </p>
        ) : (
          bookmarks.map((bookmark) => (
            <div
              key={bookmark.id}
              className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <button
                  onClick={() => onBookmarkClick(bookmark.position)}
                  className="flex-1 text-left"
                >
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    {bookmark.title || 'Untitled Bookmark'}
                  </h4>
                  {bookmark.note && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {bookmark.note}
                    </p>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {new Date(bookmark.createdAt).toLocaleDateString()}
                  </p>
                </button>
                <button
                  onClick={() => handleDelete(bookmark.id)}
                  className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Delete bookmark"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              {bookmark.position === currentPosition && (
                <span className="inline-block px-2 py-0.5 bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 text-xs rounded">
                  Current position
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
