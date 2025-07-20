'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

interface SearchDebugPanelProps {
  bookId: string;
  bookTitle: string;
}

interface SearchResult {
  id: string;
  chunk_index: number;
  text_content: string;
  chapter_title?: string;
}

export default function SearchDebugPanel({ bookId, bookTitle }: SearchDebugPanelProps) {
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState<string | null>(null);
  const [searchTest, setSearchTest] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const handleReprocess = async () => {
    setIsReprocessing(true);
    setReprocessResult(null);
    
    try {
      const response = await fetch(`/api/books/${bookId}/reprocess`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (data.success) {
        setReprocessResult(`✅ Success: ${data.message}. Created ${data.chunksCreated} chunks.`);
      } else {
        setReprocessResult(`❌ Error: ${data.error}. ${data.details || ''}`);
      }
    } catch (error) {
      setReprocessResult(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleTestSearch = async () => {
    if (!searchTest.trim()) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch(`/api/books/${bookId}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchTest.trim(),
          caseSensitive: false,
          wholeWords: false,
          maxResults: 10,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search test failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-4 z-50">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          Search Debug Panel
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {bookTitle || 'Current Book'}
        </p>
      </div>

      {/* Test Search */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Test Search
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={searchTest}
            onChange={(e) => setSearchTest(e.target.value)}
            placeholder="Enter search term..."
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            onKeyDown={(e) => e.key === 'Enter' && handleTestSearch()}
          />
          <Button
            onClick={handleTestSearch}
            disabled={isSearching || !searchTest.trim()}
            className="px-3 py-2 text-sm"
          >
            {isSearching ? '...' : 'Test'}
          </Button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 text-sm text-green-600 dark:text-green-400">
            ✅ Found {searchResults.length} results
          </div>
        )}
        {searchTest && !isSearching && searchResults.length === 0 && (
          <div className="mt-2 text-sm text-red-600 dark:text-red-400">
            ❌ No results found - try reprocessing the book
          </div>
        )}
      </div>

      {/* Reprocess Button */}
      <div className="mb-4">
        <Button
          onClick={handleReprocess}
          disabled={isReprocessing}
          variant="secondary"
          className="w-full"
        >
          {isReprocessing ? 'Reprocessing...' : 'Reprocess Book Text'}
        </Button>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          This will re-extract text from the book file and recreate search indexes
        </p>
      </div>

      {/* Reprocess Result */}
      {reprocessResult && (
        <div className="mb-4 p-3 rounded-md bg-gray-50 dark:bg-gray-700">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {reprocessResult}
          </div>
        </div>
      )}

      {/* Search Results Preview */}
      {searchResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Search Results Preview:
          </h4>
          {searchResults.slice(0, 3).map((result, index) => (
            <div key={index} className="mb-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs">
              <div className="font-medium text-gray-700 dark:text-gray-300">
                {result.chapter_title}
              </div>
              <div className="text-gray-600 dark:text-gray-400 truncate">
                {result.text_content?.substring(0, 100)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 