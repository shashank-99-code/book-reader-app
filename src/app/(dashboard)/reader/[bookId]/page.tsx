'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import BookViewer from '@/components/book/BookViewer';
import { getBookById, updateLastRead } from '@/lib/services/bookService';
import { getPublicUrl } from '@/lib/services/fileService';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useReader } from '@/contexts/ReaderContext';
import ReadingProgress from '@/components/reader/ReadingProgress';
import { AISummaryPanel } from '@/components/reader/AISummaryPanel';
import { AIQAPanel } from '@/components/reader/AIQAPanel';

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { 
    currentBook,
    setCurrentBook,
    isLoading: contextLoading,
    error: contextError,
    settings,
    progress
  } = useReader();

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummaryPanel, setShowSummaryPanel] = useState(false);
  const [showQAPanel, setShowQAPanel] = useState(false);

  // Load book data
  useEffect(() => {
    let mounted = true;

    async function loadBook() {
      try {
        setIsLoading(true);
        setError(null);
        const book = await getBookById(resolvedParams.bookId);
        if (!mounted) return;
        
        if (!book) {
          throw new Error('Book not found');
        }
        if (!book.file_path || !book.file_type) {
          throw new Error('Book data is incomplete (missing file path or type).');
        }
        
        const url = await getPublicUrl(book.file_path);
        if (!mounted) return;
        
        setCurrentBook({
          ...book,
          publicUrl: url
        });

        // Update last_read timestamp when book is opened
        try {
          await updateLastRead(resolvedParams.bookId);
          console.log('Updated last_read timestamp for book:', resolvedParams.bookId);
        } catch (lastReadError) {
          console.warn('Failed to update last_read timestamp:', lastReadError);
          // Don't throw error here as it's not critical for reading functionality
        }
      } catch (err) {
        if (!mounted) return;
        console.error('Failed to load book:', err);
        setError(err instanceof Error ? err.message : 'Failed to load book');
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadBook();

    return () => {
      mounted = false;
    };
  }, [resolvedParams.bookId, setCurrentBook]);

  if (isLoading || contextLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || contextError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">Error: {error || contextError}</p>
        <button
          onClick={() => router.push('/library')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Library
        </button>
      </div>
    );
  }

  if (!currentBook?.publicUrl || !currentBook?.file_type) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-yellow-500 mb-4">File URL or type not available.</p>
        <button
          onClick={() => router.push('/library')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Library
        </button>
      </div>
    );
  }

  const handleShowSummary = () => {
    console.log('Generating summary with progress:', progress, 'for book:', currentBook?.title);
    setShowQAPanel(false); // Close QA panel if open
    setShowSummaryPanel(true);
  };

  const handleShowQA = () => {
    console.log('Opening Q&A with progress:', progress, 'for book:', currentBook?.title);
    setShowSummaryPanel(false); // Close summary panel if open
    setShowQAPanel(true);
  };

  return (
    <div 
      className={`min-h-screen ${settings.theme === 'dark' ? 'bg-gray-900' : settings.theme === 'sepia' ? 'bg-amber-50' : 'bg-white'}`}
      suppressHydrationWarning
    >
      {/* AI Control Panel */}
      <div className={`fixed top-0 left-0 right-0 z-50 ${settings.theme === 'dark' ? 'bg-gray-800' : settings.theme === 'sepia' ? 'bg-amber-100' : 'bg-white'} border-b ${settings.theme === 'dark' ? 'border-gray-700' : 'border-gray-200'} shadow-sm`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Book Info */}
          <div className="flex items-center space-x-3">
            <div className={`text-lg font-semibold ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'} truncate max-w-96`}>
              {currentBook.title || 'Untitled Book'}
            </div>
            <div className={`text-sm ${settings.theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
              {Math.round(progress || 0)}%
            </div>
          </div>
          
          {/* Right: AI Controls */}
          <div className="flex items-center space-x-4">
            {/* AI Logo */}
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className={`text-sm font-medium ${settings.theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                AI Assistant
              </span>
            </div>
            
            {/* Summary Dropdown */}
            <div className="relative">
              <button
                onClick={handleShowSummary}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showSummaryPanel 
                    ? 'bg-blue-500 text-white' 
                    : settings.theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } flex items-center space-x-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Summary</span>
              </button>
            </div>
            
            {/* Q&A Dropdown */}
            <div className="relative">
              <button
                onClick={handleShowQA}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showQAPanel 
                    ? 'bg-green-500 text-white' 
                    : settings.theme === 'dark' 
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } flex items-center space-x-2`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Q&A</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Book Content */}
      <div className="pt-16">
        <BookViewer 
          fileUrl={currentBook.publicUrl} 
          fileType={currentBook.file_type} 
          bookTitle={currentBook.title || 'Untitled Book'} 
          bookId={currentBook.id || resolvedParams.bookId}
        />
      </div>
      
      <ReadingProgress />
      
      {/* AI Panels */}
      <AISummaryPanel
        bookId={currentBook.id || resolvedParams.bookId}
        bookTitle={currentBook.title || 'Untitled Book'}
        currentProgress={progress || 0}
        isVisible={showSummaryPanel}
        onClose={() => setShowSummaryPanel(false)}
      />
      
      <AIQAPanel
        bookId={currentBook.id || resolvedParams.bookId}
        bookTitle={currentBook.title || 'Untitled Book'}
        isVisible={showQAPanel}
        onClose={() => setShowQAPanel(false)}
      />
    </div>
  );
} 