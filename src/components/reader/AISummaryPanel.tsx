'use client';

import React, { useState, useEffect } from 'react';
import { useAI } from '@/contexts/AIContext';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface AISummaryPanelProps {
  bookId: string;
  bookTitle: string;
  currentProgress: number;
  isVisible: boolean;
  onClose: () => void;
}

export function AISummaryPanel({ 
  bookId, 
  bookTitle, 
  currentProgress, 
  isVisible, 
  onClose 
}: AISummaryPanelProps) {
  const { state, generateSummary, clearSummary } = useAI();
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastProgress, setLastProgress] = useState(0);

  // Auto-generate summary when progress changes significantly
  useEffect(() => {
    if (isVisible && autoRefresh && Math.abs(currentProgress - lastProgress) >= 10) {
      handleGenerateSummary();
      setLastProgress(currentProgress);
    }
  }, [currentProgress, isVisible, autoRefresh, lastProgress]);

  const handleGenerateSummary = async (forceRefresh = false) => {
    try {
      await generateSummary(bookId, currentProgress, bookTitle, { forceRefresh });
    } catch (error) {
      console.error('Failed to generate summary:', error);
    }
  };

  const handleRefresh = () => {
    handleGenerateSummary(true);
  };

  const handleClearSummary = () => {
    clearSummary();
  };

  return (
    <div className="h-screen bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Summary</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{Math.round(currentProgress)}% complete</p>
          </div>
        </div>
        <Button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
          variant="ghost"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-update</span>
          </label>
          <div className="flex space-x-2">
            <Button
              onClick={handleRefresh}
              disabled={state.isLoading}
              size="sm"
              variant="outline"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </Button>
            {state.currentSummary && (
              <Button
                onClick={handleClearSummary}
                size="sm"
                variant="ghost"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {state.summaryFromCache && (
          <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
            ✓ Cached summary
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {state.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner />
            <span className="ml-2 text-gray-600 dark:text-gray-400">Generating summary...</span>
          </div>
        ) : state.error ? (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-red-800 dark:text-red-200">Error</span>
            </div>
            <p className="text-sm text-red-700 dark:text-red-300">{state.error}</p>
            <Button
              onClick={() => handleGenerateSummary(true)}
              className="mt-2"
              size="sm"
              variant="outline"
            >
              Try Again
            </Button>
          </div>
        ) : state.currentSummary ? (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">
                {state.currentSummary}
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Summary covers the first {Math.round(state.summaryProgress)}% of &quot;{bookTitle}&quot;
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">No Summary Yet</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Generate an AI summary of your reading progress so far.
            </p>
            <Button onClick={() => handleGenerateSummary()}>
              Generate Summary
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 