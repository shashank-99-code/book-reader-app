'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
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
  const [loadingStep, setLoadingStep] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Auto-generate summary when progress changes significantly
  useEffect(() => {
    if (isVisible && autoRefresh && Math.abs(currentProgress - lastProgress) >= 10) {
      handleGenerateSummary();
      setLastProgress(currentProgress);
    }
  }, [currentProgress, isVisible, autoRefresh, lastProgress]);

  // Enhanced loading animation
  useEffect(() => {
    if (state.isLoading) {
      setLoadingStep(0);
      setLoadingProgress(0);
      
      const steps = [
        { step: 0, progress: 25, duration: 800 },
        { step: 1, progress: 60, duration: 1200 },
        { step: 2, progress: 85, duration: 800 },
        { step: 3, progress: 100, duration: 400 }
      ];

      const timeouts: NodeJS.Timeout[] = [];
      steps.forEach(({ step, progress }, index) => {
        const timeout = setTimeout(() => {
          setLoadingStep(step);
          setLoadingProgress(progress);
        }, index * 800);
        timeouts.push(timeout);
      });

      // Cleanup function
      return () => {
        timeouts.forEach(clearTimeout);
      };
    } else {
      setLoadingStep(0);
      setLoadingProgress(0);
    }
  }, [state.isLoading]);

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

  const loadingSteps = [
    { icon: '📖', text: 'Reading your book content...', color: 'text-blue-500' },
    { icon: '🧠', text: 'Analyzing themes and concepts...', color: 'text-purple-500' },
    { icon: '✨', text: 'Generating AI insights...', color: 'text-green-500' },
    { icon: '📝', text: 'Finalizing summary...', color: 'text-orange-500' }
  ];

  return (
    <div className="h-full bg-white dark:bg-gray-900 border-l-2 border-gray-200 dark:border-gray-700 shadow-xl flex flex-col relative z-10">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-800">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-md">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-lg">AI Summary</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {currentProgress.toFixed(1)}% complete • {bookTitle}
            </p>
          </div>
        </div>
        <Button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          variant="ghost"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </Button>
      </div>

      {/* Controls */}
      <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Auto-update</span>
          </label>
          <div className="flex space-x-2">
            <Button
              onClick={handleRefresh}
              disabled={state.isLoading}
              size="sm"
              variant="outline"
              className="shadow-sm"
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
                className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {state.summaryFromCache && (
          <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            Cached summary loaded instantly
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {state.isLoading ? (
          <div className="p-6">
            {/* Enhanced Loading Header */}
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <LoadingSpinner className="w-8 h-8" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full opacity-20 animate-pulse"></div>
                  </div>
                </div>
                <div className="ml-4">
                  <span className="text-lg font-semibold text-gray-800 dark:text-gray-200">Generating AI Summary</span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Processing {currentProgress.toFixed(1)}% of your reading progress
                  </p>
                </div>
              </div>
            </div>

            {/* Enhanced Progress Bar */}
            <div className="mb-8">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                <span>Progress</span>
                <span>{loadingProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden shadow-inner">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600 rounded-full transition-all duration-1000 ease-out relative"
                  style={{ width: `${loadingProgress}%` }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Enhanced Loading Steps */}
            <div className="space-y-4">
              {loadingSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`flex items-center p-3 rounded-lg transition-all duration-500 ${
                    index <= loadingStep 
                      ? 'bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700' 
                      : 'bg-gray-50 dark:bg-gray-900 opacity-50'
                  }`}
                >
                  <span className="text-2xl mr-3">{step.icon}</span>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${
                      index <= loadingStep ? step.color : 'text-gray-400 dark:text-gray-600'
                    }`}>
                      {step.text}
                    </span>
                  </div>
                  {index <= loadingStep && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </div>
              ))}
            </div>

            {/* Estimated Time */}
            <div className="mt-8 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                  Usually takes 15-45 seconds • Powered by AI
                </p>
              </div>
            </div>
          </div>
        ) : state.error ? (
          <div className="p-6">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-center mb-3">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold text-red-800 dark:text-red-200">Error Generating Summary</span>
              </div>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">{state.error}</p>
              <Button
                onClick={() => handleGenerateSummary(true)}
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/20"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>
            </div>
          </div>
        ) : state.currentSummary ? (
          <div className="p-6">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <div className="p-6">
                  <div className="text-gray-800 dark:text-gray-200 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        h1: ({children}) => <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">{children}</h1>,
                        h2: ({children}) => <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3 mt-6">{children}</h2>,
                        h3: ({children}) => <h3 className="text-md font-medium text-gray-700 dark:text-gray-200 mb-2 mt-4">{children}</h3>,
                        p: ({children}) => <p className="mb-4 text-gray-700 dark:text-gray-300 leading-relaxed">{children}</p>,
                        ul: ({children}) => <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">{children}</ol>,
                        li: ({children}) => <li className="mb-1">{children}</li>,
                        strong: ({children}) => <strong className="font-semibold text-gray-900 dark:text-white">{children}</strong>,
                        em: ({children}) => <em className="italic text-gray-600 dark:text-gray-400">{children}</em>,
                        blockquote: ({children}) => <blockquote className="border-l-4 border-blue-500 pl-4 py-2 mb-4 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 italic">{children}</blockquote>,
                      }}
                    >
                      {state.currentSummary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                <span>✨ AI-generated summary</span>
                <span>Covers {state.summaryProgress.toFixed(1)}% of "{bookTitle}"</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-12 px-6">
            <div className="relative mb-6">
              <div className="p-4 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full w-20 h-20 mx-auto flex items-center justify-center shadow-lg">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center">
                <span className="text-xs">✨</span>
              </div>
            </div>
            
            <h4 className="font-bold text-xl text-gray-900 dark:text-white mb-3">No Summary Yet</h4>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              Generate an AI-powered summary of your reading progress to get key insights and themes.
            </p>
            
            <Button 
              onClick={() => handleGenerateSummary()}
              className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-8 py-3 rounded-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generate Summary
            </Button>
          </div>
        )}
      </div>
    </div>
  );
} 