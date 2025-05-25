'use client';

import { useEffect, useState, use } from 'react';
// import { PDFReader } from '@/components/reader/PDFReader'; // No longer directly used here
import BookViewer from '@/components/book/BookViewer'; // Import BookViewer
import { getBookById } from '@/lib/services/bookService';
import { getPublicUrl } from '@/lib/services/fileService';
import { useRouter } from 'next/navigation';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const resolvedParams = use(params); // Unwrap the params Promise
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [bookTitle, setBookTitle] = useState<string>('Book'); // Add bookTitle state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadBook() {
      try {
        const book = await getBookById(resolvedParams.bookId); // Use resolvedParams
        if (!book) {
          setError('Book not found');
          // setLoading(false); // Already handled in finally
          return;
        }
        if (!book.file_path || !book.file_type) { // Check for file_path and file_type
          setError('Book data is incomplete (missing file path or type).');
          // setLoading(false); // Already handled in finally
          return;
        }
        const url = await getPublicUrl(book.file_path);
        // console.log('Book public URL:', url); // Keep for debugging if needed
        // console.log('Book file type:', book.file_type);
        setFileUrl(url);
        setFileType(book.file_type); // Set the fileType
        setBookTitle(book.title || 'Untitled Book'); // Set the book title
      } catch (err) {
        console.error('Failed to load book:', err); // Log the actual error
        setError(err instanceof Error ? err.message : 'Failed to load book');
      } finally {
        setLoading(false);
      }
    }
    loadBook();
  }, [resolvedParams.bookId]); // Use resolvedParams

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner className="w-8 h-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-red-500 mb-4">Error: {error}</p> {/* Better error display */}
        <button
          onClick={() => router.push('/library')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Back to Library
        </button>
      </div>
    );
  }

  if (!fileUrl || !fileType) { // Check both fileUrl and fileType before rendering BookViewer
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

  // return <PDFReader fileUrl={fileUrl} />; // Old rendering
  return <BookViewer fileUrl={fileUrl} fileType={fileType} bookTitle={bookTitle} />; // Render BookViewer
} 