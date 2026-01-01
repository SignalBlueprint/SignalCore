interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Shortcut {
  keys: string;
  description: string;
  category: string;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  if (!isOpen) return null;

  const shortcuts: Shortcut[] = [
    // Navigation
    { keys: 'Ctrl/Cmd + T', description: 'Toggle table of contents', category: 'Navigation' },
    { keys: 'Ctrl/Cmd + B', description: 'Toggle bookmarks panel', category: 'Navigation' },
    { keys: 'Esc', description: 'Close reader and return', category: 'Navigation' },

    // Reading
    { keys: 'Ctrl/Cmd + ,', description: 'Open reading settings', category: 'Reading' },
    { keys: 'Mouse Select', description: 'Select text for AI assistance', category: 'Reading' },

    // Help
    { keys: 'Ctrl/Cmd + /', description: 'Show keyboard shortcuts', category: 'Help' },
  ];

  const categories = Array.from(new Set(shortcuts.map(s => s.category)));

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Keyboard Shortcuts
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Quick reference guide for Lexome reader
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {categories.map((category) => (
              <div key={category} className="mb-6 last:mb-0">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  {category}
                </h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter(s => s.category === category)
                    .map((shortcut, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          {shortcut.description}
                        </span>
                        <kbd className="px-3 py-1.5 text-sm font-mono font-semibold text-gray-800 dark:text-gray-200 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm">
                          {shortcut.keys}
                        </kbd>
                      </div>
                    ))}
                </div>
              </div>
            ))}

            {/* Additional Tips */}
            <div className="mt-6 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg border border-primary-200 dark:border-primary-800">
              <h4 className="font-semibold text-primary-900 dark:text-primary-100 mb-2">
                Tips
              </h4>
              <ul className="text-sm text-primary-800 dark:text-primary-200 space-y-1 list-disc list-inside">
                <li>Select any text to get AI-powered explanations and definitions</li>
                <li>Your reading progress is automatically saved</li>
                <li>Annotations and bookmarks are synced across devices</li>
                <li>Use dark mode for comfortable nighttime reading</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
