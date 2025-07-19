'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAI } from '@/contexts/AIContext';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QAItem } from '@/lib/types/ai';

interface AIQAPanelProps {
  bookId: string;
  bookTitle: string;
  isVisible: boolean;
  onClose: () => void;
}

export function AIQAPanel({ bookId, bookTitle, isVisible, onClose }: AIQAPanelProps) {
  const { state, askQuestion, clearQAHistory } = useAI();
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.qaHistory]);

  // Focus textarea when panel opens
  useEffect(() => {
    if (isVisible) {
      textareaRef.current?.focus();
    }
  }, [isVisible]);

  const handleSubmitQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || isAsking) return;

    const trimmedQuestion = question.trim();
    setQuestion('');
    setIsAsking(true);

    try {
      await askQuestion(trimmedQuestion, bookId);
    } catch (error) {
      console.error('Failed to ask question:', error);
    } finally {
      setIsAsking(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitQuestion(e);
    }
  };

  const handleClearHistory = () => {
    clearQAHistory();
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">Ask AI</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">About &quot;{bookTitle}&quot;</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {state.qaHistory.length > 0 && (
            <Button
              onClick={handleClearHistory}
              size="sm"
              variant="ghost"
              className="text-xs"
            >
              Clear
            </Button>
          )}
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
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {state.qaHistory.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Ask anything about this book</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              I can answer questions about characters, plot, themes, and more based on the book content.
            </p>
          </div>
        ) : (
          state.qaHistory.map((qa: QAItem) => (
            <div key={qa.id} className="space-y-3">
              {/* User Question */}
              <div className="flex justify-end">
                <div className="max-w-xs lg:max-w-sm">
                  <div className="bg-blue-500 text-white rounded-lg px-4 py-2">
                    <p className="text-sm">{qa.question}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 text-right">
                    {formatTimestamp(qa.timestamp)}
                  </p>
                </div>
              </div>

              {/* AI Answer */}
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-sm">
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-lg px-4 py-2">
                    {qa.isLoading ? (
                      <div className="flex items-center space-x-2">
                        <LoadingSpinner size="sm" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">Thinking...</span>
                      </div>
                    ) : qa.error ? (
                      <div className="space-y-2">
                        <p className="text-sm text-red-600 dark:text-red-400">
                          Sorry, I encountered an error: {qa.error}
                        </p>
                        <Button
                          onClick={() => askQuestion(qa.question, bookId)}
                          size="sm"
                          variant="outline"
                          className="text-xs"
                        >
                          Retry
                        </Button>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                        {qa.answer}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmitQuestion} className="space-y-3">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about the book..."
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
              rows={3}
              maxLength={1000}
              disabled={isAsking}
            />
            <div className="absolute bottom-2 right-2 text-xs text-gray-400">
              {question.length}/1000
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Press Enter to send, Shift+Enter for new line
            </div>
            <Button
              type="submit"
              disabled={!question.trim() || isAsking}
              size="sm"
            >
              {isAsking ? (
                <>
                  <LoadingSpinner size="sm" />
                  <span className="ml-1">Asking...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                  Ask
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
} 