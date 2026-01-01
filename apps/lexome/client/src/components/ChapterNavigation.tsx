import { useState, useEffect } from 'react';

interface Chapter {
  id: string;
  title: string;
  level: number; // 1 for main chapters, 2 for subsections
  position: number; // Character offset in the document
}

interface ChapterNavigationProps {
  content: string;
  onChapterClick: (position: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ChapterNavigation({ content, onChapterClick, isOpen, onClose }: ChapterNavigationProps) {
  const [chapters, setChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    if (content) {
      extractChapters();
    }
  }, [content]);

  const extractChapters = () => {
    const chapterList: Chapter[] = [];

    // Common patterns for chapters in classic literature
    const patterns = [
      /^CHAPTER\s+([IVXLCDM\d]+)[:\.]?\s*(.*)$/gim,
      /^Chapter\s+(\d+)[:\.]?\s*(.*)$/gim,
      /^([IVXLCDM]+)\.\s+(.+)$/gim,
      /^PART\s+([IVXLCDM\d]+)[:\.]?\s*(.*)$/gim,
      /^BOOK\s+([IVXLCDM\d]+)[:\.]?\s*(.*)$/gim,
    ];

    // Split content into lines for processing
    const lines = content.split('\n');
    let currentPosition = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check each pattern
      for (const pattern of patterns) {
        const match = line.match(new RegExp(pattern.source, 'i'));
        if (match && match[0].length > 0) {
          const chapterNum = match[1] || '';
          const chapterTitle = match[2] || match[0];

          chapterList.push({
            id: `chapter-${i}`,
            title: chapterTitle || `Chapter ${chapterNum}`,
            level: line.startsWith('PART') || line.startsWith('BOOK') ? 1 : 2,
            position: currentPosition,
          });
          break;
        }
      }

      currentPosition += lines[i].length + 1; // +1 for newline
    }

    // If no chapters found, create basic sections based on content length
    if (chapterList.length === 0) {
      const sectionSize = Math.floor(content.length / 10);
      for (let i = 0; i < 10; i++) {
        chapterList.push({
          id: `section-${i}`,
          title: `Section ${i + 1}`,
          level: 1,
          position: i * sectionSize,
        });
      }
    }

    setChapters(chapterList);
  };

  const handleChapterClick = (position: number) => {
    onChapterClick(position);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className={`
        fixed top-0 right-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        ${isOpen ? 'translate-x-0' : 'translate-x-full'}
      `}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Table of Contents
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close navigation"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chapter List */}
        <nav className="p-4">
          {chapters.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No chapters detected in this book
            </p>
          ) : (
            <ul className="space-y-1">
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <button
                    onClick={() => handleChapterClick(chapter.position)}
                    className={`
                      w-full text-left px-4 py-2 rounded-lg
                      transition-colors duration-150
                      hover:bg-primary-50 dark:hover:bg-gray-700
                      ${chapter.level === 1 ? 'font-semibold' : 'pl-8 text-sm'}
                      text-gray-700 dark:text-gray-300
                    `}
                  >
                    {chapter.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>

        {/* Footer with chapter count */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            {chapters.length} {chapters.length === 1 ? 'section' : 'sections'} found
          </p>
        </div>
      </div>
    </>
  );
}
