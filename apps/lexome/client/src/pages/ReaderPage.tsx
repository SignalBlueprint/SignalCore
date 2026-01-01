import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { booksApi, sessionsApi, annotationsApi, bookmarksApi } from '../services/api';
import type { Book, ReadingSession, Annotation } from '../types';
import AIAssistant from '../components/AIAssistant';
import ChapterNavigation from '../components/ChapterNavigation';
import ReadingSettings, { type ReadingPreferences } from '../components/ReadingSettings';
import BookmarkPanel from '../components/BookmarkPanel';
import ProgressIndicator from '../components/ProgressIndicator';
import KeyboardShortcutsModal from '../components/KeyboardShortcutsModal';

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
  const [preferences, setPreferences] = useState<ReadingPreferences>({
    fontSize: 18,
    lineHeight: 1.8,
    maxWidth: 75,
    fontFamily: 'serif',
    darkMode: false,
  });
  const [showChapterNav, setShowChapterNav] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBookmarks, setShowBookmarks] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [wordsReadInSession, setWordsReadInSession] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      loadBook();
      startSession();
    }
    // Load saved preferences
    const savedPrefs = localStorage.getItem('readingPreferences');
    if (savedPrefs) {
      try {
        const parsed = JSON.parse(savedPrefs);
        setPreferences(parsed);
        if (parsed.darkMode) {
          document.documentElement.classList.add('dark');
        }
      } catch (e) {
        console.error('Failed to parse reading preferences');
      }
    }
  }, [id]);

  // Track scroll progress
  useEffect(() => {
    const handleScroll = () => {
      if (!contentRef.current) return;
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      // Calculate words read based on scroll progress
      if (totalWords > 0) {
        const estimatedWordsRead = Math.floor((progress / 100) * totalWords);
        setWordsReadInSession(Math.max(wordsReadInSession, estimatedWordsRead));
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [totalWords, wordsReadInSession]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'b':
            e.preventDefault();
            setShowBookmarks(prev => !prev);
            break;
          case 't':
            e.preventDefault();
            setShowChapterNav(prev => !prev);
            break;
          case ',':
            e.preventDefault();
            setShowSettings(prev => !prev);
            break;
          case '/':
            e.preventDefault();
            setShowHelp(prev => !prev);
            break;
        }
      } else if (e.key === 'Escape') {
        // Close modals on Escape
        if (showHelp) {
          setShowHelp(false);
        } else if (showSettings) {
          setShowSettings(false);
        } else if (showChapterNav) {
          setShowChapterNav(false);
        } else if (showBookmarks) {
          setShowBookmarks(false);
        } else {
          handleClosePage();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [showHelp, showSettings, showChapterNav, showBookmarks]);

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

      // Calculate total words
      const text = contentRes.data.content.replace(/<[^>]*>/g, ' ');
      const words = text.trim().split(/\s+/).filter(word => word.length > 0);
      setTotalWords(words.length);

      // Load annotations for highlighting
      loadAnnotations();
    } catch (error) {
      console.error('Failed to load book:', error);
      alert('Failed to load book content');
    } finally {
      setLoading(false);
    }
  };

  const loadAnnotations = async () => {
    if (!id) return;
    try {
      const response = await annotationsApi.getByBook(id);
      setAnnotations(response.data);
    } catch (error) {
      console.error('Failed to load annotations:', error);
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
      // Calculate reading metrics based on actual scroll progress
      const pagesRead = Math.max(1, Math.floor(scrollProgress / 10)); // Estimate ~10% per page
      await sessionsApi.end(session.id, {
        wordsRead: wordsReadInSession,
        pagesRead,
        currentLocation: `${Math.floor(scrollProgress)}%`
      });
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
      loadAnnotations(); // Reload to show the new annotation
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

  const handlePreferencesChange = (newPrefs: ReadingPreferences) => {
    setPreferences(newPrefs);
    localStorage.setItem('readingPreferences', JSON.stringify(newPrefs));
    if (newPrefs.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const scrollToPosition = (position: number) => {
    if (!contentRef.current) return;
    const contentText = contentRef.current.innerText;
    if (position >= contentText.length) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
      return;
    }
    // Rough estimate: scroll to percentage of document
    const percentage = position / contentText.length;
    const scrollPosition = percentage * document.documentElement.scrollHeight;
    window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
  };

  const handleCreateBookmark = async (title?: string, note?: string) => {
    if (!book) return;
    try {
      await bookmarksApi.create({
        bookId: book.id,
        position: Math.floor(scrollProgress),
        title,
        note,
      });
      alert('Bookmark created!');
    } catch (error) {
      console.error('Failed to create bookmark:', error);
      alert('Failed to create bookmark');
    }
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
    <div className={`min-h-screen ${preferences.darkMode ? 'dark bg-gray-900' : 'bg-white'}`}>
      {/* Reader Header */}
      <header className="sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <button
                onClick={handleClosePage}
                className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                aria-label="Close reader"
                title="Close (Esc)"
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

            <div className="flex items-center gap-1">
              {/* Table of Contents */}
              <button
                onClick={() => setShowChapterNav(!showChapterNav)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Table of contents"
                title="Table of Contents (Ctrl/Cmd+T)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>

              {/* Annotations Toggle */}
              <button
                onClick={() => setShowAnnotations(!showAnnotations)}
                className={`p-2 rounded transition-colors ${
                  showAnnotations
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label="Toggle annotations"
                title={`${showAnnotations ? 'Hide' : 'Show'} Annotations (${annotations.length})`}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
              </button>

              {/* Bookmarks */}
              <button
                onClick={() => setShowBookmarks(!showBookmarks)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Bookmarks"
                title="Bookmarks (Ctrl/Cmd+B)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Reading settings"
                title="Settings (Ctrl/Cmd+,)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              {/* Help */}
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                aria-label="Keyboard shortcuts"
                title="Keyboard Shortcuts (Ctrl/Cmd+/)"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <ProgressIndicator
            currentPosition={scrollProgress}
            totalLength={100}
            className="mt-2"
          />
        </div>
      </header>

      {/* Reader Content */}
      <main
        className="mx-auto px-6 py-8 relative"
        style={{ maxWidth: preferences.maxWidth === 100 ? '100%' : `${preferences.maxWidth}ch` }}
      >
        <article
          ref={contentRef}
          className="prose dark:prose-invert max-w-none"
          style={{
            fontSize: `${preferences.fontSize}px`,
            lineHeight: preferences.lineHeight,
            fontFamily: preferences.fontFamily,
          }}
          onMouseUp={handleTextSelection}
          dangerouslySetInnerHTML={{ __html: content }}
        />

        {/* Annotation Indicators */}
        {showAnnotations && annotations.length > 0 && (
          <div className="fixed right-4 top-1/2 -translate-y-1/2 z-10 space-y-2">
            {annotations.map((annotation, index) => (
              <button
                key={annotation.id}
                onClick={() => {
                  // Scroll to annotation position
                  if (contentRef.current) {
                    const percentage = annotation.startOffset / contentRef.current.innerText.length;
                    const scrollPosition = percentage * document.documentElement.scrollHeight;
                    window.scrollTo({ top: scrollPosition, behavior: 'smooth' });
                  }
                }}
                className="block w-2 h-8 bg-primary-500 hover:bg-primary-600 dark:bg-primary-400 dark:hover:bg-primary-500 rounded-full opacity-60 hover:opacity-100 transition-all hover:w-3"
                title={`Annotation: ${annotation.textSelection.slice(0, 50)}...`}
                style={{
                  opacity: showAnnotations ? 0.6 : 0,
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* Chapter Navigation */}
      <ChapterNavigation
        content={content}
        onChapterClick={scrollToPosition}
        isOpen={showChapterNav}
        onClose={() => setShowChapterNav(false)}
      />

      {/* Reading Settings */}
      <ReadingSettings
        preferences={preferences}
        onChange={handlePreferencesChange}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Bookmark Panel */}
      {showBookmarks && book && (
        <div className="fixed bottom-4 right-4 z-40">
          <BookmarkPanel
            bookId={book.id}
            currentPosition={Math.floor(scrollProgress)}
            onBookmarkClick={scrollToPosition}
            onCreateBookmark={handleCreateBookmark}
          />
        </div>
      )}

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

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </div>
  );
}
