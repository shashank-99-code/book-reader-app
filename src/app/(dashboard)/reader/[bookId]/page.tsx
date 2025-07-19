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
    settings
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
    setShowQAPanel(false); // Close QA panel if open
    setShowSummaryPanel(true);
  };

  const handleShowQA = () => {
    setShowSummaryPanel(false); // Close summary panel if open
    setShowQAPanel(true);
  };

  return (
    <div 
      className={`min-h-screen ${settings.theme === 'dark' ? 'bg-gray-900' : settings.theme === 'sepia' ? 'bg-amber-50' : 'bg-white'}`}
      suppressHydrationWarning
    >
      <BookViewer 
        fileUrl={currentBook.publicUrl} 
        fileType={currentBook.file_type} 
        bookTitle={currentBook.title || 'Untitled Book'} 
        bookId={currentBook.id || resolvedParams.bookId}
      />
      
      {/* AI Control Buttons */}
      <div className="fixed bottom-4 right-4 space-y-3">
        <div className="flex flex-col space-y-2">
          <button
            onClick={handleShowSummary}
            className="p-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-lg transition-colors"
            title="AI Summary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button
            onClick={handleShowQA}
            className="p-3 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-lg transition-colors"
            title="Ask AI"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>
      </div>
      <ReadingProgress />
      
      {/* AI Panels */}
      <AISummaryPanel
        bookId={currentBook.id || resolvedParams.bookId}
        bookTitle={currentBook.title || 'Untitled Book'}
        currentProgress={75} // TODO: Get actual progress from ReaderContext
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