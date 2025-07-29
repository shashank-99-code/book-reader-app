'use client';

import { useEffect, useState } from 'react';
import { useBookContext } from '@/contexts/BookContext';
import { BookGrid } from '@/components/book/BookGrid';
import { UploadModal } from '@/components/book/UploadModal';

export default function LibraryPage() {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <div className="text-gray-600">Loading your library...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Your Library</h1>
          <p className="text-gray-600 mt-1">
            {books.length} {books.length === 1 ? 'book' : 'books'} in your collection
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Books</span>
        </button>
      </div>

      {/* Books Grid */}
      <BookGrid books={books} onUploadClick={() => setModalOpen(true)} />

      <UploadModal open={modalOpen} onClose={() => setModalOpen(false)} onUpload={handleUpload} />
    </div>
  );
} 