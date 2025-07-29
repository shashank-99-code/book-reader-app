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
    console.log('Toggling summary with progress:', progress, 'for book:', currentBook?.title);
    if (showSummaryPanel) {
      // If summary is already open, close it
      setShowSummaryPanel(false);
    } else {
      // If summary is closed, open it and close QA
      setShowQAPanel(false);
      setShowSummaryPanel(true);
    }
  };

  const handleShowQA = () => {
    console.log('Toggling Q&A with progress:', progress, 'for book:', currentBook?.title);
    if (showQAPanel) {
      // If Q&A is already open, close it
      setShowQAPanel(false);
    } else {
      // If Q&A is closed, open it and close summary
      setShowSummaryPanel(false);
      setShowQAPanel(true);
    }
  };

  return (
    <div 
      className={`h-screen flex ${settings.theme === 'dark' ? 'dark bg-gray-900' : settings.theme === 'sepia' ? 'bg-amber-50' : 'bg-white'}`}
      suppressHydrationWarning
    >
      {/* Main Content Area */}
      <div className="flex-1 h-full overflow-hidden">
      <BookViewer 
        fileUrl={currentBook.publicUrl} 
        fileType={currentBook.file_type} 
        bookTitle={currentBook.title || 'Untitled Book'} 
        bookId={currentBook.id || resolvedParams.bookId}
          onShowSummary={handleShowSummary}
          onShowQA={handleShowQA}
          showSummaryPanel={showSummaryPanel}
          showQAPanel={showQAPanel}
          currentProgress={progress || 0}
      />
        
      <ReadingProgress />
      </div>

      {/* Right Sidebar - Summary or Q&A */}
      <div className={`h-full transition-all duration-300 ease-in-out ${
        showSummaryPanel || showQAPanel ? 'w-96' : 'w-0 overflow-hidden'
      }`}>
        {(showSummaryPanel || showQAPanel) && (
          <div className="w-96 h-full">
            {showSummaryPanel && (
              <AISummaryPanel
                bookId={currentBook.id || resolvedParams.bookId}
                bookTitle={currentBook.title || 'Untitled Book'}
                currentProgress={progress || 0}
                isVisible={showSummaryPanel}
                onClose={() => setShowSummaryPanel(false)}
              />
            )}
            {showQAPanel && (
              <AIQAPanel
                bookId={currentBook.id || resolvedParams.bookId}
                bookTitle={currentBook.title || 'Untitled Book'}
                currentProgress={progress || 0}
                isVisible={showQAPanel}
                onClose={() => setShowQAPanel(false)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
} 