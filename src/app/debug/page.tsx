'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';

interface BookInfo {
  id: string;
  title: string;
  file_type: string;
  chunk_count: number;
  has_chunks: boolean;
}

export default function DebugPage() {
  const [books, setBooks] = useState<BookInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTest, setSearchTest] = useState('');
  const [selectedBook, setSelectedBook] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadBooks();
  }, []);

  const loadBooks = async () => {
    try {
      const supabase = createClient();
      
      // Get user's books and chunk counts
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('id, title, file_type')
        .order('created_at', { ascending: false });

      if (booksError) {
        console.error('Error loading books:', booksError);
        return;
      }

      // Get chunk counts for each book
      const booksWithChunks: BookInfo[] = await Promise.all(
        (booksData || []).map(async (book) => {
          const { data: chunks, error: chunksError } = await supabase
            .from('book_chunks')
            .select('id')
            .eq('book_id', book.id);

          return {
            ...book,
            chunk_count: chunks?.length || 0,
            has_chunks: (chunks?.length || 0) > 0
          };
        })
      );

      setBooks(booksWithChunks);
    } catch (error) {
      console.error('Error in loadBooks:', error);
    } finally {
      setLoading(false);
    }
  };

  const testSearch = async () => {
    if (!searchTest.trim() || !selectedBook) return;
    
    setIsSearching(true);
    setSearchResults([]);
    
    try {
      const response = await fetch(`/api/books/${selectedBook}/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin', // Include cookies for authentication
        body: JSON.stringify({
          query: searchTest.trim(),
          caseSensitive: false,
          wholeWords: false,
          maxResults: 20,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSearchResults(data.results || []);
      } else {
        console.error('Search failed:', data.error);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Search test failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const processBook = async (bookId: string) => {
    setIsProcessing(bookId);
    
    try {
      const response = await fetch(`/api/books/${bookId}/reprocess`, {
        method: 'POST',
        credentials: 'same-origin', // Include cookies for authentication
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`✅ Success: ${data.message}. Created ${data.chunksCreated} chunks.`);
        await loadBooks(); // Reload to update chunk counts
      } else {
        alert(`❌ Error: ${data.error}. ${data.details || ''}`);
      }
    } catch (error) {
      alert(`❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            Loading...
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          📊 Book Search Debug Panel
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          This page helps diagnose search issues. Books need to be processed into chunks for search to work.
        </p>

        {/* Books Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📚 Your Books Status
          </h2>
          
          {books.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No books found. Upload some books first.</p>
          ) : (
        <div className="space-y-4">
              {books.map((book) => (
                <div key={book.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {book.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {book.file_type} • {book.has_chunks ? `${book.chunk_count} chunks` : 'Not processed'}
                    </p>
          </div>
          
                  <div className="flex items-center space-x-2">
                    {book.has_chunks ? (
                      <span className="px-3 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-full text-sm">
                        ✅ Ready for search
                      </span>
                    ) : (
                      <span className="px-3 py-1 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-full text-sm">
                        ❌ Needs processing
                      </span>
                    )}
                    
                    <Button
                      onClick={() => processBook(book.id)}
                      disabled={isProcessing === book.id}
                      variant="secondary"
                      className="text-sm px-3 py-1"
                    >
                      {isProcessing === book.id ? 'Processing...' : 'Process'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Search Test */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            🔍 Test Search
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Select Book
              </label>
              <select
                value={selectedBook}
                onChange={(e) => setSelectedBook(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">Choose a book...</option>
                {books.filter(book => book.has_chunks).map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} ({book.chunk_count} chunks)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Search Term
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={searchTest}
                  onChange={(e) => setSearchTest(e.target.value)}
                  placeholder="Enter search term..."
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  onKeyDown={(e) => e.key === 'Enter' && testSearch()}
                />
                <Button
                  onClick={testSearch}
                  disabled={isSearching || !searchTest.trim() || !selectedBook}
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">
                  ✅ Found {searchResults.length} results:
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {searchResults.map((result, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="font-medium text-sm text-gray-700 dark:text-gray-300">
                        {result.chapter_title}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {result.text_content?.substring(0, 200)}...
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchTest && selectedBook && !isSearching && searchResults.length === 0 && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-red-700 dark:text-red-300">
                  ❌ No results found. The text might not be in the book, or the book needs reprocessing.
                </p>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
} 