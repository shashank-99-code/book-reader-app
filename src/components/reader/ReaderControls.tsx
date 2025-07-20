'use client';

import { useState } from 'react';

interface ReaderControlsProps {
  onZoomChange: (zoom: number) => void;
  onThemeChange: (theme: 'light' | 'dark' | 'sepia') => void;
  currentZoom: number;
  currentTheme: 'light' | 'dark' | 'sepia';
  onShowSummary?: () => void;
  onShowQA?: () => void;
}

export function ReaderControls({
  onZoomChange,
  onThemeChange,
  currentZoom,
  currentTheme,
  onShowSummary,
  onShowQA,
}: ReaderControlsProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="fixed bottom-4 right-4 space-y-3">
      {/* AI Feature Buttons */}
      <div className="flex flex-col space-y-2">
        {onShowSummary && (
          <button
            onClick={onShowSummary}
            className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors"
            title="AI Summary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}
        {onShowQA && (
          <button
            onClick={onShowQA}
            className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-colors"
            title="Ask AI"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        )}
      </div>

      {/* Reader Settings */}
      <div className="bg-white rounded-lg shadow-lg p-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-full hover:bg-gray-100"
        aria-label="Reader settings"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 bg-white rounded-lg shadow-lg p-4 w-64">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zoom</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onZoomChange(Math.max(0.5, currentZoom - 0.1))}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  -
                </button>
                <span className="w-12 text-center">{Math.round(currentZoom * 100)}%</span>
                <button
                  onClick={() => onZoomChange(Math.min(2, currentZoom + 0.1))}
                  className="p-1 rounded hover:bg-gray-100"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Theme</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onThemeChange('light')}
                  className={`p-2 rounded ${
                    currentTheme === 'light' ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => onThemeChange('dark')}
                  className={`p-2 rounded ${
                    currentTheme === 'dark' ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => onThemeChange('sepia')}
                  className={`p-2 rounded ${
                    currentTheme === 'sepia' ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  Sepia
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
} 