'use client';

import { useEffect, useState } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';
import { UploadModal } from '@/components/book/UploadModal';

export default function DashboardPage() {
  const { books, loading, fetchBooks } = useBookContext();
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Refetch books when page becomes visible (e.g., returning from reader)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchBooks();
      }
    };

    const handleFocus = () => {
      fetchBooks();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchBooks]);

  const handleUpload = () => {
    // Refresh the books list after upload
    fetchBooks();
    setModalOpen(false);
  };

  const bookCount = books.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Library</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span className="font-medium">
                    {bookCount} {bookCount === 1 ? 'book' : 'books'}
                  </span>
                </div>
                {bookCount > 0 && (
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Keep reading to build your library!</span>
                  </div>
                )}
              </div>
            </div>
            
            <button
              className="inline-flex items-center gap-2 bg-gradient-to-r from-pink-500 to-pink-400 hover:from-pink-600 hover:to-pink-500 text-white px-6 py-3 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-105"
              onClick={() => setModalOpen(true)}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Books
            </button>
          </div>
        </div>

        {/* Content Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} onUpload={handleUpload} />
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                <p className="text-gray-500">Loading your books...</p>
              </div>
            </div>
          ) : (
            <BookGrid books={books} onUploadClick={() => setModalOpen(true)} />
          )}
        </div>
      </div>
    </div>
  );
} 