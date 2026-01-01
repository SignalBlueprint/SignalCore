import { useState } from 'react';
import { aiApi } from '../services/api';
import type { Book } from '../types';

interface AIAssistantProps {
  selectedText: string;
  book: Book;
  position: { x: number; y: number };
  onClose: () => void;
  onCreateAnnotation: (note?: string) => void;
}

type AIFeature = 'menu' | 'explain' | 'translate' | 'define' | 'summarize' | 'annotate';

export default function AIAssistant({
  selectedText,
  book,
  position,
  onClose,
  onCreateAnnotation,
}: AIAssistantProps) {
  const [activeFeature, setActiveFeature] = useState<AIFeature>('menu');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [annotationNote, setAnnotationNote] = useState('');

  const bookContext = {
    title: book.title,
    author: book.author,
  };

  const handleExplain = async () => {
    setActiveFeature('explain');
    setLoading(true);
    try {
      const res = await aiApi.explain(selectedText, bookContext);
      setResult(res.data);
    } catch (error) {
      console.error('Failed to explain:', error);
      setResult({ error: 'Failed to get explanation' });
    } finally {
      setLoading(false);
    }
  };

  const handleTranslate = async () => {
    setActiveFeature('translate');
    setLoading(true);
    try {
      const res = await aiApi.translate(selectedText, bookContext);
      setResult(res.data);
    } catch (error) {
      console.error('Failed to translate:', error);
      setResult({ error: 'Failed to translate text' });
    } finally {
      setLoading(false);
    }
  };

  const handleDefine = async () => {
    setActiveFeature('define');
    setLoading(true);
    try {
      // Extract first word if multiple words selected
      const word = selectedText.split(/\s+/)[0].replace(/[.,!?;:]/, '');
      const res = await aiApi.define(word, selectedText, bookContext);
      setResult(res.data);
    } catch (error) {
      console.error('Failed to define:', error);
      setResult({ error: 'Failed to get definition' });
    } finally {
      setLoading(false);
    }
  };

  const handleSummarize = async () => {
    setActiveFeature('summarize');
    setLoading(true);
    try {
      const res = await aiApi.summarize(selectedText, bookContext);
      setResult(res.data);
    } catch (error) {
      console.error('Failed to summarize:', error);
      setResult({ error: 'Failed to summarize text' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnotation = () => {
    onCreateAnnotation(annotationNote || undefined);
    onClose();
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    switch (activeFeature) {
      case 'menu':
        return (
          <div className="grid grid-cols-2 gap-2">
            <button onClick={handleExplain} className="ai-btn">
              💡 Explain
            </button>
            <button onClick={handleTranslate} className="ai-btn">
              🔄 Translate
            </button>
            <button onClick={handleDefine} className="ai-btn">
              📖 Define
            </button>
            <button onClick={handleSummarize} className="ai-btn">
              📝 Summarize
            </button>
            <button onClick={() => setActiveFeature('annotate')} className="ai-btn col-span-2">
              ✏️ Add Annotation
            </button>
          </div>
        );

      case 'explain':
        return (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Explanation
            </h3>
            {result?.error ? (
              <p className="text-red-600">{result.error}</p>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white mb-3">
                  {result?.explanation}
                </p>
                {result?.historicalContext && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded mb-2">
                    <h4 className="font-semibold text-sm mb-1">Historical Context:</h4>
                    <p className="text-sm">{result.historicalContext}</p>
                  </div>
                )}
                {result?.culturalContext && (
                  <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded">
                    <h4 className="font-semibold text-sm mb-1">Cultural Context:</h4>
                    <p className="text-sm">{result.culturalContext}</p>
                  </div>
                )}
              </>
            )}
            <button onClick={() => setActiveFeature('menu')} className="text-sm text-primary-600 hover:text-primary-700 mt-3">
              ← Back
            </button>
          </div>
        );

      case 'translate':
        return (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Modern Translation
            </h3>
            {result?.error ? (
              <p className="text-red-600">{result.error}</p>
            ) : (
              <>
                <div className="bg-green-50 dark:bg-green-950 p-3 rounded mb-3">
                  <p className="text-gray-900 dark:text-white">
                    {result?.modernText}
                  </p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {result?.explanation}
                </p>
              </>
            )}
            <button onClick={() => setActiveFeature('menu')} className="text-sm text-primary-600 hover:text-primary-700 mt-3">
              ← Back
            </button>
          </div>
        );

      case 'define':
        return (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Definition: {result?.word}
            </h3>
            {result?.error ? (
              <p className="text-red-600">{result.error}</p>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white mb-2">
                  <strong>Definition:</strong> {result?.definition}
                </p>
                <p className="text-gray-900 dark:text-white mb-2">
                  <strong>In this context:</strong> {result?.contextualMeaning}
                </p>
                {result?.etymology && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Etymology:</strong> {result.etymology}
                  </p>
                )}
              </>
            )}
            <button onClick={() => setActiveFeature('menu')} className="text-sm text-primary-600 hover:text-primary-700 mt-3">
              ← Back
            </button>
          </div>
        );

      case 'summarize':
        return (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Summary
            </h3>
            {result?.error ? (
              <p className="text-red-600">{result.error}</p>
            ) : (
              <>
                <p className="text-gray-900 dark:text-white mb-3">
                  {result?.summary}
                </p>
                {result?.keyPoints && result.keyPoints.length > 0 && (
                  <div className="mb-3">
                    <h4 className="font-semibold text-sm mb-1">Key Points:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {result.keyPoints.map((point: string, idx: number) => (
                        <li key={idx} className="text-sm">{point}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result?.themes && result.themes.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Themes:</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.themes.map((theme: string, idx: number) => (
                        <span key={idx} className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                          {theme}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
            <button onClick={() => setActiveFeature('menu')} className="text-sm text-primary-600 hover:text-primary-700 mt-3">
              ← Back
            </button>
          </div>
        );

      case 'annotate':
        return (
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              Create Annotation
            </h3>
            <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded mb-3">
              <p className="text-sm italic text-gray-700 dark:text-gray-300">
                "{selectedText.length > 100 ? selectedText.slice(0, 100) + '...' : selectedText}"
              </p>
            </div>
            <textarea
              value={annotationNote}
              onChange={(e) => setAnnotationNote(e.target.value)}
              placeholder="Add your note (optional)..."
              className="input mb-3"
              rows={4}
            />
            <div className="flex gap-2">
              <button onClick={handleSaveAnnotation} className="btn btn-primary flex-1">
                Save Annotation
              </button>
              <button onClick={() => setActiveFeature('menu')} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* AI Menu Popup */}
      <div
        className="fixed z-50 w-96 max-w-[90vw]"
        style={{
          left: `${Math.min(position.x, window.innerWidth - 400)}px`,
          top: `${Math.max(60, position.y - 10)}px`,
          transform: 'translateX(-50%)',
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 max-h-[80vh] overflow-y-auto">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {renderContent()}
        </div>

        {/* Arrow pointing to selection */}
        <div
          className="absolute w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-white dark:border-t-gray-800"
          style={{
            left: '50%',
            top: '-8px',
            transform: 'translateX(-50%)',
          }}
        />
      </div>

      <style>{`
        .ai-btn {
          @apply px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-900 dark:text-white transition-colors;
        }
      `}</style>
    </>
  );
}
