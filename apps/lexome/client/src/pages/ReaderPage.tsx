import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { booksApi, sessionsApi, annotationsApi } from '../services/api';
import type { Book, ReadingSession } from '../types';
import AIAssistant from '../components/AIAssistant';

export default function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [content, setContent] = useState<string>('');
  const [session, setSession] = useState<ReadingSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [showAIMenu, setShowAIMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [fontSize, setFontSize] = useState(18);
  const [darkMode, setDarkMode] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadBook();
      startSession();
    }
    const isDark = localStorage.getItem('darkMode') === 'true';
    setDarkMode(isDark);
  }, [id]);

  useEffect(() => {
    return () => {
      if (session) {
        endSession();
      }
    };
  }, [session]);

  const loadBook = async () => {
    try {
      const [bookRes, contentRes] = await Promise.all([
        booksApi.getById(id!),
        booksApi.getContent(id!),
      ]);
      setBook(bookRes.data);
      setContent(contentRes.data.content);
    } catch (error) {
      console.error('Failed to load book:', error);
      alert('Failed to load book content');
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      // Check for active session first
      const activeRes = await sessionsApi.getActive(id!);
      if (activeRes.data) {
        setSession(activeRes.data);
      } else {
        const sessionRes = await sessionsApi.start(id!);
        setSession(sessionRes.data);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const endSession = async () => {
    if (!session) return;
    try {
      // Calculate rough reading metrics
      const wordsRead = Math.floor(Math.random() * 500) + 100; // Placeholder
      const pagesRead = 1;
      await sessionsApi.end(session.id, { wordsRead, pagesRead });
    } catch (error) {
      console.error('Failed to end session:', error);
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !contentRef.current) {
      setShowAIMenu(false);
      return;
    }

    const text = selection.toString().trim();
    if (!text) {
      setShowAIMenu(false);
      return;
    }

    // Get selection position
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    // Calculate text offsets
    const contentText = contentRef.current.innerText;
    const selectedText = selection.toString();
    const startOffset = contentText.indexOf(selectedText);
    const endOffset = startOffset + selectedText.length;

    setSelectedText(text);
    setSelectionRange({ start: startOffset, end: endOffset });
    setMenuPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setShowAIMenu(true);
  };

  const handleCreateAnnotation = async (note?: string) => {
    if (!book || !selectionRange) return;
    try {
      await annotationsApi.create({
        bookId: book.id,
        textSelection: selectedText,
        startOffset: selectionRange.start,
        endOffset: selectionRange.end,
        noteContent: note,
        tags: [],
        isPublic: false,
      });
      alert('Annotation created!');
      setShowAIMenu(false);
    } catch (error) {
      console.error('Failed to create annotation:', error);
      alert('Failed to create annotation');
    }
  };

  const handleClosePage = () => {
    if (session) {
      endSession();
    }
    navigate(-1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading book...</p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Book not found</p>
          <button onClick={() => navigate('/library')} className="btn btn-primary">
            Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${darkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      {/* Reader Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleClosePage}
              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label="Close reader"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
                {book.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {book.author}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Font Size Controls */}
            <button
              onClick={() => setFontSize(s => Math.max(12, s - 2))}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Decrease font size"
            >
              A-
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-8 text-center">
              {fontSize}
            </span>
            <button
              onClick={() => setFontSize(s => Math.min(32, s + 2))}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Increase font size"
            >
              A+
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                const newMode = !darkMode;
                setDarkMode(newMode);
                localStorage.setItem('darkMode', String(newMode));
                if (newMode) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              }}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              aria-label="Toggle dark mode"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </header>

      {/* Reader Content */}
      <main className="max-w-3xl mx-auto px-6 py-8">
        <article
          ref={contentRef}
          className="prose dark:prose-invert max-w-none"
          style={{ fontSize: `${fontSize}px`, lineHeight: 1.8 }}
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </main>

      {/* AI Selection Menu */}
      {showAIMenu && book && (
        <AIAssistant
          selectedText={selectedText}
          book={book}
          position={menuPosition}
          onClose={() => setShowAIMenu(false)}
          onCreateAnnotation={handleCreateAnnotation}
        />
      )}
    </div>
  );
}
