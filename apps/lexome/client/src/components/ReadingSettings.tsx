import { useState } from 'react';

export interface ReadingPreferences {
  fontSize: number;
  lineHeight: number;
  maxWidth: number;
  fontFamily: string;
  darkMode: boolean;
}

interface ReadingSettingsProps {
  preferences: ReadingPreferences;
  onChange: (preferences: ReadingPreferences) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReadingSettings({ preferences, onChange, isOpen, onClose }: ReadingSettingsProps) {
  const [localPrefs, setLocalPrefs] = useState(preferences);

  const handleChange = (key: keyof ReadingPreferences, value: any) => {
    const updated = { ...localPrefs, [key]: value };
    setLocalPrefs(updated);
    onChange(updated);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Settings Panel */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-2xl z-50 p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Reading Settings
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Close settings"
          >
            <svg className="w-6 h-6 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Settings Form */}
        <div className="space-y-6">
          {/* Font Size */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Size: {localPrefs.fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="32"
              value={localPrefs.fontSize}
              onChange={(e) => handleChange('fontSize', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>

          {/* Line Height */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Line Spacing: {localPrefs.lineHeight.toFixed(1)}
            </label>
            <input
              type="range"
              min="1.2"
              max="2.5"
              step="0.1"
              value={localPrefs.lineHeight}
              onChange={(e) => handleChange('lineHeight', parseFloat(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Compact</span>
              <span>Spacious</span>
            </div>
          </div>

          {/* Content Width */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Width: {localPrefs.maxWidth === 100 ? 'Full' : localPrefs.maxWidth + 'ch'}
            </label>
            <input
              type="range"
              min="60"
              max="100"
              step="5"
              value={localPrefs.maxWidth}
              onChange={(e) => handleChange('maxWidth', parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Narrow</span>
              <span>Wide</span>
            </div>
          </div>

          {/* Font Family */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Font Family
            </label>
            <select
              value={localPrefs.fontFamily}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="serif">Serif (Traditional)</option>
              <option value="sans-serif">Sans-Serif (Modern)</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Times New Roman', serif">Times New Roman</option>
              <option value="'Merriweather', serif">Merriweather</option>
              <option value="'Open Sans', sans-serif">Open Sans</option>
              <option value="'Roboto', sans-serif">Roboto</option>
              <option value="monospace">Monospace</option>
            </select>
          </div>

          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dark Mode
            </label>
            <button
              onClick={() => handleChange('darkMode', !localPrefs.darkMode)}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${localPrefs.darkMode ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'}
              `}
              aria-pressed={localPrefs.darkMode}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${localPrefs.darkMode ? 'translate-x-6' : 'translate-x-1'}
                `}
              />
            </button>
          </div>
        </div>

        {/* Preview Text */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <p
            className="text-gray-700 dark:text-gray-300"
            style={{
              fontSize: `${localPrefs.fontSize}px`,
              lineHeight: localPrefs.lineHeight,
              fontFamily: localPrefs.fontFamily,
            }}
          >
            The quick brown fox jumps over the lazy dog. This is how your reading text will look.
          </p>
        </div>

        {/* Reset Button */}
        <button
          onClick={() => {
            const defaults: ReadingPreferences = {
              fontSize: 18,
              lineHeight: 1.8,
              maxWidth: 75,
              fontFamily: 'serif',
              darkMode: false,
            };
            setLocalPrefs(defaults);
            onChange(defaults);
          }}
          className="mt-6 w-full px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          Reset to Defaults
        </button>
      </div>
    </>
  );
}
