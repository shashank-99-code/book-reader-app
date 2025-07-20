'use client';

import { useReader } from '@/contexts/ReaderContext';

export default function ReadingProgress() {
  const { progress, currentPage, currentBook } = useReader();

  if (!currentBook) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-lg p-2">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-300">
            Page {currentPage} of {currentBook.total_pages || '?'}
          </span>
          <span className="text-sm text-gray-600 dark:text-gray-300">
            {progress.toFixed(2)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
} 